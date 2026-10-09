import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.models.shelf import BookStatus
from app.schemas.common import PaginatedResponse
from app.schemas.shelf import (
    CollectionCreate,
    CollectionRead,
    CollectionReorder,
    CollectionUpdate,
    ReadingSessionCreate,
    ReadingSessionRead,
    UserBookCreate,
    UserBookRead,
    UserBookUpdate,
    UserNoteCreate,
    UserNoteRead,
    UserQuoteCreate,
    UserQuoteRead,
    UserTagCreate,
    UserTagRead,
    UserTagUpdate,
)
from app.services.shelf_service import ShelfService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[UserBookRead],
    summary="Listar livros na estante do leitor autenticado",
)
def list_shelf_books(
    status: BookStatus | None = Query(default=None, description="Filtrar por status de leitura"),
    favorite: bool | None = Query(default=None, description="Filtrar por favoritos"),
    q: str | None = Query(default=None, description="Busca por título, autor ou ISBN"),
    author_id: uuid.UUID | None = Query(default=None, description="Filtrar por autor"),
    publisher_id: uuid.UUID | None = Query(default=None, description="Filtrar por editora"),
    genre_id: uuid.UUID | None = Query(default=None, description="Filtrar por gênero"),
    collection_id: uuid.UUID | None = Query(default=None, description="Filtrar por coleção"),
    tag_id: uuid.UUID | None = Query(default=None, description="Filtrar por tag"),
    personal_color: str | None = Query(default=None, description="Filtrar por cor personalizada"),
    min_rating: Decimal | None = Query(default=None, description="Avaliação mínima (0-5)"),
    sort_by: str | None = Query(default="updated_at_desc", description="Critério de ordenação"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(default=20, ge=1, le=100, description="Itens por página"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    items, total = ShelfService.list_user_shelf(
        db=db,
        user_id=user_uuid,
        status=status,
        favorite=favorite,
        q=q,
        author_id=author_id,
        publisher_id=publisher_id,
        genre_id=genre_id,
        collection_id=collection_id,
        tag_id=tag_id,
        personal_color=personal_color,
        min_rating=min_rating,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    user_book_reads = [UserBookRead.model_validate(ub) for ub in items]
    return PaginatedResponse.create(
        items=user_book_reads, total=total, page=page, page_size=page_size
    )


@router.post(
    "",
    response_model=UserBookRead,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar livro à estante pessoal",
)
def add_book_to_shelf(
    book_in: UserBookCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    user_book = ShelfService.add_to_shelf(db=db, user_id=user_uuid, data=book_in)
    return UserBookRead.model_validate(user_book)


@router.get(
    "/by-book/{book_id}",
    response_model=UserBookRead | None,
    summary="Buscar vínculo da estante pelo ID bibliográfico do livro",
)
def get_shelf_by_book_id(
    book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    user_book = ShelfService.get_user_book_by_book_id(db=db, user_id=user_uuid, book_id=book_id)
    return UserBookRead.model_validate(user_book) if user_book else None


# ==============================================================================
# Coleções do Usuário (Collections)
# ==============================================================================
@router.get(
    "/collections",
    response_model=list[CollectionRead],
    summary="Listar coleções personalizadas do usuário",
)
def list_collections(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    colls = ShelfService.list_collections(db=db, user_id=user_uuid)
    return [CollectionRead.model_validate(c) for c in colls]


@router.post(
    "/collections",
    response_model=CollectionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova coleção",
)
def create_collection(
    collection_in: CollectionCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    created = ShelfService.create_collection(db=db, user_id=user_uuid, data=collection_in)
    return CollectionRead.model_validate(created)


@router.put(
    "/collections/reorder",
    response_model=list[CollectionRead],
    summary="Reordenar posições das coleções",
)
def reorder_collections(
    reorder_in: CollectionReorder,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    updated = ShelfService.reorder_collections(
        db=db, user_id=user_uuid, collection_ids=reorder_in.collection_ids
    )
    return [CollectionRead.model_validate(c) for c in updated]


@router.get(
    "/collections/{collection_id}",
    response_model=CollectionRead,
    summary="Obter detalhes de uma coleção",
)
def get_collection(
    collection_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    coll = ShelfService.get_collection(db=db, user_id=user_uuid, collection_id=collection_id)
    return CollectionRead.model_validate(coll)


@router.patch(
    "/collections/{collection_id}",
    response_model=CollectionRead,
    summary="Atualizar informações de uma coleção",
)
def update_collection(
    collection_id: uuid.UUID,
    collection_in: CollectionUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    updated = ShelfService.update_collection(
        db=db, user_id=user_uuid, collection_id=collection_id, data=collection_in
    )
    return CollectionRead.model_validate(updated)


@router.delete(
    "/collections/{collection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir coleção",
)
def delete_collection(
    collection_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.delete_collection(db=db, user_id=user_uuid, collection_id=collection_id)
    return None


@router.post(
    "/collections/{collection_id}/books/{user_book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Adicionar livro a uma coleção",
)
def add_book_to_collection(
    collection_id: uuid.UUID,
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.add_book_to_collection(
        db=db, user_id=user_uuid, collection_id=collection_id, user_book_id=user_book_id
    )
    return None


@router.delete(
    "/collections/{collection_id}/books/{user_book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover livro de uma coleção",
)
def remove_book_from_collection(
    collection_id: uuid.UUID,
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.remove_book_from_collection(
        db=db, user_id=user_uuid, collection_id=collection_id, user_book_id=user_book_id
    )
    return None


# ==============================================================================
# Tags Personalizadas do Usuário (User Tags)
# ==============================================================================
@router.get(
    "/tags",
    response_model=list[UserTagRead],
    summary="Listar tags personalizadas do usuário",
)
def list_tags(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    tags = ShelfService.list_tags(db=db, user_id=user_uuid)
    return [UserTagRead.model_validate(t) for t in tags]


@router.post(
    "/tags",
    response_model=UserTagRead,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova tag",
)
def create_tag(
    tag_in: UserTagCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    tag = ShelfService.create_tag(db=db, user_id=user_uuid, data=tag_in)
    return UserTagRead.model_validate(tag)


@router.patch(
    "/tags/{tag_id}",
    response_model=UserTagRead,
    summary="Atualizar tag",
)
def update_tag(
    tag_id: uuid.UUID,
    tag_in: UserTagUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    updated = ShelfService.update_tag(db=db, user_id=user_uuid, tag_id=tag_id, data=tag_in)
    return UserTagRead.model_validate(updated)


@router.delete(
    "/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir tag",
)
def delete_tag(
    tag_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.delete_tag(db=db, user_id=user_uuid, tag_id=tag_id)
    return None


@router.put(
    "/{user_book_id}/tags",
    response_model=UserBookRead,
    summary="Definir tags de um livro na estante",
)
def set_book_tags(
    user_book_id: uuid.UUID,
    tag_ids: list[uuid.UUID],
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ub = ShelfService.set_user_book_tags(
        db=db, user_id=user_uuid, user_book_id=user_book_id, tag_ids=tag_ids
    )
    return UserBookRead.model_validate(ub)


@router.get(
    "/{user_book_id}",
    response_model=UserBookRead,
    summary="Detalhes do livro na estante do usuário",
)
def get_shelf_book(
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    user_book = ShelfService.get_user_book(db=db, user_id=user_uuid, user_book_id=user_book_id)
    return UserBookRead.model_validate(user_book)


@router.patch(
    "/{user_book_id}",
    response_model=UserBookRead,
    summary="Atualizar progresso, status ou avaliação do livro na estante",
)
def update_shelf_book(
    user_book_id: uuid.UUID,
    update_in: UserBookUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    updated = ShelfService.update_user_book(
        db=db,
        user_id=user_uuid,
        user_book_id=user_book_id,
        update_data=update_in,
    )
    return UserBookRead.model_validate(updated)


@router.delete(
    "/{user_book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover livro da estante pessoal",
)
def remove_book_from_shelf(
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.remove_from_shelf(db=db, user_id=user_uuid, user_book_id=user_book_id)
    return None


@router.post(
    "/{user_book_id}/sessions",
    response_model=ReadingSessionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar sessão de leitura para um livro da estante",
)
def record_reading_session(
    user_book_id: uuid.UUID,
    session_in: ReadingSessionCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    session = ShelfService.create_reading_session(
        db=db,
        user_id=user_uuid,
        user_book_id=user_book_id,
        session_data=session_in,
    )
    return ReadingSessionRead.model_validate(session)


@router.get(
    "/{user_book_id}/notes",
    response_model=list[UserNoteRead],
    summary="Listar notas pessoais do leitor para o livro",
)
def list_notes(
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    notes = ShelfService.list_user_notes(db=db, user_id=user_uuid, user_book_id=user_book_id)
    return [UserNoteRead.model_validate(n) for n in notes]


@router.post(
    "/{user_book_id}/notes",
    response_model=UserNoteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nota pessoal para o livro",
)
def create_note(
    user_book_id: uuid.UUID,
    note_in: UserNoteCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    note = ShelfService.create_user_note(
        db=db, user_id=user_uuid, user_book_id=user_book_id, data=note_in
    )
    return UserNoteRead.model_validate(note)


@router.delete(
    "/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir nota pessoal",
)
def delete_note(
    note_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.delete_user_note(db=db, user_id=user_uuid, note_id=note_id)
    return None


@router.get(
    "/{user_book_id}/quotes",
    response_model=list[UserQuoteRead],
    summary="Listar citações favoritas do livro",
)
def list_quotes(
    user_book_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    quotes = ShelfService.list_user_quotes(db=db, user_id=user_uuid, user_book_id=user_book_id)
    return [UserQuoteRead.model_validate(q) for q in quotes]


@router.post(
    "/{user_book_id}/quotes",
    response_model=UserQuoteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar citação favorita do livro",
)
def create_quote(
    user_book_id: uuid.UUID,
    quote_in: UserQuoteCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    quote = ShelfService.create_user_quote(
        db=db, user_id=user_uuid, user_book_id=user_book_id, data=quote_in
    )
    return UserQuoteRead.model_validate(quote)


@router.delete(
    "/quotes/{quote_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir citação",
)
def delete_quote(
    quote_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(current_user.id)
    ShelfService.delete_user_quote(db=db, user_id=user_uuid, quote_id=quote_id)
    return None
