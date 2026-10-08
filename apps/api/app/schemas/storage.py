"""
Schemas para respostas de upload e gerenciamento de arquivos de storage.
"""

from pydantic import BaseModel, ConfigDict


class FileUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    url: str
    key: str
    filename: str
    content_type: str
    size: int


class FileDeleteResponse(BaseModel):
    success: bool
    message: str
