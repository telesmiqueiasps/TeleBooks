import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.core.security import CurrentUser
from app.schemas.catalog import BookCreate, BookRead
from app.schemas.common import PaginatedResponse
from app.services.catalog_service import CatalogService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[BookRead],
    summary="Listar e pesquisar livros do catálogo",
)
def list_books(
    q: str | None = Query(default=None, description="Busca textual por título, subtítulo ou ISBN"),
    genre: str | None = Query(default=None, description="Filtrar por slug de gênero literário"),
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
        publisher_id=publisher_id,
        page=page,
        page_size=page_size,
    )
    book_items = [BookRead.model_validate(book) for book in books]
    return PaginatedResponse.create(items=book_items, total=total, page=page, page_size=page_size)


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


@router.get(
    "/isbn/{isbn}",
    response_model=BookRead,
    summary="Buscar livro por ISBN (10 ou 13 dígitos)",
)
def get_book_by_isbn(
    isbn: str,
    db: Session = Depends(get_db),
):
    book = CatalogService.get_book_by_isbn(db=db, isbn=isbn)
    return BookRead.model_validate(book)


@router.post(
    "",
    response_model=BookRead,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo livro no catálogo global",
)
def create_book(
    book_in: BookCreate,
    db: Session = Depends(get_db),
):
    book = CatalogService.create_book(db=db, book_in=book_in)
    return BookRead.model_validate(book)
