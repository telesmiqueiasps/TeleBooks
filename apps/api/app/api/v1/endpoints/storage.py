"""
Endpoints para upload e gerenciamento de arquivos via Cloudflare R2 Storage.
"""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.deps import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.storage import FileDeleteResponse, FileUploadResponse
from app.services.storage_service import storage_service

router = APIRouter()


@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload de arquivo para o Cloudflare R2",
    description="Permite enviar capas de livros, avatares ou documentos com validação de tipo e tamanho.",
)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Query(
        "covers",
        description="Pasta de destino no bucket: 'covers', 'avatars' ou 'documents'",
    ),
    current_user: CurrentUser = Depends(get_current_user),
) -> FileUploadResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo inválido sem nome especificado.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio.",
        )

    content_type = file.content_type or "application/octet-stream"

    result = storage_service.upload_file(
        file_bytes=file_bytes,
        original_filename=file.filename,
        content_type=content_type,
        folder=folder,
    )

    return FileUploadResponse(**result)


@router.delete(
    "/file",
    response_model=FileDeleteResponse,
    summary="Excluir arquivo do Cloudflare R2",
)
def delete_file(
    key_or_url: str = Query(..., description="Chave do arquivo ou URL pública"),
    current_user: CurrentUser = Depends(get_current_user),
) -> FileDeleteResponse:
    success = storage_service.delete_file(key_or_url)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível excluir o arquivo informado.",
        )
    return FileDeleteResponse(success=True, message="Arquivo excluído com sucesso.")
