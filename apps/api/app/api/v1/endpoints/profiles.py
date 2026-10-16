import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_db
from app.core.errors import BadRequestError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser
from app.models.feed import FeedPost
from app.models.follow import UserFollow
from app.models.profile import Profile
from app.schemas.profile import (
    FollowActionResponse,
    FollowRequestItem,
    FollowUserItem,
    ProfileRead,
    ProfileUpdate,
    UserSearchItem,
)
from app.services.feed_service import FeedService

router = APIRouter()

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_.-]+$")


def _get_follow_status(
    db: Session,
    current_user_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> str:
    """Retorna o status de relacionamento do usuário atual com o usuário alvo."""
    if current_user_id == target_user_id:
        return "self"

    follow_record = db.execute(
        select(UserFollow.status).where(
            UserFollow.follower_id == current_user_id,
            UserFollow.following_id == target_user_id,
        )
    ).scalar_one_or_none()

    if follow_record == "accepted":
        return "following"
    if follow_record == "pending":
        return "requested"
    return "none"


def _build_profile_read(
    db: Session,
    profile: Profile,
    current_user_id: uuid.UUID,
) -> ProfileRead:
    follow_status = _get_follow_status(db, current_user_id, profile.id)
    can_view = (
        profile.id == current_user_id
        or profile.is_public is True
        or follow_status == "following"
    )

    posts_count = db.execute(
        select(func.count(FeedPost.id)).where(FeedPost.user_id == profile.id)
    ).scalar_one()

    return ProfileRead(
        id=profile.id,
        username=profile.username,
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
        bio=profile.bio,
        is_public=profile.is_public,
        role=profile.role,
        followers_count=profile.followers_count,
        following_count=profile.following_count,
        posts_count=posts_count,
        follow_status=follow_status,
        can_view_content=can_view,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get(
    "/me",
    response_model=ProfileRead,
    summary="Obter perfil completo do usuário autenticado",
)
def get_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    profile = db.execute(
        select(Profile).where(Profile.id == current_user_id)
    ).scalar_one_or_none()

    if not profile:
        raise NotFoundError("Perfil do usuário não encontrado.")

    return _build_profile_read(db, profile, current_user_id)


@router.patch(
    "/me",
    response_model=ProfileRead,
    summary="Atualizar informações do perfil do usuário autenticado",
)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    profile = db.execute(
        select(Profile).where(Profile.id == current_user_id)
    ).scalar_one_or_none()

    if not profile:
        raise NotFoundError("Perfil do usuário não encontrado.")

    # 1. Validação e atualização de nome de usuário (username)
    if payload.username is not None:
        clean_username = payload.username.strip().lower()
        if len(clean_username) < 3 or len(clean_username) > 30:
            raise BadRequestError("O nome de usuário deve conter entre 3 e 30 caracteres.")

        if not USERNAME_REGEX.match(clean_username):
            raise BadRequestError(
                "O nome de usuário pode conter apenas letras, números, '.', '_' e '-'."
            )

        if clean_username != profile.username:
            # Verifica se já existe outro usuário com o mesmo username
            exists = db.execute(
                select(Profile.id).where(
                    Profile.username == clean_username,
                    Profile.id != current_user_id,
                )
            ).scalar_one_or_none()
            if exists:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Este nome de usuário já está em uso por outro leitor.",
                )
            profile.username = clean_username

    if payload.full_name is not None:
        profile.full_name = payload.full_name.strip() or None

    if payload.bio is not None:
        profile.bio = payload.bio.strip() or None

    if payload.avatar_url is not None:
        profile.avatar_url = payload.avatar_url.strip() or None

    if payload.is_public is not None:
        profile.is_public = payload.is_public

    db.commit()
    db.refresh(profile)

    return _build_profile_read(db, profile, current_user_id)


@router.get(
    "/search",
    response_model=list[UserSearchItem],
    summary="Pesquisar usuários por nome de usuário ou nome completo",
)
def search_users(
    q: Annotated[str, Query(min_length=1, description="Termo de pesquisa")],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    term = f"%{q.strip().lower()}%"

    profiles = db.execute(
        select(Profile)
        .where(
            or_(
                func.lower(Profile.username).like(term),
                func.lower(Profile.full_name).like(term),
            )
        )
        .order_by(
            # Dá prioridade a matches exatos ou que começam com o termo
            func.lower(Profile.username).startswith(q.strip().lower()).desc(),
            Profile.followers_count.desc(),
        )
        .limit(limit)
    ).scalars().all()

    # Preenche status de seguidor em lote para performance
    user_ids = [p.id for p in profiles if p.id != current_user_id]
    follow_map: dict[uuid.UUID, str] = {}
    if user_ids:
        records = db.execute(
            select(UserFollow.following_id, UserFollow.status).where(
                UserFollow.follower_id == current_user_id,
                UserFollow.following_id.in_(user_ids),
            )
        ).all()
        for f_id, f_status in records:
            follow_map[f_id] = "following" if f_status == "accepted" else "requested"

    items: list[UserSearchItem] = []
    for p in profiles:
        if p.id == current_user_id:
            st = "self"
        else:
            st = follow_map.get(p.id, "none")

        items.append(
            UserSearchItem(
                id=p.id,
                username=p.username,
                full_name=p.full_name,
                avatar_url=p.avatar_url,
                bio=p.bio,
                is_public=p.is_public,
                followers_count=p.followers_count,
                follow_status=st,
            )
        )

    return items


@router.get(
    "/me/follow-requests",
    response_model=list[FollowRequestItem],
    summary="Listar solicitações pendentes de seguidores (para perfis privados)",
)
def list_follow_requests(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)

    requests = db.execute(
        select(UserFollow)
        .where(
            UserFollow.following_id == current_user_id,
            UserFollow.status == "pending",
        )
        .options(selectinload(UserFollow.follower))
        .order_by(UserFollow.created_at.desc())
    ).scalars().all()

    items: list[FollowRequestItem] = []
    for r in requests:
        f = r.follower
        items.append(
            FollowRequestItem(
                id=r.id,
                created_at=r.created_at,
                user=UserSearchItem(
                    id=f.id,
                    username=f.username,
                    full_name=f.full_name,
                    avatar_url=f.avatar_url,
                    bio=f.bio,
                    is_public=f.is_public,
                    followers_count=f.followers_count,
                    follow_status=_get_follow_status(db, current_user_id, f.id),
                ),
            )
        )

    return items


@router.post(
    "/follow-requests/{request_id}/accept",
    response_model=FollowActionResponse,
    summary="Aceitar solicitação de seguidor",
)
def accept_follow_request(
    request_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)

    follow_req = db.execute(
        select(UserFollow).where(
            UserFollow.id == request_id,
            UserFollow.following_id == current_user_id,
            UserFollow.status == "pending",
        )
    ).scalar_one_or_none()

    if not follow_req:
        raise NotFoundError("Solicitação de seguidor não encontrada.")

    follow_req.status = "accepted"
    db.commit()

    return FollowActionResponse(
        success=True,
        follow_status="following",
        message="Solicitação de seguidor aceita com sucesso.",
    )


@router.post(
    "/follow-requests/{request_id}/reject",
    response_model=FollowActionResponse,
    summary="Recusar solicitação de seguidor",
)
def reject_follow_request(
    request_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)

    follow_req = db.execute(
        select(UserFollow).where(
            UserFollow.id == request_id,
            UserFollow.following_id == current_user_id,
            UserFollow.status == "pending",
        )
    ).scalar_one_or_none()

    if not follow_req:
        raise NotFoundError("Solicitação de seguidor não encontrada.")

    db.delete(follow_req)
    db.commit()

    return FollowActionResponse(
        success=True,
        follow_status="none",
        message="Solicitação de seguidor recusada.",
    )


@router.get(
    "/{username}",
    response_model=ProfileRead,
    summary="Obter perfil público ou acessível de um usuário pelo @username",
)
def get_user_profile(
    username: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    clean_username = username.strip().lower()

    profile = db.execute(
        select(Profile).where(Profile.username == clean_username)
    ).scalar_one_or_none()

    if not profile:
        raise NotFoundError(f"Usuário '@{clean_username}' não encontrado.")

    return _build_profile_read(db, profile, current_user_id)


@router.post(
    "/{username}/follow",
    response_model=FollowActionResponse,
    summary="Seguir um usuário ou enviar solicitação caso o perfil seja privado",
)
def follow_user(
    username: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    clean_username = username.strip().lower()

    target_profile = db.execute(
        select(Profile).where(Profile.username == clean_username)
    ).scalar_one_or_none()

    if not target_profile:
        raise NotFoundError(f"Usuário '@{clean_username}' não encontrado.")

    if target_profile.id == current_user_id:
        raise BadRequestError("Você não pode seguir a si mesmo.")

    # Verifica se já existe relação
    existing_follow = db.execute(
        select(UserFollow).where(
            UserFollow.follower_id == current_user_id,
            UserFollow.following_id == target_profile.id,
        )
    ).scalar_one_or_none()

    if existing_follow:
        if existing_follow.status == "accepted":
            return FollowActionResponse(
                success=True,
                follow_status="following",
                message=f"Você já está seguindo @{target_profile.username}.",
            )
        return FollowActionResponse(
            success=True,
            follow_status="requested",
            message=f"Solicitação já enviada para @{target_profile.username}.",
        )

    # Determina o status: se for público aceita imediatamente, se for privado fica pendente
    new_status = "accepted" if target_profile.is_public else "pending"

    new_follow = UserFollow(
        follower_id=current_user_id,
        following_id=target_profile.id,
        status=new_status,
    )
    db.add(new_follow)
    db.commit()

    if new_status == "accepted":
        return FollowActionResponse(
            success=True,
            follow_status="following",
            message=f"Você agora está seguindo @{target_profile.username}!",
        )
    return FollowActionResponse(
        success=True,
        follow_status="requested",
        message=f"Solicitação enviada! Como o perfil de @{target_profile.username} é privado, aguarde a aprovação.",
    )


@router.post(
    "/{username}/unfollow",
    response_model=FollowActionResponse,
    summary="Deixar de seguir um usuário ou cancelar solicitação pendente",
)
def unfollow_user(
    username: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    clean_username = username.strip().lower()

    target_profile = db.execute(
        select(Profile).where(Profile.username == clean_username)
    ).scalar_one_or_none()

    if not target_profile:
        raise NotFoundError(f"Usuário '@{clean_username}' não encontrado.")

    existing_follow = db.execute(
        select(UserFollow).where(
            UserFollow.follower_id == current_user_id,
            UserFollow.following_id == target_profile.id,
        )
    ).scalar_one_or_none()

    if not existing_follow:
        return FollowActionResponse(
            success=True,
            follow_status="none",
            message=f"Você não está seguindo @{target_profile.username}.",
        )

    db.delete(existing_follow)
    db.commit()

    return FollowActionResponse(
        success=True,
        follow_status="none",
        message=f"Você deixou de seguir @{target_profile.username}.",
    )


@router.get(
    "/{username}/followers",
    response_model=list[FollowUserItem],
    summary="Listar seguidores de um usuário",
)
def list_user_followers(
    username: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    clean_username = username.strip().lower()

    target_profile = db.execute(
        select(Profile).where(Profile.username == clean_username)
    ).scalar_one_or_none()

    if not target_profile:
        raise NotFoundError(f"Usuário '@{clean_username}' não encontrado.")

    # Checa privacidade
    follow_status = _get_follow_status(db, current_user_id, target_profile.id)
    if not target_profile.is_public and target_profile.id != current_user_id and follow_status != "following":
        raise ForbiddenError("Este perfil é privado. Siga para ver as conexões.")

    records = db.execute(
        select(UserFollow)
        .where(
            UserFollow.following_id == target_profile.id,
            UserFollow.status == "accepted",
        )
        .options(selectinload(UserFollow.follower))
        .order_by(UserFollow.created_at.desc())
    ).scalars().all()

    items: list[FollowUserItem] = []
    for r in records:
        u = r.follower
        items.append(
            FollowUserItem(
                id=u.id,
                username=u.username,
                full_name=u.full_name,
                avatar_url=u.avatar_url,
                bio=u.bio,
                is_public=u.is_public,
                follow_status=_get_follow_status(db, current_user_id, u.id),
                followed_at=r.created_at,
            )
        )

    return items


@router.get(
    "/{username}/following",
    response_model=list[FollowUserItem],
    summary="Listar usuários que este perfil segue",
)
def list_user_following(
    username: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    clean_username = username.strip().lower()

    target_profile = db.execute(
        select(Profile).where(Profile.username == clean_username)
    ).scalar_one_or_none()

    if not target_profile:
        raise NotFoundError(f"Usuário '@{clean_username}' não encontrado.")

    follow_status = _get_follow_status(db, current_user_id, target_profile.id)
    if not target_profile.is_public and target_profile.id != current_user_id and follow_status != "following":
        raise ForbiddenError("Este perfil é privado. Siga para ver as conexões.")

    records = db.execute(
        select(UserFollow)
        .where(
            UserFollow.follower_id == target_profile.id,
            UserFollow.status == "accepted",
        )
        .options(selectinload(UserFollow.following))
        .order_by(UserFollow.created_at.desc())
    ).scalars().all()

    items: list[FollowUserItem] = []
    for r in records:
        u = r.following
        items.append(
            FollowUserItem(
                id=u.id,
                username=u.username,
                full_name=u.full_name,
                avatar_url=u.avatar_url,
                bio=u.bio,
                is_public=u.is_public,
                follow_status=_get_follow_status(db, current_user_id, u.id),
                followed_at=r.created_at,
            )
        )

    return items


@router.get(
    "/{username}/posts",
    response_model=dict,
    summary="Listar publicações do feed criadas por este usuário",
)
def list_user_publications(
    username: str,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_id = uuid.UUID(current_user.id)
    clean_username = username.strip().lower()

    target_profile = db.execute(
        select(Profile).where(Profile.username == clean_username)
    ).scalar_one_or_none()

    if not target_profile:
        raise NotFoundError(f"Usuário '@{clean_username}' não encontrado.")

    follow_status = _get_follow_status(db, current_user_id, target_profile.id)
    can_view = (
        target_profile.id == current_user_id
        or target_profile.is_public is True
        or follow_status == "following"
    )

    if not can_view:
        raise ForbiddenError("Este perfil é privado. Siga para ver as publicações.")

    items, total = FeedService.list_user_posts(
        db=db,
        target_user_id=target_profile.id,
        current_user_id=current_user_id,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
