import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.core.security import CurrentUser
from app.schemas.book_search import (
    BookImportConfirmRequest,
    BookImportConfirmResponse,
    ExternalBookItem,
)
from app.schemas.catalog import BookCreate, BookRead, BookUpdate
from app.schemas.common import PaginatedResponse
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
    db: Session = Depends(get_db),
):
    book = CatalogService.create_book(db=db, book_in=book_in)
    return BookRead.model_validate(book)


@router.patch(
    "/{book_id}",
    response_model=BookRead,
    summary="Atualizar informações de um livro existente",
)
def update_book(
    book_id: uuid.UUID,
    book_update: BookUpdate,
    db: Session = Depends(get_db),
):
    updated_book = CatalogService.update_book(db=db, book_id=book_id, book_update=book_update)
    return BookRead.model_validate(updated_book)


@router.delete(
    "/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover livro do catálogo global",
)
def delete_book(
    book_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    CatalogService.delete_book(db=db, book_id=book_id)
    return None
