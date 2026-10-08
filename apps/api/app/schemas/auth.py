from pydantic import BaseModel

from app.core.security import CurrentUser
from app.schemas.profile import ProfileRead


class UserMeResponse(BaseModel):
    user: CurrentUser
    profile: ProfileRead | None = None
