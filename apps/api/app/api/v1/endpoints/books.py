import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db, get_optional_user
from app.core.security import CurrentUser
from app.models.shelf import BookStatus
from app.schemas.book_search import (
    BookImportConfirmRequest,
    BookImportConfirmResponse,
    BookSyncCoversResponse,
    CoverOption,
    ExternalBookItem,
)
from app.schemas.catalog import (
    BookCreate,
    BookRead,
    BookUpdate,
    IncompleteBooksCounts,
    IncompleteBooksResponse,
)
from app.schemas.common import PaginatedResponse
from app.services.book_cover_service import BookCoverService
from app.services.book_integration_service import book_integration_service
from app.services.catalog_service import CatalogService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[BookRead],
    summary="Listar e pesquisar livros do catálogo local",
)
def list_books(
    q: str | None = Query(default=None, description="Busca textual por título, subtítulo ou ISBN"),
    genre: str | None = Query(default=None, description="Filtrar por slug de gênero literário"),
    author_id: uuid.UUID | None = Query(default=None, description="Filtrar por ID do autor"),
    publisher_id: uuid.UUID | None = Query(default=None, description="Filtrar por ID da editora"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(default=20, ge=1, le=100, description="Quantidade por página"),
    db: Session = Depends(get_db),
    _user: CurrentUser | None = Depends(get_optional_user),
):
    books, total = CatalogService.list_books(
        db=db,
        query=q,
        genre_slug=genre,
        author_id=author_id,
        publisher_id=publisher_id,
        page=page,
        page_size=page_size,
    )
    book_items = [BookRead.model_validate(book) for book in books]
    return PaginatedResponse.create(items=book_items, total=total, page=page, page_size=page_size)


# ==============================================================================
# Integração Externa (Busca por Título, Autor, ISBN e Importação/Reutilização)
# ==============================================================================
@router.get(
    "/search/external",
    response_model=list[ExternalBookItem],
    summary="Buscar livros em provedores externos (Google Books, Open Library)",
)
async def search_external_books(
    q: str | None = Query(default=None, description="Termo geral de busca"),
    title: str | None = Query(default=None, description="Buscar por título"),
    author: str | None = Query(default=None, description="Buscar por autor"),
    isbn: str | None = Query(default=None, description="Buscar por código ISBN"),
    provider: str | None = Query(
        default=None,
        description="Identificador do provedor ('google_books' ou 'open_library')",
    ),
    limit: int = Query(default=12, ge=1, le=40, description="Limite de resultados"),
    db: Session = Depends(get_db),
    current_user: CurrentUser | None = Depends(get_optional_user),
):
    """
    Pesquisa externa com suporte a busca por Título, Autor e ISBN.
    O serviço correlaciona automaticamente cada resultado com o banco de dados
    do TeleBooks, identificando se já existe no catálogo ou na estante do leitor.
    """
    return await book_integration_service.search_external_books(
        db=db,
        query=q,
        title=title,
        author=author,
        isbn=isbn,
        provider_name=provider,
        limit=limit,
        current_user=current_user,
    )


@router.post(
    "/import/confirm",
    response_model=BookImportConfirmResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirmar importação de livro externo (cria novo ou reutiliza existente sem duplicar)",
)
def confirm_import_book(
    payload: BookImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser | None = Depends(get_optional_user),
):
    """
    Fluxo de confirmação pelo usuário:
    - Se o livro já existir (por ISBN13, ISBN10 ou Título+Autor), REUTILIZA o registro.
    - Se for inédito, cria no catálogo com autores e editora resolvidos.
    - Se add_to_shelf=True e usuário logado, vincula à estante pessoal.
    """
    return book_integration_service.confirm_or_reuse_book(
        db=db,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/sync-covers",
    response_model=BookSyncCoversResponse,
    status_code=status.HTTP_200_OK,
    summary="Sincronizar e recuperar capas ausentes para livros no catálogo",
)
def sync_missing_covers(
    db: Session = Depends(get_db),
    _user: CurrentUser | None = Depends(get_optional_user),
):
    """
    Varre os livros no catálogo que estão sem capa ou com URLs inválidas
    e busca ativamente as capas no Google Books CDN e Open Library.
    """
    return book_integration_service.sync_missing_covers(db=db)


@router.get(
    "/covers/search-options",
    response_model=list[CoverOption],
    summary="Buscar opções de capas online para uma edição de livro (ISBN, Título, Autor)",
)
async def search_cover_options(
    isbn: str | None = Query(default=None, description="ISBN-10 ou ISBN-13 da obra"),
    title: str | None = Query(default=None, description="Título da obra"),
    author: str | None = Query(default=None, description="Nome do autor"),
    _user: CurrentUser | None = Depends(get_optional_user),
):
    """
    Pesquisa e agrega múltiplas opções de capas na internet para que o usuário
    possa escolher visualmente a capa correta da edição.
    """
    options = await BookCoverService.search_cover_options(
        isbn=isbn,
        title=title,
        author=author,
    )
    return [CoverOption.model_validate(opt) for opt in options]


@router.get(
    "/isbn/{isbn}",
    response_model=BookRead,
    summary="Buscar livro local por ISBN (10 ou 13 dígitos)",
)
def get_book_by_isbn(
    isbn: str,
    db: Session = Depends(get_db),
):
    book = CatalogService.get_book_by_isbn(db=db, isbn=isbn)
    return BookRead.model_validate(book)


@router.get(
    "/admin/incomplete",
    response_model=IncompleteBooksResponse,
    summary="Listar livros do catálogo com informações incompletas (Apenas Admin)",
)
def list_incomplete_books(
    filter_type: str = Query(
        default="all",
        alias="filter",
        description="'all', 'missing_author', 'missing_pages', 'missing_cover'",
    ),
    q: str | None = Query(default=None, description="Busca textual por título, autor ou ISBN"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(default=20, ge=1, le=100, description="Quantidade por página"),
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(get_current_admin),
):
    """
    Retorna livros do catálogo que necessitam de ajustes (sem autor, sem páginas ou sem capa).
    """
    books, total, counts = CatalogService.list_incomplete_books(
        db=db,
        filter_type=filter_type,
        query=q,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return IncompleteBooksResponse(
        items=[BookRead.model_validate(b) for b in books],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        counts=IncompleteBooksCounts(**counts),
    )


@router.get(
    "/{book_id}",
    response_model=BookRead,
    summary="Detalhes de um livro por UUID",
)
def get_book(
    book_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    book = CatalogService.get_book_by_id(db=db, book_id=book_id)
    return BookRead.model_validate(book)


@router.post(
    "",
    response_model=BookRead,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo livro no catálogo global manualmente",
)
def create_book(
    book_in: BookCreate,
    add_to_shelf: bool = Query(default=True, description="Adicionar automaticamente à estante do usuário"),
    shelf_status: BookStatus = Query(default=BookStatus.WANT_TO_READ, description="Status inicial na estante"),
    db: Session = Depends(get_db),
    current_user: CurrentUser | None = Depends(get_optional_user),
):
    book = CatalogService.create_book(
        db=db,
        book_in=book_in,
        current_user=current_user,
        add_to_shelf=add_to_shelf,
        shelf_status=shelf_status,
    )
    return BookRead.model_validate(book)


@router.patch(
    "/{book_id}",
    response_model=BookRead,
    summary="Atualizar informações de um livro existente (Apenas Administradores)",
)
def update_book(
    book_id: uuid.UUID,
    book_update: BookUpdate,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(get_current_admin),
):
    updated_book = CatalogService.update_book(db=db, book_id=book_id, book_update=book_update)
    return BookRead.model_validate(updated_book)


@router.delete(
    "/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover livro do catálogo global (Apenas Administradores)",
)
def delete_book(
    book_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(get_current_admin),
):
    CatalogService.delete_book(db=db, book_id=book_id)
    return None
