from fastapi import APIRouter

from app.api.v1.endpoints import auth, authors, books, genres, health, publishers, shelf

api_router = APIRouter()

# Health check
api_router.include_router(health.router, tags=["Health"])

# Autenticação e Perfil
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# Catálogo Bibliográfico Global
api_router.include_router(books.router, prefix="/books", tags=["Books"])
api_router.include_router(authors.router, prefix="/authors", tags=["Authors"])
api_router.include_router(publishers.router, prefix="/publishers", tags=["Publishers"])
api_router.include_router(genres.router, prefix="/genres", tags=["Genres"])

# Estante Pessoal do Leitor
api_router.include_router(shelf.router, prefix="/shelf", tags=["Shelf"])
