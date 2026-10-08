"""
Serviço de gerenciamento de arquivos com Cloudflare R2 (compatível com AWS S3).
"""

import logging
import re
import uuid
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": ".pdf",
}

ALL_ALLOWED_TYPES = {**ALLOWED_IMAGE_TYPES, **ALLOWED_DOCUMENT_TYPES}

MAX_IMAGE_SIZE = 15 * 1024 * 1024  # 15 MB
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50 MB

ALLOWED_FOLDERS = {"covers", "avatars", "documents"}


class StorageService:
    def __init__(self) -> None:
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is None:
            if not settings.r2_configured:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Cloudflare R2 Storage não está configurado.",
                )
            self._client = boto3.client(
                service_name="s3",
                endpoint_url=settings.r2_endpoint,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name="auto",
                config=Config(signature_version="s3v4"),
            )
        return self._client

    def _sanitize_filename(self, filename: str) -> str:
        # Mantém apenas caracteres alfanuméricos, hifens, underlines e pontos
        name = re.sub(r"[^\w\.-]", "_", filename.strip())
        return name[:80]

    def validate_file(self, content_type: str, file_size: int, folder: str) -> None:
        if folder not in ALLOWED_FOLDERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pasta de destino inválida. Permitidas: {', '.join(sorted(ALLOWED_FOLDERS))}",
            )

        if folder in {"covers", "avatars"}:
            if content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Formato de imagem não suportado ({content_type}). Permitidos: {', '.join(ALLOWED_IMAGE_TYPES.keys())}",
                )
            if file_size > MAX_IMAGE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tamanho da imagem excede o limite máximo de {MAX_IMAGE_SIZE // (1024 * 1024)}MB.",
                )
        elif folder == "documents":
            if content_type not in ALLOWED_DOCUMENT_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Formato de documento não suportado ({content_type}). Permitidos: {', '.join(ALLOWED_DOCUMENT_TYPES.keys())}",
                )
            if file_size > MAX_DOCUMENT_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tamanho do documento excede o limite máximo de {MAX_DOCUMENT_SIZE // (1024 * 1024)}MB.",
                )

    def upload_file(
        self,
        file_bytes: bytes,
        original_filename: str,
        content_type: str,
        folder: str = "covers",
    ) -> dict[str, Any]:
        """
        Realiza o upload de um arquivo para o bucket do Cloudflare R2 e retorna a URL pública.
        """
        file_size = len(file_bytes)
        self.validate_file(content_type, file_size, folder)

        client = self._get_client()
        clean_name = self._sanitize_filename(original_filename)
        file_uuid = uuid.uuid4().hex[:12]
        key = f"{folder}/{file_uuid}_{clean_name}"

        try:
            client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
        except ClientError as e:
            logger.error(f"Erro ao enviar arquivo para o Cloudflare R2: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Falha na comunicação com o serviço de armazenamento Cloudflare R2.",
            ) from e

        if settings.R2_PUBLIC_URL:
            public_url = f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
        else:
            public_url = f"{settings.r2_endpoint.rstrip('/')}/{settings.R2_BUCKET_NAME}/{key}"

        return {
            "url": public_url,
            "key": key,
            "filename": original_filename,
            "content_type": content_type,
            "size": file_size,
        }

    def delete_file(self, file_key_or_url: str) -> bool:
        """
        Exclui um arquivo do Cloudflare R2 pelo key ou pela URL pública.
        """
        if not file_key_or_url:
            return False

        key = file_key_or_url
        if settings.R2_PUBLIC_URL and file_key_or_url.startswith(settings.R2_PUBLIC_URL):
            key = file_key_or_url.replace(settings.R2_PUBLIC_URL.rstrip("/") + "/", "", 1)
        elif "r2.cloudflarestorage.com" in file_key_or_url:
            parts = file_key_or_url.split(f"/{settings.R2_BUCKET_NAME}/")
            if len(parts) > 1:
                key = parts[1]

        client = self._get_client()
        try:
            client.delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key,
            )
            return True
        except ClientError as e:
            logger.error(f"Erro ao remover arquivo do Cloudflare R2 ({key}): {e}")
            return False


storage_service = StorageService()
