import type {
  Author,
  Book,
  BookStatus,
  Collection,
  DashboardSummary,
  Genre,
  Publisher,
  ReadingOverview,
  ReadingSession,
  UserBook,
  UserNote,
  UserQuote,
  UserTag,
} from "@telebooks/types";
import { createClient } from "./supabase/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BookCreateParams {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  language?: string;
  page_count?: number | null;
  publication_date?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  publisher_id?: string | null;
  author_ids?: string[];
  genre_ids?: string[];
}

export interface UserBookCreateParams {
  book_id: string;
  status?: BookStatus;
  rating?: number | null;
  owned?: boolean;
  favorite?: boolean;
  current_page?: number;
  personal_color?: string | null;
  shelf_position?: number | null;
  private_notes?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  tag_ids?: string[];
  collection_ids?: string[];
}

export interface FileUploadResult {
  url: string;
  key: string;
  filename: string;
  content_type: string;
  size: number;
}

export interface UserBookUpdateParams {
  status?: BookStatus;
  rating?: number | null;
  owned?: boolean;
  favorite?: boolean;
  current_page?: number;
  personal_color?: string | null;
  shelf_position?: number | null;
  private_notes?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  tag_ids?: string[];
  collection_ids?: string[];
}

export interface CollectionCreateParams {
  name: string;
  description?: string | null;
  is_public?: boolean;
  position?: number;
}

export interface CollectionUpdateParams {
  name?: string;
  description?: string | null;
  is_public?: boolean;
  position?: number;
}

export interface UserTagCreateParams {
  name: string;
  color?: string | null;
}

export interface UserTagUpdateParams {
  name?: string;
  color?: string | null;
}

export interface ReadingSessionCreateParams {
  start_page: number;
  end_page: number;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
}

