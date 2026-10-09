/**
 * TeleBooks - Tipos TypeScript Compartilhados
 * Baseado na especificação de domínio e modelo de dados (Seções 7, 8 e 9)
 */

export type BookStatus =
  | "want_to_read"
  | "reading"
  | "read"
  | "paused"
  | "abandoned";

export interface Profile {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  name: string;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Publisher {
  id: string;
  name: string;
  website?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

/** Entidade Bibliográfica Global */
export interface Book {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  language?: string | null;
  page_count?: number | null;
  publication_date?: string | null;
  publisher_id?: string | null;
  publisher?: Publisher | null;
  authors?: Author[];
  genres?: Genre[];
  cover_url?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
}

/** Vínculo Pessoal do Usuário com um Livro */
export interface UserBook {
  id: string;
  user_id: string;
  book_id: string;
  book?: Book;
  status: BookStatus;
  rating?: number | null;
  owned: boolean;
  favorite: boolean;
  purchase_date?: string | null;
  purchase_price?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  current_page: number;
  personal_color?: string | null;
  shelf_position?: number | null;
  private_notes?: string | null;
  tags?: UserTag[];
  collections?: Collection[];
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_public: boolean;
  position?: number;
  book_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BookEdition {
  id: string;
  book_id: string;
  title?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  publisher_id?: string | null;
  edition_number?: number | null;
  format: "paperback" | "hardcover" | "ebook" | "audiobook" | "other";
  page_count?: number | null;
  published_date?: string | null;
  cover_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserTag {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
  created_at: string;
}

export interface ReadingSession {
  id: string;
  user_book_id: string;
  user_id: string;
  start_page: number;
  end_page: number;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
  book_title?: string | null;
  book_cover_url?: string | null;
  book_total_pages?: number | null;
  created_at: string;
}

export interface ReadingOverview {
  currently_reading_count: number;
  paused_count: number;
  read_count: number;
  want_to_read_count: number;
  total_pages_read: number;
  total_sessions_count: number;
  recent_sessions: ReadingSession[];
  active_books: UserBook[];
}

export interface UserNote {
  id: string;
  user_book_id: string;
  user_id: string;
  page_number?: number | null;
  chapter?: string | null;
  content: string;
  is_spoiler: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserQuote {
  id: string;
  user_book_id: string;
  user_id: string;
  page_number?: number | null;
  content: string;
  author_comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserReview {
  id: string;
  user_book_id: string;
  book_id: string;
  user_id: string;
  rating?: number | null;
  title?: string | null;
  content: string;
  contains_spoilers: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadingList {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadingListBook {
  id: string;
  list_id: string;
  book_id: string;
  book?: Book;
  position: number;
  added_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiErrorResponse {
  detail: string;
  code?: string;
}
