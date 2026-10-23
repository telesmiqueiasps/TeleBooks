import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.models.catalog import Book
from app.models.community import (
    Community,
    CommunityMember,
    CommunityMessage,
    CommunityMessageLike,
    CommunityPoll,
    CommunityPollOption,
    CommunityPollVote,
)
from app.schemas.community import (
    CommunityBookPreview,
    CommunityCreate,
    CommunityJoinResponse,
    CommunityMemberRead,
    CommunityMessageCreate,
    CommunityMessageLikeResponse,
    CommunityMessageRead,
    CommunityPollOptionRead,
    CommunityPollRead,
    CommunityRead,
    CommunityUpdate,
    slugify,
)


class CommunityService:
    @staticmethod
    def _generate_unique_slug(db: Session, base_name: str) -> str:
        base_slug = slugify(base_name)
        if not base_slug:
            base_slug = "comunidade"

        slug = base_slug
        existing = db.execute(select(Community).where(Community.slug == slug)).scalar_one_or_none()
        if existing:
            slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
        return slug

    @staticmethod
    def create_community(db: Session, user_id: uuid.UUID, payload: CommunityCreate) -> CommunityRead:
        slug = CommunityService._generate_unique_slug(db, payload.name)

        community = Community(
            name=payload.name.strip(),
            slug=slug,
            description=payload.description.strip() if payload.description else None,
            is_private=payload.is_private,
            only_admins_can_post=payload.only_admins_can_post,
            avatar_url=payload.avatar_url,
            cover_url=payload.cover_url,
            created_by=user_id,
        )
        db.add(community)
        db.flush()

        # O criador é automaticamente membro 'owner' e 'active'
        owner_member = CommunityMember(
            community_id=community.id,
            user_id=user_id,
            role="owner",
            status="active",
        )
        db.add(owner_member)
        db.commit()

        return CommunityService.get_community(db, community.id, user_id)

    @staticmethod
    def list_communities(
        db: Session,
        user_id: uuid.UUID | None,
        tab: str = "all",
        query: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CommunityRead], int]:
        stmt = (
            select(Community)
            .options(
                joinedload(Community.creator),
            )
            .order_by(Community.created_at.desc())
        )

        if tab == "my" and user_id:
            stmt = stmt.join(CommunityMember).where(
                CommunityMember.user_id == user_id,
                CommunityMember.status == "active",
            )
        elif tab == "managed" and user_id:
            stmt = stmt.join(CommunityMember).where(
                CommunityMember.user_id == user_id,
                CommunityMember.status == "active",
                CommunityMember.role.in_(["owner", "admin"]),
            )
        else:
            # "all" / "explore": Públicas OU privadas onde o usuário já é membro ativo
            if user_id:
                stmt = stmt.where(
                    or_(
                        Community.is_private.is_(False),
                        Community.created_by == user_id,
                        Community.members.any(
                            (CommunityMember.user_id == user_id) & (CommunityMember.status == "active")
                        ),
                    )
                )
            else:
                stmt = stmt.where(Community.is_private.is_(False))

        if query:
            search = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Community.name.ilike(search),
                    Community.description.ilike(search),
                )
            )

        # Contagem
        subq = stmt.subquery()
        count_stmt = select(func.count()).select_from(subq)
        total = db.execute(count_stmt).scalar_one()

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)
        communities = db.execute(stmt).scalars().all()

        results: list[CommunityRead] = []
        for comm in communities:
            comm_read = CommunityService._build_community_read(db, comm, user_id)
            results.append(comm_read)

        return results, total

    @staticmethod
    def _build_community_read(db: Session, comm: Community, user_id: uuid.UUID | None) -> CommunityRead:
        members_count = db.execute(
            select(func.count(CommunityMember.id)).where(
                CommunityMember.community_id == comm.id,
                CommunityMember.status == "active",
            )
        ).scalar_one()

        my_role = None
        my_status = None
        pending_requests_count = 0

        if user_id:
            my_membership = db.execute(
                select(CommunityMember).where(
                    CommunityMember.community_id == comm.id,
                    CommunityMember.user_id == user_id,
                )
            ).scalar_one_or_none()

            if my_membership:
                my_role = my_membership.role
                my_status = my_membership.status

            if my_role in ("owner", "admin"):
                pending_requests_count = db.execute(
                    select(func.count(CommunityMember.id)).where(
                        CommunityMember.community_id == comm.id,
                        CommunityMember.status == "pending",
                    )
                ).scalar_one()

        can_post = True
        if comm.only_admins_can_post:
            can_post = my_role in ("owner", "admin")
        if my_status != "active":
            can_post = False

        return CommunityRead(
            id=comm.id,
            name=comm.name,
            slug=comm.slug,
            description=comm.description,
            is_private=comm.is_private,
            only_admins_can_post=comm.only_admins_can_post,
            avatar_url=comm.avatar_url,
            cover_url=comm.cover_url,
            created_by=comm.created_by,
            creator=comm.creator,
            members_count=members_count,
            pending_requests_count=pending_requests_count,
            my_role=my_role,
            my_status=my_status,
            can_post=can_post,
            created_at=comm.created_at,
            updated_at=comm.updated_at,
        )

    @staticmethod
    def get_community(db: Session, id_or_slug: str | uuid.UUID, user_id: uuid.UUID | None) -> CommunityRead:
        stmt = select(Community).options(joinedload(Community.creator))
        if isinstance(id_or_slug, uuid.UUID):
            stmt = stmt.where(Community.id == id_or_slug)
        else:
            try:
                parsed_uuid = uuid.UUID(str(id_or_slug))
                stmt = stmt.where(or_(Community.id == parsed_uuid, Community.slug == str(id_or_slug)))
            except ValueError:
                stmt = stmt.where(Community.slug == str(id_or_slug))

        comm = db.execute(stmt).scalar_one_or_none()
        if not comm:
            raise NotFoundError("Comunidade não encontrada.")

        return CommunityService._build_community_read(db, comm, user_id)

    @staticmethod
    def update_community(
        db: Session,
        community_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: CommunityUpdate,
    ) -> CommunityRead:
        comm = db.execute(select(Community).where(Community.id == community_id)).scalar_one_or_none()
        if not comm:
            raise NotFoundError("Comunidade não encontrada.")

        # Verifica se o usuário é admin ou owner
        member = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
                CommunityMember.status == "active",
                CommunityMember.role.in_(["owner", "admin"]),
            )
        ).scalar_one_or_none()

        if not member and comm.created_by != user_id:
            raise ForbiddenError("Você não tem permissão de administrador nesta comunidade.")

        update_data = payload.model_dump(exclude_unset=True)
        if "name" in update_data and update_data["name"]:
            comm.name = update_data["name"].strip()
        if "description" in update_data:
            comm.description = update_data["description"].strip() if update_data["description"] else None
        if "is_private" in update_data:
            comm.is_private = update_data["is_private"]
        if "only_admins_can_post" in update_data:
            comm.only_admins_can_post = update_data["only_admins_can_post"]
        if "avatar_url" in update_data:
            comm.avatar_url = update_data["avatar_url"]
        if "cover_url" in update_data:
            comm.cover_url = update_data["cover_url"]

        comm.updated_at = datetime.now(UTC)
        db.commit()

        return CommunityService.get_community(db, comm.id, user_id)

    @staticmethod
    def join_community(db: Session, community_id: uuid.UUID, user_id: uuid.UUID) -> CommunityJoinResponse:
        comm = db.execute(select(Community).where(Community.id == community_id)).scalar_one_or_none()
        if not comm:
            raise NotFoundError("Comunidade não encontrada.")

        existing = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
            )
        ).scalar_one_or_none()

        if existing:
            if existing.status == "active":
                return CommunityJoinResponse(
                    success=True,
                    status="active",
                    message="Você já é membro desta comunidade.",
                )
            return CommunityJoinResponse(
                success=True,
                status="pending",
                message="Sua solicitação de entrada já está pendente de aprovação.",
            )

        # Se for privada, entra como pending. Se for pública, entra como active.
        target_status = "pending" if comm.is_private else "active"
        member = CommunityMember(
            community_id=community_id,
            user_id=user_id,
            role="member",
            status=target_status,
        )
        db.add(member)
        db.commit()

        msg = (
            "Solicitação de entrada enviada com sucesso aos moderadores."
            if target_status == "pending"
            else "Você ingressou na comunidade com sucesso!"
        )
        return CommunityJoinResponse(success=True, status=target_status, message=msg)

    @staticmethod
    def leave_community(db: Session, community_id: uuid.UUID, user_id: uuid.UUID) -> dict[str, str]:
        member = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
            )
        ).scalar_one_or_none()

        if not member:
            raise NotFoundError("Você não faz parte desta comunidade.")

        if member.role == "owner":
            # Se for o único membro, pode deletar a comunidade
            other_members_count = db.execute(
                select(func.count(CommunityMember.id)).where(
                    CommunityMember.community_id == community_id,
                    CommunityMember.user_id != user_id,
                )
            ).scalar_one()

            if other_members_count > 0:
                raise ConflictError("O criador da comunidade deve transferir o cargo de proprietário antes de sair.")
            else:
                comm = db.execute(select(Community).where(Community.id == community_id)).scalar_one_or_none()
                if comm:
                    db.delete(comm)
                    db.commit()
                    return {"message": "Comunidade excluída com sucesso."}

        db.delete(member)
        db.commit()
        return {"message": "Você saiu da comunidade com sucesso."}

    # ==========================================================================
    # Membros & Moderação
    # ==========================================================================
    @staticmethod
    def list_members(
        db: Session,
        community_id: uuid.UUID,
        user_id: uuid.UUID | None,
        status_filter: str = "active",
    ) -> list[CommunityMemberRead]:
        stmt = (
            select(CommunityMember)
            .options(joinedload(CommunityMember.user))
            .where(
                CommunityMember.community_id == community_id,
                CommunityMember.status == status_filter,
            )
            .order_by(
                CommunityMember.role.desc(),
                CommunityMember.joined_at.asc(),
            )
        )
        members = db.execute(stmt).scalars().all()
        return [CommunityMemberRead.model_validate(m) for m in members]

    @staticmethod
    def approve_member(
        db: Session,
        community_id: uuid.UUID,
        target_user_id: uuid.UUID,
        admin_id: uuid.UUID,
    ) -> CommunityMemberRead:
        # Verifica se admin_id é admin/owner
        admin = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == admin_id,
                CommunityMember.status == "active",
                CommunityMember.role.in_(["owner", "admin"]),
            )
        ).scalar_one_or_none()
        if not admin:
            raise ForbiddenError("Apenas administradores podem aprovar solicitações de entrada.")

        member = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == target_user_id,
            )
        ).scalar_one_or_none()

        if not member:
            raise NotFoundError("Solicitação de membro não encontrada.")

        member.status = "active"
        db.commit()
        db.refresh(member)
        return CommunityMemberRead.model_validate(member)

    @staticmethod
    def reject_member(
        db: Session,
        community_id: uuid.UUID,
        target_user_id: uuid.UUID,
        admin_id: uuid.UUID,
    ) -> dict[str, str]:
        admin = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == admin_id,
                CommunityMember.status == "active",
                CommunityMember.role.in_(["owner", "admin"]),
            )
        ).scalar_one_or_none()
        if not admin:
            raise ForbiddenError("Apenas administradores podem rejeitar solicitações.")

        member = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == target_user_id,
            )
        ).scalar_one_or_none()

        if not member:
            raise NotFoundError("Solicitação de membro não encontrada.")

        db.delete(member)
        db.commit()
        return {"message": "Solicitação recusada com sucesso."}

    @staticmethod
    def remove_member(
        db: Session,
        community_id: uuid.UUID,
        target_user_id: uuid.UUID,
        admin_id: uuid.UUID,
    ) -> dict[str, str]:
        admin = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == admin_id,
                CommunityMember.status == "active",
                CommunityMember.role.in_(["owner", "admin"]),
            )
        ).scalar_one_or_none()
        if not admin:
            raise ForbiddenError("Apenas administradores podem remover membros da comunidade.")

        target = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == target_user_id,
            )
        ).scalar_one_or_none()

        if not target:
            raise NotFoundError("Membro não encontrado.")

        if target.role == "owner":
            raise ForbiddenError("Não é permitido remover o criador/proprietário da comunidade.")

        if target.role == "admin" and admin.role != "owner":
            raise ForbiddenError("Apenas o proprietário pode remover outros administradores.")

        db.delete(target)
        db.commit()
        return {"message": "Membro removido da comunidade com sucesso."}

    @staticmethod
    def update_member_role(
        db: Session,
        community_id: uuid.UUID,
        target_user_id: uuid.UUID,
        new_role: str,
        admin_id: uuid.UUID,
    ) -> CommunityMemberRead:
        if new_role not in ("admin", "member"):
            raise ConflictError("Papel inválido. Escolha 'admin' ou 'member'.")

        admin = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == admin_id,
                CommunityMember.status == "active",
                CommunityMember.role.in_(["owner", "admin"]),
            )
        ).scalar_one_or_none()
        if not admin:
            raise ForbiddenError("Apenas administradores podem alterar permissões de membros.")

        target = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == target_user_id,
                CommunityMember.status == "active",
            )
        ).scalar_one_or_none()

        if not target:
            raise NotFoundError("Membro não encontrado ou inativo.")

        if target.role == "owner":
            raise ForbiddenError("Não é permitido alterar o papel do proprietário.")

        target.role = new_role
        db.commit()
        db.refresh(target)
        return CommunityMemberRead.model_validate(target)

    @staticmethod
    def invite_or_add_member(
        db: Session,
        community_id: uuid.UUID,
        target_user_id: uuid.UUID,
        admin_id: uuid.UUID,
    ) -> CommunityMemberRead:
        admin = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == admin_id,
                CommunityMember.status == "active",
                CommunityMember.role.in_(["owner", "admin"]),
            )
        ).scalar_one_or_none()
        if not admin:
            raise ForbiddenError("Apenas administradores podem adicionar membros diretamente.")

        existing = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == target_user_id,
            )
        ).scalar_one_or_none()

        if existing:
            if existing.status == "active":
                return CommunityMemberRead.model_validate(existing)
            existing.status = "active"
            db.commit()
            db.refresh(existing)
            return CommunityMemberRead.model_validate(existing)

        new_member = CommunityMember(
            community_id=community_id,
            user_id=target_user_id,
            role="member",
            status="active",
        )
        db.add(new_member)
        db.commit()
        db.refresh(new_member)
        return CommunityMemberRead.model_validate(new_member)

    # ==========================================================================
    # Mensagens & Enquetes
    # ==========================================================================
    @staticmethod
    def list_messages(
        db: Session,
        community_id: uuid.UUID,
        user_id: uuid.UUID | None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[CommunityMessageRead], int]:
        comm = db.execute(select(Community).where(Community.id == community_id)).scalar_one_or_none()
        if not comm:
            raise NotFoundError("Comunidade não encontrada.")

        # Se for privada, exige ser membro ativo
        if comm.is_private:
            if not user_id:
                raise ForbiddenError("Acesso restrito aos membros desta comunidade.")
            is_active_member = db.execute(
                select(CommunityMember).where(
                    CommunityMember.community_id == community_id,
                    CommunityMember.user_id == user_id,
                    CommunityMember.status == "active",
                )
            ).scalar_one_or_none()
            if not is_active_member:
                raise ForbiddenError("Você precisa ser membro aprovado para visualizar o conteúdo desta comunidade.")

        stmt = (
            select(CommunityMessage)
            .options(
                joinedload(CommunityMessage.author),
                joinedload(CommunityMessage.book),
                joinedload(CommunityMessage.poll).selectinload(CommunityPoll.options),
                selectinload(CommunityMessage.likes),
            )
            .where(CommunityMessage.community_id == community_id)
            .order_by(CommunityMessage.created_at.desc())
        )

        count_stmt = select(func.count(CommunityMessage.id)).where(CommunityMessage.community_id == community_id)
        total = db.execute(count_stmt).scalar_one()

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)
        messages = db.execute(stmt).scalars().all()

        results: list[CommunityMessageRead] = []
        for msg in messages:
            read_item = CommunityService._build_message_read(db, msg, user_id)
            results.append(read_item)

        # Retorna na ordem cronológica de leitura
        results.reverse()
        return results, total

    @staticmethod
    def _build_message_read(db: Session, msg: CommunityMessage, user_id: uuid.UUID | None) -> CommunityMessageRead:
        likes_count = len(msg.likes)
        has_liked = any(like.user_id == user_id for like in msg.likes) if user_id else False

        poll_read = None
        if msg.is_poll and msg.poll:
            poll = msg.poll
            # Votos
            votes = db.execute(
                select(CommunityPollVote).where(CommunityPollVote.poll_id == poll.id)
            ).scalars().all()
            total_votes = len(votes)

            user_voted_option_id = None
            if user_id:
                for v in votes:
                    if v.user_id == user_id:
                        user_voted_option_id = v.option_id
                        break

            options_read: list[CommunityPollOptionRead] = []
            for opt in poll.options:
                opt_votes = sum(1 for v in votes if v.option_id == opt.id)
                pct = round((opt_votes / total_votes * 100), 1) if total_votes > 0 else 0.0
                options_read.append(
                    CommunityPollOptionRead(
                        id=opt.id,
                        poll_id=opt.poll_id,
                        option_text=opt.option_text,
                        position=opt.position,
                        votes_count=opt_votes,
                        percentage=pct,
                    )
                )

            poll_read = CommunityPollRead(
                id=poll.id,
                message_id=poll.message_id,
                question=poll.question,
                created_at=poll.created_at,
                options=options_read,
                total_votes=total_votes,
                user_voted_option_id=user_voted_option_id,
            )

        book_preview = None
        if msg.book:
            book_preview = CommunityBookPreview(
                id=msg.book.id,
                title=msg.book.title,
                subtitle=msg.book.subtitle,
                author_name=msg.book.author_name,
                cover_url=msg.book.cover_url,
                page_count=msg.book.page_count,
            )

        return CommunityMessageRead(
            id=msg.id,
            community_id=msg.community_id,
            user_id=msg.user_id,
            content=msg.content,
            book_id=msg.book_id,
            book=book_preview,
            is_poll=msg.is_poll,
            poll=poll_read,
            author=msg.author,
            likes_count=likes_count,
            has_liked=has_liked,
            created_at=msg.created_at,
            updated_at=msg.updated_at,
        )

    @staticmethod
    def create_message(
        db: Session,
        community_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: CommunityMessageCreate,
    ) -> CommunityMessageRead:
        comm = db.execute(select(Community).where(Community.id == community_id)).scalar_one_or_none()
        if not comm:
            raise NotFoundError("Comunidade não encontrada.")

        member = db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
                CommunityMember.status == "active",
            )
        ).scalar_one_or_none()

        if not member:
            raise ForbiddenError("Você precisa ser membro ativo para enviar mensagens nesta comunidade.")

        # Se apenas admins podem enviar mensagens
        if comm.only_admins_can_post and member.role not in ("owner", "admin"):
            raise ForbiddenError("Nesta comunidade, apenas administradores têm permissão para publicar mensagens.")

        is_poll = bool(
            payload.poll_question
            and payload.poll_question.strip()
            and payload.poll_options
            and len(payload.poll_options) >= 2
        )

        # Valida se book_id existe caso enviado
        if payload.book_id:
            book_exists = db.execute(select(Book.id).where(Book.id == payload.book_id)).scalar_one_or_none()
            if not book_exists:
                payload.book_id = None

        message = CommunityMessage(
            community_id=community_id,
            user_id=user_id,
            content=payload.content.strip(),
            book_id=payload.book_id,
            is_poll=is_poll,
        )
        db.add(message)
        db.flush()

        if is_poll:
            poll = CommunityPoll(
                message_id=message.id,
                question=payload.poll_question.strip(),
            )
            db.add(poll)
            db.flush()

            clean_options = [opt.strip() for opt in payload.poll_options if opt.strip()]
            for pos, opt_text in enumerate(clean_options[:6]):
                db.add(
                    CommunityPollOption(
                        poll_id=poll.id,
                        option_text=opt_text,
                        position=pos,
                    )
                )

        db.commit()
        db.refresh(message)

        return CommunityService._build_message_read(db, message, user_id)

    @staticmethod
    def toggle_like_message(
        db: Session,
        message_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> CommunityMessageLikeResponse:
        msg = db.execute(select(CommunityMessage).where(CommunityMessage.id == message_id)).scalar_one_or_none()
        if not msg:
            raise NotFoundError("Mensagem não encontrada.")

        existing = db.execute(
            select(CommunityMessageLike).where(
                CommunityMessageLike.message_id == message_id,
                CommunityMessageLike.user_id == user_id,
            )
        ).scalar_one_or_none()

        if existing:
            db.delete(existing)
            liked = False
        else:
            db.add(CommunityMessageLike(message_id=message_id, user_id=user_id))
            liked = True

        db.commit()

        likes_count = db.execute(
            select(func.count(CommunityMessageLike.id)).where(CommunityMessageLike.message_id == message_id)
        ).scalar_one()

        return CommunityMessageLikeResponse(liked=liked, likes_count=likes_count)

    @staticmethod
    def vote_poll(
        db: Session,
        poll_id: uuid.UUID,
        option_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> CommunityPollRead:
        poll = db.execute(
            select(CommunityPoll)
            .options(selectinload(CommunityPoll.options))
            .where(CommunityPoll.id == poll_id)
        ).scalar_one_or_none()

        if not poll:
            raise NotFoundError("Enquete não encontrada.")

        # Verifica se option pertence à enquete
        valid_option = any(opt.id == option_id for opt in poll.options)
        if not valid_option:
            raise ConflictError("Opção inválida para esta enquete.")

        # Verifica se usuário já votou
        existing_vote = db.execute(
            select(CommunityPollVote).where(
                CommunityPollVote.poll_id == poll_id,
                CommunityPollVote.user_id == user_id,
            )
        ).scalar_one_or_none()

        if existing_vote:
            existing_vote.option_id = option_id
            existing_vote.voted_at = datetime.now(UTC)
        else:
            new_vote = CommunityPollVote(
                poll_id=poll_id,
                option_id=option_id,
                user_id=user_id,
            )
            db.add(new_vote)

        db.commit()

        # Recarrega e devolve a enquete atualizada
        msg = db.execute(select(CommunityMessage).where(CommunityMessage.id == poll.message_id)).scalar_one()
        msg_read = CommunityService._build_message_read(db, msg, user_id)
        return msg_read.poll