async function getHeaders(requireAuth: boolean = false): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const supabase = createClient();
    let {
      data: { session },
    } = await supabase.auth.getSession();

    // Se o token estiver expirado ou expirar nos próximos 30 segundos, tenta renovar proativamente
    if (session?.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 30) {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) {
        session = data.session;
      }
    }

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    } else if (requireAuth) {
      // Sem token de sessão
    }
  } catch {
    // Falha silenciosa no browser ou server SSR
  }

  return headers;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = false
): Promise<T> {
  const headers = await getHeaders(requireAuth);
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Ignora erro de parsing JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // ============================================================================
  // Autenticação & Usuários
  // ============================================================================
  async checkUsername(
    username: string
  ): Promise<{ username: string; available: boolean; reason?: string }> {
    return request<{ username: string; available: boolean; reason?: string }>(
      `/auth/check-username?username=${encodeURIComponent(username)}`
    );
  },

  async sendWelcomeEmail(): Promise<{ success: boolean; email: string }> {
    return request<{ success: boolean; email: string }>(
      "/auth/send-welcome",
      { method: "POST" },
      true
    );
  },

  // ============================================================================
  // Catálogo Global: Livros (Books)
  // ============================================================================
  async getBooks(params?: {
    q?: string;
    genre?: string;
    author_id?: string;
    publisher_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<Book>> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.genre) searchParams.set("genre", params.genre);
    if (params?.author_id) searchParams.set("author_id", params.author_id);
    if (params?.publisher_id)
      searchParams.set("publisher_id", params.publisher_id);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());

    const qs = searchParams.toString();
    return request<PaginatedResult<Book>>(`/books${qs ? `?${qs}` : ""}`);
  },

  async getBook(id: string): Promise<Book> {
    return request<Book>(`/books/${id}`);
  },

  async createBook(payload: BookCreateParams): Promise<Book> {
    return request<Book>("/books", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateBook(
    id: string,
    payload: Partial<BookCreateParams>
  ): Promise<Book> {
    return request<Book>(`/books/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteBook(id: string): Promise<void> {
    return request<void>(`/books/${id}`, {
      method: "DELETE",
    });
  },

  // ============================================================================
  // Catálogo Global: Autores (Authors)
  // ============================================================================
  async getAuthors(params?: {
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<Author>> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());

    const qs = searchParams.toString();
    return request<PaginatedResult<Author>>(`/authors${qs ? `?${qs}` : ""}`);
  },

  async createAuthor(payload: {
    name: string;
    bio?: string | null;
    avatar_url?: string | null;
  }): Promise<Author> {
    return request<Author>("/authors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateAuthor(
    id: string,
    payload: { name?: string; bio?: string | null; avatar_url?: string | null }
  ): Promise<Author> {
    return request<Author>(`/authors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteAuthor(id: string): Promise<void> {
    return request<void>(`/authors/${id}`, {
      method: "DELETE",
    });
  },

  // ============================================================================
  // Catálogo Global: Editoras (Publishers)
  // ============================================================================
  async getPublishers(params?: {
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<Publisher>> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());

    const qs = searchParams.toString();
    return request<PaginatedResult<Publisher>>(
      `/publishers${qs ? `?${qs}` : ""}`
    );
  },

  async createPublisher(payload: {
    name: string;
    website?: string | null;
  }): Promise<Publisher> {
    return request<Publisher>("/publishers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePublisher(
    id: string,
    payload: { name?: string; website?: string | null }
  ): Promise<Publisher> {
    return request<Publisher>(`/publishers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deletePublisher(id: string): Promise<void> {
    return request<void>(`/publishers/${id}`, {
      method: "DELETE",
    });
  },

  // ============================================================================
  // Catálogo Global: Gêneros (Genres)
  // ============================================================================
  async getGenres(params?: {
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<Genre>> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());

    const qs = searchParams.toString();
    return request<PaginatedResult<Genre>>(`/genres${qs ? `?${qs}` : ""}`);
  },

  async createGenre(payload: {
    name: string;
    slug?: string | null;
  }): Promise<Genre> {
    return request<Genre>("/genres", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateGenre(
    id: string,
    payload: { name?: string; slug?: string | null }
  ): Promise<Genre> {
    return request<Genre>(`/genres/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteGenre(id: string): Promise<void> {
    return request<void>(`/genres/${id}`, {
      method: "DELETE",
    });
  },

  // ============================================================================
  // Estante Pessoal: Vínculos do Usuário (UserBooks)
  // ============================================================================
  async getShelf(params?: {
    q?: string;
    status?: BookStatus;
    favorite?: boolean;
    author_id?: string;
    publisher_id?: string;
    genre_id?: string;
    collection_id?: string;
    tag_id?: string;
    personal_color?: string;
    min_rating?: number;
    sort_by?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<UserBook>> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.favorite !== undefined)
      searchParams.set("favorite", params.favorite.toString());
    if (params?.author_id) searchParams.set("author_id", params.author_id);
    if (params?.publisher_id)
      searchParams.set("publisher_id", params.publisher_id);
    if (params?.genre_id) searchParams.set("genre_id", params.genre_id);
    if (params?.collection_id)
      searchParams.set("collection_id", params.collection_id);
    if (params?.tag_id) searchParams.set("tag_id", params.tag_id);
    if (params?.personal_color)
      searchParams.set("personal_color", params.personal_color);
    if (params?.min_rating !== undefined)
      searchParams.set("min_rating", params.min_rating.toString());
    if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());

    const qs = searchParams.toString();
    return request<PaginatedResult<UserBook>>(
      `/shelf${qs ? `?${qs}` : ""}`,
      {},
      true
    );
  },

  async getShelfByBookId(bookId: string): Promise<UserBook | null> {
    try {
      return await request<UserBook | null>(`/shelf/by-book/${bookId}`, {}, true);
    } catch {
      return null;
    }
  },

  async addToShelf(payload: UserBookCreateParams): Promise<UserBook> {
    return request<UserBook>(
      "/shelf",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async updateShelfBook(
    userBookId: string,
    payload: UserBookUpdateParams
  ): Promise<UserBook> {
    return request<UserBook>(
      `/shelf/${userBookId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async removeFromShelf(userBookId: string): Promise<void> {
    return request<void>(
      `/shelf/${userBookId}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  // --------------------------------------------------------------------------
  // Notas e Citações do Usuário
  // --------------------------------------------------------------------------
  async getUserNotes(userBookId: string): Promise<UserNote[]> {
    return request<UserNote[]>(`/shelf/${userBookId}/notes`, {}, true);
  },

  async createUserNote(
    userBookId: string,
    payload: {
      content: string;
      page_number?: number | null;
      chapter?: string | null;
      is_spoiler?: boolean;
    }
  ): Promise<UserNote> {
    return request<UserNote>(
      `/shelf/${userBookId}/notes`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async deleteUserNote(noteId: string): Promise<void> {
    return request<void>(
      `/shelf/notes/${noteId}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  async getUserQuotes(userBookId: string): Promise<UserQuote[]> {
    return request<UserQuote[]>(`/shelf/${userBookId}/quotes`, {}, true);
  },

  async createUserQuote(
    userBookId: string,
    payload: {
      content: string;
      page_number?: number | null;
      author_comment?: string | null;
    }
  ): Promise<UserQuote> {
    return request<UserQuote>(
      `/shelf/${userBookId}/quotes`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async deleteUserQuote(quoteId: string): Promise<void> {
    return request<void>(
      `/shelf/quotes/${quoteId}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  // ============================================================================
  // Coleções Pessoais (Collections)
  // ============================================================================
  async getCollections(params?: {
    is_public?: boolean;
  }): Promise<Collection[]> {
    const searchParams = new URLSearchParams();
    if (params?.is_public !== undefined) {
      searchParams.set("is_public", params.is_public.toString());
    }
    const qs = searchParams.toString();
    return request<Collection[]>(
      `/shelf/collections${qs ? `?${qs}` : ""}`,
      {},
      true
    );
  },

  async getCollection(id: string): Promise<Collection> {
    return request<Collection>(`/shelf/collections/${id}`, {}, true);
  },

  async createCollection(
    payload: CollectionCreateParams
  ): Promise<Collection> {
    return request<Collection>(
      "/shelf/collections",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async updateCollection(
    id: string,
    payload: CollectionUpdateParams
  ): Promise<Collection> {
    return request<Collection>(
      `/shelf/collections/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async deleteCollection(id: string): Promise<void> {
    return request<void>(
      `/shelf/collections/${id}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  async reorderCollections(collectionIds: string[]): Promise<Collection[]> {
    return request<Collection[]>(
      "/shelf/collections/reorder",
      {
        method: "PUT",
        body: JSON.stringify({ collection_ids: collectionIds }),
      },
      true
    );
  },

  async addBookToCollection(
    collectionId: string,
    userBookId: string
  ): Promise<void> {
    return request<void>(
      `/shelf/collections/${collectionId}/books/${userBookId}`,
      {
        method: "POST",
      },
      true
    );
  },

  async removeBookFromCollection(
    collectionId: string,
    userBookId: string
  ): Promise<void> {
    return request<void>(
      `/shelf/collections/${collectionId}/books/${userBookId}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  // ============================================================================
  // Tags Pessoais (User Tags)
  // ============================================================================
  async getUserTags(): Promise<UserTag[]> {
    return request<UserTag[]>("/shelf/tags", {}, true);
  },

  async createUserTag(payload: UserTagCreateParams): Promise<UserTag> {
    return request<UserTag>(
      "/shelf/tags",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async updateUserTag(
    id: string,
    payload: UserTagUpdateParams
  ): Promise<UserTag> {
    return request<UserTag>(
      `/shelf/tags/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async deleteUserTag(id: string): Promise<void> {
    return request<void>(
      `/shelf/tags/${id}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  async setUserBookTags(
    userBookId: string,
    tagIds: string[]
  ): Promise<UserTag[]> {
    return request<UserTag[]>(
      `/shelf/${userBookId}/tags`,
      {
        method: "PUT",
        body: JSON.stringify(tagIds),
      },
      true
    );
  },

  // ============================================================================
  // Dashboard Analítico & Estatísticas Agregadas
  // ============================================================================
  async getDashboard(): Promise<DashboardSummary> {
    return request<DashboardSummary>("/shelf/dashboard", {}, true);
  },

  // ============================================================================
  // Sessões e Fluxo de Leitura (Reading Sessions & Overview)
  // ============================================================================
  async getReadingOverview(): Promise<ReadingOverview> {
    return request<ReadingOverview>("/shelf/reading/overview", {}, true);
  },

  async getActiveReadings(): Promise<UserBook[]> {
    return request<UserBook[]>("/shelf/reading/active", {}, true);
  },

  async getReadingSessions(params?: {
    userBookId?: string;
    limit?: number;
  }): Promise<ReadingSession[]> {
    const limit = params?.limit || 50;
    if (params?.userBookId) {
      return request<ReadingSession[]>(
        `/shelf/${params.userBookId}/sessions?limit=${limit}`,
        {},
        true
      );
    }
    return request<ReadingSession[]>(
      `/shelf/sessions?limit=${limit}`,
      {},
      true
    );
  },

  async createReadingSession(
    userBookId: string,
    payload: ReadingSessionCreateParams
  ): Promise<ReadingSession> {
    return request<ReadingSession>(
      `/shelf/${userBookId}/sessions`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async deleteReadingSession(sessionId: string): Promise<void> {
    return request<void>(
      `/shelf/sessions/${sessionId}`,
      {
        method: "DELETE",
      },
      true
    );
  },

  // ============================================================================
  // Armazenamento Cloudflare R2: Upload e Remoção
  // ============================================================================
  async uploadFile(
    file: File,
    folder: "covers" | "avatars" | "documents" = "covers"
  ): Promise<FileUploadResult> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}/storage/upload?folder=${folder}`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      let errorMessage = `Erro ao enviar arquivo (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Ignora erro de parsing
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async deleteFile(keyOrUrl: string): Promise<void> {
    const encoded = encodeURIComponent(keyOrUrl);
    return request<void>(
      `/storage/file?key_or_url=${encoded}`,
      {
        method: "DELETE",
      },
      true
    );
  },
};
