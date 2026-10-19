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

export type FollowStatus = "self" | "following" | "requested" | "none";

export interface Profile {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_public?: boolean;
  role?: "user" | "admin";
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  books_count?: number;
  follow_status?: FollowStatus;
  can_view_content?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSearchItem {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_public: boolean;
  followers_count: number;
  follow_status: FollowStatus;
}

export interface FollowActionResponse {
  success: boolean;
  follow_status: FollowStatus;
  message: string;
}

export interface FollowUserItem {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_public: boolean;
  follow_status: FollowStatus;
  followed_at: string;
}

export interface FollowRequestItem {
  id: string;
  created_at: string;
  user: UserSearchItem;
}

export interface ProfileUpdateParams {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_public?: boolean | null;
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
  author_name?: string | null;
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

export interface GenreStat {
  id: string;
  name: string;
  slug: string;
  book_count: number;
}

export interface DashboardSummary {
  total_books: number;
  total_authors: number;
  total_publishers: number;
  read_books_count: number;
  reading_books_count: number;
  paused_books_count: number;
  want_to_read_books_count: number;
  abandoned_books_count: number;
  total_pages_read: number;
  total_sessions_count: number;
  total_reading_minutes: number;
  average_rating: number | null;
  completion_rate_percent: number;
  active_readings: UserBook[];
  recently_added_books: UserBook[];
  recent_sessions: ReadingSession[];
  top_genres: GenreStat[];
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

/** Item retornado pela camada de busca externa (Google Books, Open Library) */
export interface ExternalBookItem {
  provider: string;
  external_id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  published_date?: string | null;
  description?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  page_count?: number | null;
  language?: string | null;
  categories: string[];
  cover_url?: string | null;
  thumbnail_url?: string | null;
  candidate_covers?: string[];
  is_already_in_catalog: boolean;
  existing_book_id?: string | null;
  is_on_user_shelf: boolean;
  user_book_id?: string | null;
  user_book_status?: BookStatus | null;
}

export interface BookSearchQueryParams {
  q?: string;
  title?: string;
  author?: string;
  isbn?: string;
  provider?: "brasil_api" | "google_books" | "open_library";
  limit?: number;
}

export interface BookImportConfirmRequest {
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  description?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  page_count?: number | null;
  publication_date?: string | null;
  published_date_raw?: string | null;
  language?: string;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  genres?: string[];
  add_to_shelf?: boolean;
  shelf_status?: BookStatus;
}

export interface BookImportConfirmResponse {
  book: Book;
  reused: boolean;
  already_on_shelf: boolean;
  user_book_id?: string | null;
  message: string;
}

export interface CoverOption {
  url: string;
  thumbnail_url?: string | null;
  source: string;
  label?: string | null;
}

/** Sistemática de Feed Público */
export interface FeedAuthor {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_public: boolean;
}

export interface FeedBook {
  id: string;
  title: string;
  author_name?: string | null;
  cover_url?: string | null;
  page_count?: number | null;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: FeedAuthor | null;
}

export interface FeedPost {
  id: string;
  user_id: string;
  book_id?: string | null;
  content: string;
  page_number?: number | null;
  likes_count: number;
  comments_count: number;
  has_liked?: boolean;
  created_at: string;
  updated_at: string;
  author: FeedAuthor;
  book?: FeedBook | null;
  comments?: FeedComment[];
}

export interface FeedPostCreateParams {
  content: string;
  book_id?: string | null;
  page_number?: number | null;
}

export interface FeedCommentCreateParams {
  content: string;
}

export interface FeedLikeResult {
  post_id: string;
  has_liked: boolean;
  likes_count: number;
}

/** Sistema de Notificações */
export type NotificationType =
  | "post_like"
  | "post_comment"
  | "book_approved"
  | "book_rejected"
  | "follow"
  | "follow_request"
  | "follow_accepted";

export interface NotificationActor {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  post_id?: string | null;
  comment_id?: string | null;
  book_id?: string | null;
  content?: string | null;
  is_read: boolean;
  created_at: string;
  actor?: NotificationActor | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
  total: number;
}

/** Sistema de Submissão Manual e Moderação de Livros */
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface BookSubmission {
  id: string;
  user_id: string;
  title: string;
  subtitle?: string | null;
  author_names: string[];
  publisher_name?: string | null;
  description?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  page_count?: number | null;
  cover_url?: string | null;
  initial_shelf_status?: BookStatus;
  status: SubmissionStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_book_id?: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile | null;
}

export interface BookSubmissionCreate {
  title: string;
  subtitle?: string | null;
  author_names: string[];
  publisher_name?: string | null;
  description?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  page_count?: number | null;
  cover_url?: string | null;
  initial_shelf_status?: BookStatus;
}

export interface BookSubmissionUpdate {
  title?: string;
  subtitle?: string | null;
  author_names?: string[];
  publisher_name?: string | null;
  description?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  page_count?: number | null;
  cover_url?: string | null;
  initial_shelf_status?: BookStatus;
}

export interface BookSubmissionReview {
  action: "approve" | "reject";
  rejection_reason?: string | null;
}

// ============================================================================
// Rabiscos (Stories Efêmeros de 24h)
// ============================================================================

export type RabiscoBackground =
  | "gradient-blue"
  | "gradient-purple"
  | "gradient-sunset"
  | "gradient-emerald"
  | "gradient-amber"
  | "gradient-rose"
  | "paper-dark"
  | "classic-slate";

export type RabiscoFontStyle = "sans" | "serif" | "mono" | "handwriting";

export interface RabiscoAuthor {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface Rabisco {
  id: string;
  user_id: string;
  content: string;
  background_style: RabiscoBackground | string;
  font_style: RabiscoFontStyle | string;
  created_at: string;
  expires_at: string;
  author: RabiscoAuthor;
  views_count: number;
  has_viewed: boolean;
}

export interface RabiscoUserGroup {
  user_id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  has_unseen: boolean;
  latest_created_at: string;
  rabiscos: Rabisco[];
}

export interface CreateRabiscoInput {
  content: string;
  background_style?: RabiscoBackground | string;
  font_style?: RabiscoFontStyle | string;
}



