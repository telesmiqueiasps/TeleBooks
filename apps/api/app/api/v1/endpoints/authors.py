import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.catalog import AuthorCreate, AuthorRead, AuthorUpdate
from app.schemas.common import PaginatedResponse
from app.services.catalog_service import CatalogService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[AuthorRead],
    summary="Listar e pesquisar autores",
)
def list_authors(
    q: str | None = Query(default=None, description="Busca textual por nome do autor"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(default=20, ge=1, le=100, description="Quantidade por página"),
    db: Session = Depends(get_db),
):
    authors, total = CatalogService.list_authors(
        db=db,
        query=q,
        page=page,
        page_size=page_size,
    )
    items = [AuthorRead.model_validate(author) for author in authors]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/{author_id}",
    response_model=AuthorRead,
    summary="Buscar autor por ID",
)
def get_author(
    author_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    author = CatalogService.get_author_by_id(db=db, author_id=author_id)
    return AuthorRead.model_validate(author)


@router.post(
    "",
    response_model=AuthorRead,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo autor",
)
def create_author(
    author_in: AuthorCreate,
    db: Session = Depends(get_db),
):
    author = CatalogService.create_author(db=db, author_in=author_in)
    return AuthorRead.model_validate(author)


@router.patch(
    "/{author_id}",
    response_model=AuthorRead,
    summary="Atualizar informações de um autor",
)
def update_author(
    author_id: uuid.UUID,
    author_update: AuthorUpdate,
    db: Session = Depends(get_db),
):
    author = CatalogService.update_author(db=db, author_id=author_id, author_update=author_update)
    return AuthorRead.model_validate(author)


@router.delete(
    "/{author_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover autor",
)
def delete_author(
    author_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    CatalogService.delete_author(db=db, author_id=author_id)
    return None
