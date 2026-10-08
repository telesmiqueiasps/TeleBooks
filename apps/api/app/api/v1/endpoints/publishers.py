import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.catalog import PublisherCreate, PublisherRead, PublisherUpdate
from app.schemas.common import PaginatedResponse
from app.services.catalog_service import CatalogService

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[PublisherRead],
    summary="Listar e pesquisar editoras",
)
def list_publishers(
    q: str | None = Query(default=None, description="Busca textual por nome da editora"),
    page: int = Query(default=1, ge=1, description="Número da página"),
    page_size: int = Query(default=20, ge=1, le=100, description="Quantidade por página"),
    db: Session = Depends(get_db),
):
    publishers, total = CatalogService.list_publishers(
        db=db,
        query=q,
        page=page,
        page_size=page_size,
    )
    items = [PublisherRead.model_validate(pub) for pub in publishers]
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/{publisher_id}",
    response_model=PublisherRead,
    summary="Buscar editora por ID",
)
def get_publisher(
    publisher_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    publisher = CatalogService.get_publisher_by_id(db=db, publisher_id=publisher_id)
    return PublisherRead.model_validate(publisher)


@router.post(
    "",
    response_model=PublisherRead,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar nova editora",
)
def create_publisher(
    pub_in: PublisherCreate,
    db: Session = Depends(get_db),
):
    publisher = CatalogService.create_publisher(db=db, pub_in=pub_in)
    return PublisherRead.model_validate(publisher)


@router.patch(
    "/{publisher_id}",
    response_model=PublisherRead,
    summary="Atualizar informações de uma editora",
)
def update_publisher(
    publisher_id: uuid.UUID,
    pub_update: PublisherUpdate,
    db: Session = Depends(get_db),
):
    publisher = CatalogService.update_publisher(
        db=db, publisher_id=publisher_id, pub_update=pub_update
    )
    return PublisherRead.model_validate(publisher)


@router.delete(
    "/{publisher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover editora",
)
def delete_publisher(
    publisher_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    CatalogService.delete_publisher(db=db, publisher_id=publisher_id)
    return None
