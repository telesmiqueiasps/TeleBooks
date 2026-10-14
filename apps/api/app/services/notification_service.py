import uuid

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload

from app.core.security import CurrentUser
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationActorOut,
    NotificationListOut,
    NotificationMarkReadRequest,
    NotificationOut,
)


class NotificationService:
    @staticmethod
    def list_notifications(
        db: Session,
        user: CurrentUser,
        limit: int = 50,
        offset: int = 0,
    ) -> NotificationListOut:
        user_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id

        stmt = (
            select(Notification)
            .where(Notification.user_id == user_uuid)
            .options(selectinload(Notification.actor))
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        notifications = list(db.execute(stmt).scalars().all())

        unread_stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user_uuid,
            Notification.is_read.is_(False),
        )
        unread_count = db.execute(unread_stmt).scalar_one()

        total_stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user_uuid
        )
        total = db.execute(total_stmt).scalar_one()

        items = [
            NotificationOut(
                id=n.id,
                user_id=n.user_id,
                actor_id=n.actor_id,
                type=n.type,
                post_id=n.post_id,
                comment_id=n.comment_id,
                content=n.content,
                is_read=n.is_read,
                created_at=n.created_at,
                actor=NotificationActorOut.model_validate(n.actor) if n.actor else None,
            )
            for n in notifications
        ]

        return NotificationListOut(
            items=items,
            unread_count=unread_count,
            total=total,
        )

    @staticmethod
    def get_unread_count(db: Session, user: CurrentUser) -> int:
        user_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id
        stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user_uuid,
            Notification.is_read.is_(False),
        )
        return db.execute(stmt).scalar_one()

    @staticmethod
    def mark_as_read(
        db: Session,
        user: CurrentUser,
        payload: NotificationMarkReadRequest,
    ) -> int:
        user_uuid = uuid.UUID(user.id) if isinstance(user.id, str) else user.id

        if payload.mark_all:
            stmt = (
                update(Notification)
                .where(Notification.user_id == user_uuid, Notification.is_read.is_(False))
                .values(is_read=True)
            )
            result = db.execute(stmt)
            db.commit()
            return result.rowcount
        elif payload.notification_ids:
            stmt = (
                update(Notification)
                .where(
                    Notification.user_id == user_uuid,
                    Notification.id.in_(payload.notification_ids),
                )
                .values(is_read=True)
            )
            result = db.execute(stmt)
            db.commit()
            return result.rowcount

        return 0
