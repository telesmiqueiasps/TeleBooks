import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.catalog import GenreCreate, GenreRead, GenreUpdate
from app.schemas.common import PaginatedResponse
from app.services.catalog_service import CatalogService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[GenreRead],
    summary="Listar e pesquisar gêneros literários",
)
def list_genres(
    q: str | None = Query(default=None, description="Busca por nome ou slug do gênero"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(default=100, ge=1, le=100, description="Quantidade por página"),
    db: Session = Depends(get_db),
):
    genres, total = CatalogService.list_genres(
        db=db,
        query=q,
        page=page,
        page_size=page_size,
    )
    items = [GenreRead.model_validate(genre) for genre in genres]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/{genre_id}",
    response_model=GenreRead,
    summary="Buscar gênero por ID",
)
def get_genre(
    genre_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    genre = CatalogService.get_genre_by_id(db=db, genre_id=genre_id)
    return GenreRead.model_validate(genre)


@router.post(
    "",
    response_model=GenreRead,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo gênero literário",
)
def create_genre(
    genre_in: GenreCreate,
    db: Session = Depends(get_db),
):
    genre = CatalogService.create_genre(db=db, genre_in=genre_in)
    return GenreRead.model_validate(genre)


@router.patch(
    "/{genre_id}",
    response_model=GenreRead,
    summary="Atualizar informações de um gênero literário",
)
def update_genre(
    genre_id: uuid.UUID,
    genre_update: GenreUpdate,
    db: Session = Depends(get_db),
):
    genre = CatalogService.update_genre(db=db, genre_id=genre_id, genre_update=genre_update)
    return GenreRead.model_validate(genre)


@router.delete(
    "/{genre_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover gênero literário",
)
def delete_genre(
    genre_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    CatalogService.delete_genre(db=db, genre_id=genre_id)
    return None
