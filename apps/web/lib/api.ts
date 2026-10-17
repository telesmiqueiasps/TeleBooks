import type {
  Author,
  Book,
  BookImportConfirmRequest,
  BookImportConfirmResponse,
  BookSearchQueryParams,
  BookStatus,
  Collection,
  CoverOption,
  DashboardSummary,
  ExternalBookItem,
  Genre,
  Publisher,
  ReadingOverview,
  ReadingSession,
  UserBook,
  UserNote,
  UserQuote,
  UserTag,
  FeedAuthor,
  FeedBook,
  FeedComment,
  FeedCommentCreateParams,
  FeedLikeResult,
  FeedPost,
  FeedPostCreateParams,
  NotificationItem,
  NotificationListResponse,
  BookSubmission,
  BookSubmissionCreate,
  BookSubmissionReview,
  BookSubmissionUpdate,
  Profile,
  ProfileUpdateParams,
  UserSearchItem,
  FollowActionResponse,
  FollowUserItem,
  FollowRequestItem,
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
  publisher_name?: string | null;
  author_ids?: string[];
  author_names?: string[];
  author_name?: string | null;
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
      } else if (errorData?.detail) {
        errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
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

  async createBook(
    payload: BookCreateParams,
    options?: { add_to_shelf?: boolean; shelf_status?: string }
  ): Promise<Book> {
    const searchParams = new URLSearchParams();
    if (options?.add_to_shelf !== undefined) {
      searchParams.set("add_to_shelf", String(options.add_to_shelf));
    }
    if (options?.shelf_status) {
      searchParams.set("shelf_status", options.shelf_status);
    }
    const qs = searchParams.toString();
    return request<Book>(`/books${qs ? `?${qs}` : ""}`, {
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
  // Integração Externa: Busca Bibliográfica & Importação (Google Books, Open Library)
  // ============================================================================
  async searchExternalBooks(
    params: BookSearchQueryParams
  ): Promise<ExternalBookItem[]> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set("q", params.q);
    if (params.title) searchParams.set("title", params.title);
    if (params.author) searchParams.set("author", params.author);
    if (params.isbn) searchParams.set("isbn", params.isbn);
    if (params.provider) searchParams.set("provider", params.provider);
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    return request<ExternalBookItem[]>(
      `/books/search/external${qs ? `?${qs}` : ""}`,
      {},
      true
    );
  },

  async confirmImportBook(
    payload: BookImportConfirmRequest
  ): Promise<BookImportConfirmResponse> {
    return request<BookImportConfirmResponse>(
      "/books/import/confirm",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async syncMissingCovers(): Promise<{
    total_checked: number;
    updated: number;
    message: string;
  }> {
    return request<{
      total_checked: number;
      updated: number;
      message: string;
    }>("/books/sync-covers", {
      method: "POST",
    });
  },

  async searchCoverOptions(params: {
    isbn?: string;
    title?: string;
    author?: string;
  }): Promise<CoverOption[]> {
    const searchParams = new URLSearchParams();
    if (params.isbn) searchParams.set("isbn", params.isbn);
    if (params.title) searchParams.set("title", params.title);
    if (params.author) searchParams.set("author", params.author);
    const qs = searchParams.toString();
    return request<CoverOption[]>(`/books/covers/search-options${qs ? `?${qs}` : ""}`);
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

  // =========================================================================
  // Feed Público Literário (MVP)
  // =========================================================================
  async getFeed(page: number = 1, pageSize: number = 20): Promise<PaginatedResult<FeedPost>> {
    try {
      return await request<PaginatedResult<FeedPost>>(
        `/feed?page=${page}&page_size=${pageSize}`,
        {},
        false
      );
    } catch {
      // Fallback resiliente via Supabase client direto
      const supabase = createClient();
      const offset = (page - 1) * pageSize;
      const { data: { user } } = await supabase.auth.getUser();

      const { data: posts, count, error } = await supabase
        .from("feed_posts")
        .select(`
          id,
          user_id,
          book_id,
          content,
          page_number,
          likes_count,
          comments_count,
          created_at,
          updated_at,
          author:profiles!feed_posts_user_id_fkey(id, username, full_name, avatar_url, is_public),
          book:books(id, title, author_name, cover_url, page_count),
          comments:feed_post_comments(
            id,
            post_id,
            user_id,
            content,
            created_at,
            author:profiles!feed_post_comments_user_id_fkey(id, username, full_name, avatar_url, is_public)
          )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      let likedPostIds = new Set<string>();
      if (user && posts && posts.length > 0) {
        const postIds = (posts as any[]).map((p) => p.id);
        const { data: likes } = await supabase
          .from("feed_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        if (likes) {
          likedPostIds = new Set((likes as any[]).map((l) => l.post_id));
        }
      }

      const items: FeedPost[] = ((posts as any[]) || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        book_id: p.book_id,
        content: p.content,
        page_number: p.page_number,
        likes_count: p.likes_count || 0,
        comments_count: p.comments_count || 0,
        has_liked: likedPostIds.has(p.id),
        created_at: p.created_at,
        updated_at: p.updated_at,
        author: p.author,
        book: p.book,
        comments: p.comments || [],
      }));

      const total = count || items.length;
      return {
        items,
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize) || 1,
      };
    }
  },

  async createFeedPost(params: FeedPostCreateParams): Promise<FeedPost> {
    try {
      return await request<FeedPost>(
        "/feed",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
        true
      );
    } catch {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      // Garante perfil público para participar do feed
      await supabase.from("profiles").update({ is_public: true }).eq("id", user.id);

      const { data: post, error } = await supabase
        .from("feed_posts")
        .insert({
          user_id: user.id,
          book_id: params.book_id || null,
          content: params.content.trim(),
          page_number: params.page_number || null,
        })
        .select(`
          id,
          user_id,
          book_id,
          content,
          page_number,
          likes_count,
          comments_count,
          created_at,
          updated_at,
          author:profiles!feed_posts_user_id_fkey(id, username, full_name, avatar_url, is_public),
          book:books(id, title, author_name, cover_url, page_count)
        `)
        .single();

      if (error) throw error;
      return {
        ...(post as any),
        has_liked: false,
        comments: [],
      };
    }
  },

  async toggleFeedLike(postId: string): Promise<FeedLikeResult> {
    try {
      return await request<FeedLikeResult>(
        `/feed/${postId}/like`,
        { method: "POST" },
        true
      );
    } catch {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: existingLike } = await supabase
        .from("feed_post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      let hasLiked = false;
      if (existingLike) {
        await supabase
          .from("feed_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        hasLiked = false;
      } else {
        await supabase
          .from("feed_post_likes")
          .insert({ post_id: postId, user_id: user.id });
        hasLiked = true;
      }

      const { data: post } = await supabase
        .from("feed_posts")
        .select("likes_count")
        .eq("id", postId)
        .single();

      return {
        post_id: postId,
        has_liked: hasLiked,
        likes_count: post?.likes_count || 0,
      };
    }
  },

  async createFeedComment(postId: string, content: string): Promise<FeedComment> {
    try {
      return await request<FeedComment>(
        `/feed/${postId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
        true
      );
    } catch {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      await supabase.from("profiles").update({ is_public: true }).eq("id", user.id);

      const { data: comment, error } = await supabase
        .from("feed_post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
        })
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          author:profiles!feed_post_comments_user_id_fkey(id, username, full_name, avatar_url, is_public)
        `)
        .single();

      if (error) throw error;
      return comment as any;
    }
  },

  async deleteFeedComment(postId: string, commentId: string): Promise<void> {
    try {
      await request<void>(`/feed/${postId}/comments/${commentId}`, { method: "DELETE" }, true);
    } catch {
      const supabase = createClient();
      await supabase.from("feed_post_comments").delete().eq("id", commentId);
    }
  },

  async deleteFeedPost(postId: string): Promise<void> {
    try {
      await request<void>(`/feed/${postId}`, { method: "DELETE" }, true);
    } catch {
      const supabase = createClient();
      const { error } = await supabase.from("feed_posts").delete().eq("id", postId);
      if (error) throw error;
    }
  },

  // =========================================================================
  // Notificações Social
  // =========================================================================
  async getNotifications(
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationListResponse> {
    try {
      return await request<NotificationListResponse>(
        `/notifications?limit=${limit}&offset=${offset}`,
        {},
        true
      );
    } catch {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { items: [], unread_count: 0, total: 0 };

      const { data: notifications, count } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          actor_id,
          type,
          post_id,
          comment_id,
          content,
          is_read,
          created_at,
          actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)
        `, { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { count: unreadCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      return {
        items: (notifications as any[]) || [],
        unread_count: unreadCount || 0,
        total: count || 0,
      };
    }
  },

  async getUnreadNotificationCount(): Promise<{ unread_count: number }> {
    try {
      return await request<{ unread_count: number }>(
        "/notifications/unread-count",
        {},
        true
      );
    } catch {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { unread_count: 0 };

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      return { unread_count: count || 0 };
    }
  },

  async markNotificationsAsRead(payload: {
    notification_ids?: string[];
    mark_all?: boolean;
  }): Promise<{ success: boolean; updated_count: number }> {
    try {
      return await request<{ success: boolean; updated_count: number }>(
        "/notifications/mark-read",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        true
      );
    } catch {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, updated_count: 0 };

      let query = supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);

      if (payload.mark_all) {
        query = query.eq("is_read", false);
      } else if (payload.notification_ids && payload.notification_ids.length > 0) {
        query = query.in("id", payload.notification_ids);
      }

      const { error } = await query;
      if (error) throw error;
      return { success: true, updated_count: 1 };
    }
  },

  // ============================================================================
  // Submissões Manuais de Livros e Moderação (Admin)
  // ============================================================================
  async createBookSubmission(payload: BookSubmissionCreate): Promise<BookSubmission> {
    try {
      return await request<BookSubmission>(
        "/book-submissions",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        true
      );
    } catch {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("book_submissions")
        .insert({
          user_id: user.id,
          title: payload.title,
          subtitle: payload.subtitle || null,
          author_names: payload.author_names,
          publisher_name: payload.publisher_name || null,
          description: payload.description || null,
          isbn13: payload.isbn13 || null,
          isbn10: payload.isbn10 || null,
          page_count: payload.page_count || null,
          cover_url: payload.cover_url || null,
          initial_shelf_status: payload.initial_shelf_status || "want_to_read",
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookSubmission;
    }
  },

  async getAdminBookSubmissions(params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<BookSubmission>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";

    try {
      return await request<PaginatedResult<BookSubmission>>(`/book-submissions${query}`, {}, true);
    } catch {
      const supabase = createClient();
      let dbQuery = supabase
        .from("book_submissions")
        .select("*, user:profiles!user_id(id, username, full_name, avatar_url)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (params?.status) {
        dbQuery = dbQuery.eq("status", params.status);
      }
      const page = params?.page || 1;
      const pageSize = params?.page_size || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await dbQuery.range(from, to);
      if (error) throw error;

      return {
        items: (data || []) as BookSubmission[],
        total: count || 0,
        page,
        page_size: pageSize,
        total_pages: Math.ceil((count || 0) / pageSize),
      };
    }
  },

  async approveBookSubmission(submissionId: string): Promise<BookSubmission> {
    return await request<BookSubmission>(`/book-submissions/${submissionId}/approve`, { method: "POST" }, true);
  },

  async updateBookSubmission(
    submissionId: string,
    payload: BookSubmissionUpdate
  ): Promise<BookSubmission> {
    try {
      return await request<BookSubmission>(
        `/book-submissions/${submissionId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        true
      );
    } catch {
      const supabase = createClient();
      const updateData: Record<string, unknown> = {};
      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.subtitle !== undefined) updateData.subtitle = payload.subtitle;
      if (payload.author_names !== undefined) updateData.author_names = payload.author_names;
      if (payload.publisher_name !== undefined) updateData.publisher_name = payload.publisher_name;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.isbn13 !== undefined) updateData.isbn13 = payload.isbn13;
      if (payload.isbn10 !== undefined) updateData.isbn10 = payload.isbn10;
      if (payload.page_count !== undefined) updateData.page_count = payload.page_count;
      if (payload.cover_url !== undefined) updateData.cover_url = payload.cover_url;
      if (payload.initial_shelf_status !== undefined) updateData.initial_shelf_status = payload.initial_shelf_status;

      const { data, error } = await supabase
        .from("book_submissions")
        .update(updateData)
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;
      return data as BookSubmission;
    }
  },

  async rejectBookSubmission(submissionId: string, reason?: string): Promise<BookSubmission> {
    return await request<BookSubmission>(
      `/book-submissions/${submissionId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ action: "reject", rejection_reason: reason }),
      },
      true
    );
  },

  // ============================================================================
  // Perfis & Comunidade (Seguidores / Seguindo)
  // ============================================================================
  async getMyProfile(): Promise<Profile> {
    return request<Profile>("/profiles/me", {}, true);
  },

  async updateMyProfile(payload: ProfileUpdateParams): Promise<Profile> {
    return request<Profile>(
      "/profiles/me",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async searchUsers(query: string, limit = 20): Promise<UserSearchItem[]> {
    const q = encodeURIComponent(query.trim());
    return request<UserSearchItem[]>(
      `/profiles/search?q=${q}&limit=${limit}`,
      {},
      true
    );
  },

  async getFollowRequests(): Promise<FollowRequestItem[]> {
    return request<FollowRequestItem[]>("/profiles/me/follow-requests", {}, true);
  },

  async acceptFollowRequest(requestId: string): Promise<FollowActionResponse> {
    return request<FollowActionResponse>(
      `/profiles/follow-requests/${requestId}/accept`,
      { method: "POST" },
      true
    );
  },

  async rejectFollowRequest(requestId: string): Promise<FollowActionResponse> {
    return request<FollowActionResponse>(
      `/profiles/follow-requests/${requestId}/reject`,
      { method: "POST" },
      true
    );
  },

  async getUserProfile(username: string): Promise<Profile> {
    return request<Profile>(
      `/profiles/${encodeURIComponent(username.trim().toLowerCase())}`,
      {},
      true
    );
  },

  async followUser(username: string): Promise<FollowActionResponse> {
    return request<FollowActionResponse>(
      `/profiles/${encodeURIComponent(username.trim().toLowerCase())}/follow`,
      { method: "POST" },
      true
    );
  },

  async unfollowUser(username: string): Promise<FollowActionResponse> {
    return request<FollowActionResponse>(
      `/profiles/${encodeURIComponent(username.trim().toLowerCase())}/unfollow`,
      { method: "POST" },
      true
    );
  },

  async getUserFollowers(username: string): Promise<FollowUserItem[]> {
    return request<FollowUserItem[]>(
      `/profiles/${encodeURIComponent(username.trim().toLowerCase())}/followers`,
      {},
      true
    );
  },

  async getUserFollowing(username: string): Promise<FollowUserItem[]> {
    return request<FollowUserItem[]>(
      `/profiles/${encodeURIComponent(username.trim().toLowerCase())}/following`,
      {},
      true
    );
  },

  async getUserPublications(
    username: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResult<FeedPost>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request<PaginatedResult<FeedPost>>(
      `/profiles/${encodeURIComponent(username.trim().toLowerCase())}/posts${query}`,
      {},
      true
    );
  },

  async getUserShelf(
    username: string,
    params?: { status?: BookStatus; page?: number; page_size?: number }
  ): Promise<PaginatedResult<UserBook>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request<PaginatedResult<UserBook>>(
      `/profiles/${encodeURIComponent(username.trim().toLowerCase())}/shelf${query}`,
      {},
      true
    );
  },
};

