import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import CurrentUser
from app.models.follow import UserFollow
from app.models.profile import Profile
from app.models.rabisco import Rabisco, RabiscoView
from app.schemas.rabisco import (
    RabiscoAuthorOut,
    RabiscoCreate,
    RabiscoRead,
    RabiscoUserGroup,
)


class RabiscoService:
    @staticmethod
    def create_rabisco(
        db: Session,
        user: CurrentUser,
        payload: RabiscoCreate,
    ) -> RabiscoRead:
        current_user_id = uuid.UUID(user.id)

        # Garante que o profile existe
        profile = db.execute(
            select(Profile).where(Profile.id == current_user_id)
        ).scalar_one_or_none()

        if not profile:
            raise NotFoundError("Perfil do usuário não encontrado.")

        now = datetime.now(UTC)
        expires_at = now + timedelta(hours=24)

        rabisco = Rabisco(
            user_id=current_user_id,
            content=payload.content.strip(),
            background_style=payload.background_style or "gradient-blue",
            font_style=payload.font_style or "sans",
            created_at=now,
            expires_at=expires_at,
        )

        db.add(rabisco)
        db.commit()
        db.refresh(rabisco)

        author_out = RabiscoAuthorOut(
            id=profile.id,
            username=profile.username,
            full_name=profile.full_name,
            avatar_url=profile.avatar_url,
        )

        return RabiscoRead(
            id=rabisco.id,
            user_id=rabisco.user_id,
            content=rabisco.content,
            background_style=rabisco.background_style,
            font_style=rabisco.font_style,
            created_at=rabisco.created_at,
            expires_at=rabisco.expires_at,
            author=author_out,
            views_count=0,
            has_viewed=True,
        )

    @staticmethod
    def list_feed(
        db: Session,
        current_user: CurrentUser,
    ) -> list[RabiscoUserGroup]:
        current_user_id = uuid.UUID(current_user.id)
        now = datetime.now(UTC)

        # 1. Usuários que o leitor segue
        following_subquery = select(UserFollow.following_id).where(
            UserFollow.follower_id == current_user_id,
            UserFollow.status == "accepted",
        )

        # 2. Rabiscos ativos: do próprio usuário OU de quem ele segue OU de perfis públicos
        query = (
            select(Rabisco)
            .join(Profile, Profile.id == Rabisco.user_id)
            .where(
                Rabisco.expires_at > now,
                (
                    (Rabisco.user_id == current_user_id)
                    | (Rabisco.user_id.in_(following_subquery))
                    | (Profile.is_public.is_(True))
                ),
            )
            .order_by(Rabisco.created_at.asc())
        )

        active_rabiscos = db.execute(query).scalars().all()
        if not active_rabiscos:
            return []

        rabisco_ids = [r.id for r in active_rabiscos]

        # 3. Contagem de views de cada rabisco
        views_counts_rows = db.execute(
            select(RabiscoView.rabisco_id, func.count(RabiscoView.id))
            .where(RabiscoView.rabisco_id.in_(rabisco_ids))
            .group_by(RabiscoView.rabisco_id)
        ).all()
        views_counts: dict[uuid.UUID, int] = {row[0]: row[1] for row in views_counts_rows}

        # 4. Rabiscos que o usuário atual já visualizou
        user_views_rows = db.execute(
            select(RabiscoView.rabisco_id).where(
                RabiscoView.rabisco_id.in_(rabisco_ids),
                RabiscoView.viewer_id == current_user_id,
            )
        ).scalars().all()
        viewed_by_me = set(user_views_rows)

        # 5. Agrupar rabiscos por autor (user_id)
        groups_dict: dict[uuid.UUID, dict] = {}

        for r in active_rabiscos:
            author = r.author
            if not author:
                continue

            has_viewed = (r.id in viewed_by_me) or (r.user_id == current_user_id)

            rabisco_read = RabiscoRead(
                id=r.id,
                user_id=r.user_id,
                content=r.content,
                background_style=r.background_style,
                font_style=r.font_style,
                created_at=r.created_at,
                expires_at=r.expires_at,
                author=RabiscoAuthorOut(
                    id=author.id,
                    username=author.username,
                    full_name=author.full_name,
                    avatar_url=author.avatar_url,
                ),
                views_count=views_counts.get(r.id, 0),
                has_viewed=has_viewed,
            )

            if r.user_id not in groups_dict:
                groups_dict[r.user_id] = {
                    "user_id": author.id,
                    "username": author.username,
                    "full_name": author.full_name,
                    "avatar_url": author.avatar_url,
                    "latest_created_at": r.created_at,
                    "rabiscos": [],
                }

            groups_dict[r.user_id]["rabiscos"].append(rabisco_read)
            if r.created_at > groups_dict[r.user_id]["latest_created_at"]:
                groups_dict[r.user_id]["latest_created_at"] = r.created_at

        # 6. Transformar em objetos de grupo e determinar has_unseen
        groups: list[RabiscoUserGroup] = []
        for u_id, data in groups_dict.items():
            # Tem rabiscos não vistos se houver pelo menos um que has_viewed == False
            # (para o próprio autor, consideramos sempre has_unseen = False para o anel de story)
            if u_id == current_user_id:
                has_unseen = False
            else:
                has_unseen = any(not item.has_viewed for item in data["rabiscos"])

            groups.append(
                RabiscoUserGroup(
                    user_id=data["user_id"],
                    username=data["username"],
                    full_name=data["full_name"],
                    avatar_url=data["avatar_url"],
                    has_unseen=has_unseen,
                    latest_created_at=data["latest_created_at"],
                    rabiscos=data["rabiscos"],
                )
            )

        # 7. Ordenação dos grupos:
        # - Próprio usuário primeiro (se existir)
        # - Grupos com histórias não lidas (has_unseen == True) por latest_created_at DESC
        # - Grupos já visualizados por latest_created_at DESC
        def sort_key(group: RabiscoUserGroup):
            is_self = group.user_id == current_user_id
            return (
                1 if is_self else 0,
                1 if group.has_unseen else 0,
                group.latest_created_at,
            )

        groups.sort(key=sort_key, reverse=True)
        return groups

    @staticmethod
    def record_view(
        db: Session,
        current_user: CurrentUser,
        rabisco_id: uuid.UUID,
    ) -> None:
        current_user_id = uuid.UUID(current_user.id)

        rabisco = db.execute(
            select(Rabisco).where(Rabisco.id == rabisco_id)
        ).scalar_one_or_none()

        if not rabisco:
            raise NotFoundError("Rabisco não encontrado.")

        # Se o usuário for o próprio autor, não precisa registrar view
        if rabisco.user_id == current_user_id:
            return

        # Verifica se já registrou visualização
        existing = db.execute(
            select(RabiscoView).where(
                RabiscoView.rabisco_id == rabisco_id,
                RabiscoView.viewer_id == current_user_id,
            )
        ).scalar_one_or_none()

        if not existing:
            view = RabiscoView(
                rabisco_id=rabisco_id,
                viewer_id=current_user_id,
            )
            db.add(view)
            db.commit()

    @staticmethod
    def delete_rabisco(
        db: Session,
        current_user: CurrentUser,
        rabisco_id: uuid.UUID,
    ) -> None:
        current_user_id = uuid.UUID(current_user.id)

        rabisco = db.execute(
            select(Rabisco).where(Rabisco.id == rabisco_id)
        ).scalar_one_or_none()

        if not rabisco:
            raise NotFoundError("Rabisco não encontrado.")

        is_owner = rabisco.user_id == current_user_id
        is_admin = getattr(current_user, "role", "user") == "admin"

        if not is_owner and not is_admin:
            raise ForbiddenError("Você não tem permissão para excluir este rabisco.")

        db.delete(rabisco)
        db.commit()
