from abc import ABC, abstractmethod

from app.schemas.book_search import ExternalBookItem


class BaseBookProvider(ABC):
    """
    Interface abstrata para adaptadores de provedores externos de dados bibliográficos.
    Permite alternar ou adicionar novos provedores (Google Books, Open Library, ISBNdb, etc.)
    sem impactar as regras de negócio do TeleBooks.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Identificador único do provedor (ex: 'google_books', 'open_library')."""
        pass

    @abstractmethod
    async def search(
        self,
        query: str | None = None,
        title: str | None = None,
        author: str | None = None,
        isbn: str | None = None,
        limit: int = 12,
    ) -> list[ExternalBookItem]:
        """
        Executa busca externa por múltiplos critérios (termo livre, título, autor ou ISBN).
        Retorna lista de ExternalBookItem normalizados.
        """
        pass

    @abstractmethod
    async def get_by_isbn(self, isbn: str) -> ExternalBookItem | None:
        """
        Busca pontual e exata por ISBN (10 ou 13 dígitos).
        """
        pass
