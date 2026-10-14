import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import CurrentUser
from app.models.catalog import Book
from app.models.feed import FeedPost, FeedPostComment, FeedPostLike
from app.models.profile import Profile
from app.schemas.feed import (
    FeedAuthorOut,
    FeedBookOut,
    FeedCommentCreate,
    FeedCommentOut,
    FeedLikeResponse,
    FeedPostCreate,
    FeedPostOut,
)


class FeedService:
    @staticmethod
    def list_feed_posts(
        db: Session,
        current_user_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[FeedPostOut], int]:
        # Filtro: perfis públicos ou postagens do próprio usuário
        visibility_filter = Profile.is_public.is_(True)
        if current_user_id:
            visibility_filter = or_(Profile.is_public.is_(True), FeedPost.user_id == current_user_id)

        stmt = (
            select(FeedPost)
            .join(Profile, FeedPost.user_id == Profile.id)
            .where(visibility_filter)
            .options(
                selectinload(FeedPost.author),
                selectinload(FeedPost.book).selectinload(Book.authors),
                selectinload(FeedPost.comments).selectinload(FeedPostComment.author),
            )
            .order_by(FeedPost.created_at.desc())
        )

        count_stmt = (
            select(func.count(FeedPost.id))
            .join(Profile, FeedPost.user_id == Profile.id)
            .where(visibility_filter)
        )
        total = db.execute(count_stmt).scalar_one()

        offset = (page - 1) * page_size
        posts = db.execute(stmt.offset(offset).limit(page_size)).scalars().all()

        # Descobre quais posts o usuário atual curtiu
        liked_post_ids: set[uuid.UUID] = set()
        if current_user_id and posts:
            post_ids = [p.id for p in posts]
            likes_stmt = select(FeedPostLike.post_id).where(
                FeedPostLike.user_id == current_user_id,
                FeedPostLike.post_id.in_(post_ids),
            )
            liked_post_ids = set(db.execute(likes_stmt).scalars().all())

        results: list[FeedPostOut] = []
        for p in posts:
            author_out = FeedAuthorOut.model_validate(p.author)
            book_out = None
            if p.book:
                computed_author = p.book.author_name
                if not computed_author and p.book.authors:
                    computed_author = ", ".join(a.name for a in p.book.authors)
                book_out = FeedBookOut(
                    id=p.book.id,
                    title=p.book.title,
                    author_name=computed_author or "Autor desconhecido",
                    cover_url=p.book.cover_url,
                    page_count=p.book.page_count,
                )
            comments_out = [
                FeedCommentOut(
                    id=c.id,
                    post_id=c.post_id,
                    user_id=c.user_id,
                    content=c.content,
                    created_at=c.created_at,
                    author=FeedAuthorOut.model_validate(c.author) if c.author else None,
                )
                for c in (p.comments or [])
            ]

            results.append(
                FeedPostOut(
                    id=p.id,
                    user_id=p.user_id,
                    book_id=p.book_id,
                    content=p.content,
                    page_number=p.page_number,
                    likes_count=p.likes_count,
                    comments_count=p.comments_count,
                    has_liked=(p.id in liked_post_ids),
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                    author=author_out,
                    book=book_out,
                    comments=comments_out,
                )
            )

        return results, total

    @staticmethod
    def create_post(
        db: Session,
        user: CurrentUser,
        post_in: FeedPostCreate,
    ) -> FeedPostOut:
        user_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id

        profile = db.execute(
            select(Profile).where(Profile.id == user_uuid)
        ).scalar_one_or_none()

        if not profile:
            profile = Profile(
                id=user_uuid,
                username=user.username or f"leitor_{str(user_uuid)[:8]}",
                full_name=user.full_name,
                is_public=True,
            )
            db.add(profile)
            db.flush()
        elif not profile.is_public:
            profile.is_public = True
            db.flush()

        if post_in.book_id:
            book_exists = db.execute(
                select(Book.id).where(Book.id == post_in.book_id)
            ).scalar_one_or_none()
            if not book_exists:
                raise NotFoundError(f"Livro com ID '{post_in.book_id}' não encontrado.")

        post = FeedPost(
            user_id=user_uuid,
            book_id=post_in.book_id,
            content=post_in.content.strip(),
            page_number=post_in.page_number,
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        author_out = FeedAuthorOut.model_validate(profile)
        book_out = None
        if post.book_id:
            book = db.execute(
                select(Book).where(Book.id == post.book_id).options(selectinload(Book.authors))
            ).scalar_one_or_none()
            if book:
                computed_author = book.author_name
                if not computed_author and book.authors:
                    computed_author = ", ".join(a.name for a in book.authors)
                book_out = FeedBookOut(
                    id=book.id,
                    title=book.title,
                    author_name=computed_author or "Autor desconhecido",
                    cover_url=book.cover_url,
                    page_count=book.page_count,
                )

        return FeedPostOut(
            id=post.id,
            user_id=post.user_id,
            book_id=post.book_id,
            content=post.content,
            page_number=post.page_number,
            likes_count=0,
            comments_count=0,
            has_liked=False,
            created_at=post.created_at,
            updated_at=post.updated_at,
            author=author_out,
            book=book_out,
            comments=[],
        )

    @staticmethod
    def get_post_by_id(
        db: Session,
        post_id: uuid.UUID,
        current_user_id: uuid.UUID | None = None,
    ) -> FeedPostOut:
        stmt = (
            select(FeedPost)
            .join(Profile, FeedPost.user_id == Profile.id)
            .where(FeedPost.id == post_id)
            .options(
                selectinload(FeedPost.author),
                selectinload(FeedPost.book).selectinload(Book.authors),
                selectinload(FeedPost.comments).selectinload(FeedPostComment.author),
            )
        )
        post = db.execute(stmt).scalar_one_or_none()
        if not post:
            raise NotFoundError("Publicação não encontrada.")

        if not post.author.is_public and (not current_user_id or post.user_id != current_user_id):
            raise ForbiddenError("O perfil deste autor é privado.")

        has_liked = False
        if current_user_id:
            liked = db.execute(
                select(FeedPostLike.id).where(
                    FeedPostLike.post_id == post_id,
                    FeedPostLike.user_id == current_user_id,
                )
            ).scalar_one_or_none()
            has_liked = bool(liked)

        author_out = FeedAuthorOut.model_validate(post.author)
        book_out = None
        if post.book:
            computed_author = post.book.author_name
            if not computed_author and post.book.authors:
                computed_author = ", ".join(a.name for a in post.book.authors)
            book_out = FeedBookOut(
                id=post.book.id,
                title=post.book.title,
                author_name=computed_author or "Autor desconhecido",
                cover_url=post.book.cover_url,
                page_count=post.book.page_count,
            )
        comments_out = [
            FeedCommentOut(
                id=c.id,
                post_id=c.post_id,
                user_id=c.user_id,
                content=c.content,
                created_at=c.created_at,
                author=FeedAuthorOut.model_validate(c.author),
            )
            for c in post.comments
        ]

        return FeedPostOut(
            id=post.id,
            user_id=post.user_id,
            book_id=post.book_id,
            content=post.content,
            page_number=post.page_number,
            likes_count=post.likes_count,
            comments_count=post.comments_count,
            has_liked=has_liked,
            created_at=post.created_at,
            updated_at=post.updated_at,
            author=author_out,
            book=book_out,
            comments=comments_out,
        )

    @staticmethod
    def toggle_like(
        db: Session,
        user: CurrentUser,
        post_id: uuid.UUID,
    ) -> FeedLikeResponse:
        user_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id

        post = db.execute(
            select(FeedPost).where(FeedPost.id == post_id)
        ).scalar_one_or_none()
        if not post:
            raise NotFoundError(f"Publicação com ID '{post_id}' não encontrada.")

        # Ativa perfil público se não estiver para interagir
        profile = db.execute(
            select(Profile).where(Profile.id == user_uuid)
        ).scalar_one_or_none()
        if profile and not profile.is_public:
            profile.is_public = True
            db.flush()

        existing_like = db.execute(
            select(FeedPostLike).where(
                FeedPostLike.post_id == post_id,
                FeedPostLike.user_id == user_uuid,
            )
        ).scalar_one_or_none()

        if existing_like:
            db.delete(existing_like)
            has_liked = False
        else:
            new_like = FeedPostLike(post_id=post_id, user_id=user_uuid)
            db.add(new_like)
            has_liked = True

        db.commit()
        db.refresh(post)

        return FeedLikeResponse(
            post_id=post_id,
            has_liked=has_liked,
            likes_count=post.likes_count,
        )

    @staticmethod
    def create_comment(
        db: Session,
        user: CurrentUser,
        post_id: uuid.UUID,
        comment_in: FeedCommentCreate,
    ) -> FeedCommentOut:
        user_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id

        post = db.execute(
            select(FeedPost).where(FeedPost.id == post_id)
        ).scalar_one_or_none()
        if not post:
            raise NotFoundError(f"Publicação com ID '{post_id}' não encontrada.")

        profile = db.execute(
            select(Profile).where(Profile.id == user_uuid)
        ).scalar_one_or_none()
        if profile and not profile.is_public:
            profile.is_public = True
            db.flush()

        comment = FeedPostComment(
            post_id=post_id,
            user_id=user_uuid,
            content=comment_in.content.strip(),
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)

        author_out = FeedAuthorOut.model_validate(profile) if profile else None

        return FeedCommentOut(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            content=comment.content,
            created_at=comment.created_at,
            author=author_out,
        )

    @staticmethod
    def list_comments(
        db: Session,
        post_id: uuid.UUID,
    ) -> list[FeedCommentOut]:
        post = db.execute(
            select(FeedPost).where(FeedPost.id == post_id)
        ).scalar_one_or_none()
        if not post:
            raise NotFoundError(f"Publicação com ID '{post_id}' não encontrada.")

        comments = db.execute(
            select(FeedPostComment)
            .where(FeedPostComment.post_id == post_id)
            .options(selectinload(FeedPostComment.author))
            .order_by(FeedPostComment.created_at.asc())
        ).scalars().all()

        return [
            FeedCommentOut(
                id=c.id,
                post_id=c.post_id,
                user_id=c.user_id,
                content=c.content,
                created_at=c.created_at,
                author=FeedAuthorOut.model_validate(c.author) if c.author else None,
            )
            for c in comments
        ]

    @staticmethod
    def delete_post(
        db: Session,
        user: CurrentUser,
        post_id: uuid.UUID,
    ) -> None:
        user_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id

        post = db.execute(
            select(FeedPost).where(FeedPost.id == post_id)
        ).scalar_one_or_none()
        if not post:
            raise NotFoundError(f"Publicação com ID '{post_id}' não encontrada.")

        if post.user_id != user_uuid:
            raise ForbiddenError("Você só pode excluir suas próprias publicações.")

        db.delete(post)
        db.commit()
