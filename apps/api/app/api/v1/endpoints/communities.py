import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, get_optional_user
from app.core.security import CurrentUser
from app.schemas.common import PaginatedResponse
from app.schemas.community import (
    CommunityCreate,
    CommunityJoinResponse,
    CommunityMemberInvite,
    CommunityMemberRead,
    CommunityMemberRoleUpdate,
    CommunityMessageCreate,
    CommunityMessageLikeResponse,
    CommunityMessageRead,
    CommunityPollRead,
    CommunityPollVoteCreate,
    CommunityRead,
    CommunityUpdate,
)
from app.services.community_service import CommunityService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[CommunityRead],
    summary="Listar e explorar comunidades literárias",
)
def list_communities(
    tab: str = Query(default="all", description="'all' (explorar), 'my' (minhas), 'managed' (gerenciadas)"),
    q: str | None = Query(default=None, description="Busca textual por nome ou descrição"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser | None = Depends(get_optional_user),
):
    user_uuid = uuid.UUID(current_user.id) if current_user else None
    items, total = CommunityService.list_communities(
        db=db,
        user_id=user_uuid,
        tab=tab,
        query=q,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post(
    "",
    response_model=CommunityRead,
    status_code=status.HTTP_201_CREATED,
    summary="Criar uma nova comunidade / clube literário",
)
def create_community(
    payload: CommunityCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.create_community(db=db, user_id=user_uuid, payload=payload)


@router.get(
    "/{id_or_slug}",
    response_model=CommunityRead,
    summary="Obter detalhes de uma comunidade por UUID ou Slug",
)
def get_community(
    id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser | None = Depends(get_optional_user),
):
    user_uuid = uuid.UUID(current_user.id) if current_user else None
    return CommunityService.get_community(db=db, id_or_slug=id_or_slug, user_id=user_uuid)


@router.patch(
    "/{community_id}",
    response_model=CommunityRead,
    summary="Atualizar informações da comunidade (Apenas Admin/Owner)",
)
def update_community(
    community_id: uuid.UUID,
    payload: CommunityUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.update_community(
        db=db,
        community_id=community_id,
        user_id=user_uuid,
        payload=payload,
    )


@router.post(
    "/{community_id}/join",
    response_model=CommunityJoinResponse,
    summary="Entrar ou solicitar acesso a uma comunidade",
)
def join_community(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.join_community(db=db, community_id=community_id, user_id=user_uuid)


@router.post(
    "/{community_id}/leave",
    summary="Sair de uma comunidade",
)
def leave_community(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.leave_community(db=db, community_id=community_id, user_id=user_uuid)


# ==============================================================================
# Membros & Moderação
# ==============================================================================
@router.get(
    "/{community_id}/members",
    response_model=list[CommunityMemberRead],
    summary="Listar membros de uma comunidade ('active' ou 'pending')",
)
def list_community_members(
    community_id: uuid.UUID,
    status_filter: str = Query(default="active", alias="status", description="'active' ou 'pending'"),
    db: Session = Depends(get_db),
    current_user: CurrentUser | None = Depends(get_optional_user),
):
    user_uuid = uuid.UUID(current_user.id) if current_user else None
    return CommunityService.list_members(
        db=db,
        community_id=community_id,
        user_id=user_uuid,
        status_filter=status_filter,
    )


@router.post(
    "/{community_id}/members/{target_user_id}/approve",
    response_model=CommunityMemberRead,
    summary="Aprovar solicitação de entrada (Apenas Admin/Owner)",
)
def approve_community_member(
    community_id: uuid.UUID,
    target_user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.approve_member(
        db=db,
        community_id=community_id,
        target_user_id=target_user_id,
        admin_id=user_uuid,
    )


@router.post(
    "/{community_id}/members/{target_user_id}/reject",
    summary="Rejeitar solicitação de entrada (Apenas Admin/Owner)",
)
def reject_community_member(
    community_id: uuid.UUID,
    target_user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.reject_member(
        db=db,
        community_id=community_id,
        target_user_id=target_user_id,
        admin_id=user_uuid,
    )


@router.delete(
    "/{community_id}/members/{target_user_id}",
    summary="Remover membro da comunidade (Apenas Admin/Owner)",
)
def remove_community_member(
    community_id: uuid.UUID,
    target_user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.remove_member(
        db=db,
        community_id=community_id,
        target_user_id=target_user_id,
        admin_id=user_uuid,
    )


@router.patch(
    "/{community_id}/members/{target_user_id}/role",
    response_model=CommunityMemberRead,
    summary="Alterar cargo de um membro ('admin' ou 'member') (Apenas Admin/Owner)",
)
def update_community_member_role(
    community_id: uuid.UUID,
    target_user_id: uuid.UUID,
    payload: CommunityMemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.update_member_role(
        db=db,
        community_id=community_id,
        target_user_id=target_user_id,
        new_role=payload.role,
        admin_id=user_uuid,
    )


@router.post(
    "/{community_id}/members/invite",
    response_model=CommunityMemberRead,
    summary="Adicionar leitor diretamente à comunidade (Apenas Admin/Owner)",
)
def invite_community_member(
    community_id: uuid.UUID,
    payload: CommunityMemberInvite,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.invite_or_add_member(
        db=db,
        community_id=community_id,
        target_user_id=payload.user_id,
        admin_id=user_uuid,
    )


# ==============================================================================
# Mensagens & Enquetes
# ==============================================================================
@router.get(
    "/{community_id}/messages",
    response_model=PaginatedResponse[CommunityMessageRead],
    summary="Listar mensagens de uma comunidade (ordem cronológica)",
)
def list_community_messages(
    community_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser | None = Depends(get_optional_user),
):
    user_uuid = uuid.UUID(current_user.id) if current_user else None
    items, total = CommunityService.list_messages(
        db=db,
        community_id=community_id,
        user_id=user_uuid,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post(
    "/{community_id}/messages",
    response_model=CommunityMessageRead,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar mensagem de texto na comunidade (suporta livro vinculado e enquete)",
)
def create_community_message(
    community_id: uuid.UUID,
    payload: CommunityMessageCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.create_message(
        db=db,
        community_id=community_id,
        user_id=user_uuid,
        payload=payload,
    )


@router.post(
    "/messages/{message_id}/like",
    response_model=CommunityMessageLikeResponse,
    summary="Curtir ou descurtir uma mensagem na comunidade",
)
def toggle_like_message(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.toggle_like_message(
        db=db,
        message_id=message_id,
        user_id=user_uuid,
    )


@router.post(
    "/polls/{poll_id}/vote",
    response_model=CommunityPollRead,
    summary="Votar em uma enquete da comunidade",
)
def vote_community_poll(
    poll_id: uuid.UUID,
    payload: CommunityPollVoteCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user.id)
    return CommunityService.vote_poll(
        db=db,
        poll_id=poll_id,
        option_id=payload.option_id,
        user_id=user_uuid,
    )
