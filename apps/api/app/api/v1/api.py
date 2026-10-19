from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    authors,
    book_submissions,
    books,
    feed,
    genres,
    health,
    notifications,
    profiles,
    publishers,
    rabiscos,
    shelf,
    storage,
)

api_router = APIRouter()

# Health check
api_router.include_router(health.router, tags=["Health"])

# Autenticação e Perfis
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])

# Catálogo Bibliográfico Global
api_router.include_router(books.router, prefix="/books", tags=["Books"])
api_router.include_router(book_submissions.router, prefix="/book-submissions", tags=["Book Submissions"])
api_router.include_router(authors.router, prefix="/authors", tags=["Authors"])
api_router.include_router(publishers.router, prefix="/publishers", tags=["Publishers"])
api_router.include_router(genres.router, prefix="/genres", tags=["Genres"])

# Estante Pessoal do Leitor
api_router.include_router(shelf.router, prefix="/shelf", tags=["Shelf"])

# Feed Público Literário
api_router.include_router(feed.router, prefix="/feed", tags=["Feed"])

# Rabiscos (Stories Efêmeros de 24h)
api_router.include_router(rabiscos.router, prefix="/rabiscos", tags=["Rabiscos"])

# Notificações
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# Armazenamento de Arquivos (Cloudflare R2)
api_router.include_router(storage.router, prefix="/storage", tags=["Storage"])

