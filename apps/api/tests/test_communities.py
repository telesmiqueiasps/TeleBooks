
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.security import CurrentUser
from app.db.session import SessionLocal
from app.models.community import (
    Community,
    CommunityMember,
    CommunityMessage,
    CommunityPoll,
    CommunityPollOption,
    CommunityPollVote,
)
from app.models.profile import Profile
from main import app


def test_communities_unauthenticated(client: TestClient):
    resp = client.get("/api/v1/communities")
    assert resp.status_code == 200  # public list is accessible unauthenticated

    resp = client.post("/api/v1/communities", json={"name": "Comunidade Teste"})
    assert resp.status_code == 401


def test_community_crud_flow(client: TestClient):
    db = SessionLocal()
    profiles = db.query(Profile).limit(2).all()
    if len(profiles) < 2:
        return  # Skip if database has fewer than 2 profiles

    owner_id = str(profiles[0].id)
    member_id = str(profiles[1].id)
    owner_profile = profiles[0]
    member_profile = profiles[1]

    community_id = None
    try:
        # Auth as owner
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=owner_id,
            email=f"{owner_profile.username}@example.com",
            username=owner_profile.username,
            role="user",
        )

        # 1. Create a public community
        comm_name = f"Clube do Livro {owner_id[:6]}"
        resp = client.post(
            "/api/v1/communities",
            json={
                "name": comm_name,
                "description": "Uma comunidade para amantes de ficção científica.",
                "is_private": False,
                "only_admins_can_post": False,
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        community_id = data["id"]
        assert data["name"] == comm_name
        assert data["my_role"] == "owner"
        assert data["members_count"] == 1
        assert data["is_private"] is False

        # 2. Auth as regular member and join
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=member_id,
            email=f"member_{member_id[:8]}@example.com",
            username=member_profile.username,
            role="user",
        )

        join_resp = client.post(f"/api/v1/communities/{community_id}/join")
        assert join_resp.status_code == 200
        assert join_resp.json()["status"] == "active"

        # 3. Post a message with a poll
        msg_resp = client.post(
            f"/api/v1/communities/{community_id}/messages",
            json={
                "content": "Qual o próximo livro do mês?",
                "poll_question": "Escolha o livro:",
                "poll_options": ["Duna", "Fundação", "Neuromancer"],
            },
        )
        assert msg_resp.status_code == 201, msg_resp.text
        msg_data = msg_resp.json()
        message_id = msg_data["id"]
        assert msg_data["is_poll"] is True
        assert len(msg_data["poll"]["options"]) == 3

        # 4. Vote on an option
        poll_id = msg_data["poll"]["id"]
        opt_id = msg_data["poll"]["options"][0]["id"]
        vote_resp = client.post(
            f"/api/v1/communities/polls/{poll_id}/vote",
            json={"option_id": opt_id},
        )
        assert vote_resp.status_code == 200
        poll_res = vote_resp.json()
        assert poll_res["total_votes"] == 1
        assert poll_res["user_voted_option_id"] == opt_id
        assert poll_res["options"][0]["percentage"] == 100.0

        # 5. Like message
        like_resp = client.post(
            f"/api/v1/communities/messages/{message_id}/like"
        )
        assert like_resp.status_code == 200
        assert like_resp.json()["liked"] is True
        assert like_resp.json()["likes_count"] == 1

        # 6. Test only_admins_can_post restriction
        # Switch back to owner and restrict posting
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=owner_id,
            email=f"owner_{owner_id[:8]}@example.com",
            username=owner_profile.username,
            role="user",
        )
        update_resp = client.patch(
            f"/api/v1/communities/{community_id}",
            json={"only_admins_can_post": True},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["only_admins_can_post"] is True

        # Switch to regular member and verify posting is forbidden (403)
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=member_id,
            email=f"member_{member_id[:8]}@example.com",
            username=member_profile.username,
            role="user",
        )
        fail_msg = client.post(
            f"/api/v1/communities/{community_id}/messages",
            json={"content": "Tentando postar sem ser admin..."},
        )
        assert fail_msg.status_code == 403

        # 7. Owner promotes member to admin
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=owner_id,
            email=f"owner_{owner_id[:8]}@example.com",
            username=owner_profile.username,
            role="user",
        )
        promote_resp = client.patch(
            f"/api/v1/communities/{community_id}/members/{member_id}/role",
            json={"role": "admin"},
        )
        assert promote_resp.status_code == 200
        assert promote_resp.json()["role"] == "admin"

        # Member now can post because they are admin!
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=member_id,
            email=f"member_{member_id[:8]}@example.com",
            username=member_profile.username,
            role="user",
        )
        success_msg = client.post(
            f"/api/v1/communities/{community_id}/messages",
            json={"content": "Agora que sou admin posso postar!"},
        )
        assert success_msg.status_code == 201

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        # Cleanup
        try:
            if community_id:
                db.query(CommunityPollVote).filter(
                    CommunityPollVote.user_id.in_([owner_id, member_id])
                ).delete(synchronize_session=False)
                db.query(CommunityPollOption).filter(
                    CommunityPollOption.poll_id.in_(
                        db.query(CommunityPoll.id).filter(
                            CommunityPoll.message_id.in_(
                                db.query(CommunityMessage.id).filter(
                                    CommunityMessage.community_id == community_id
                                )
                            )
                        )
                    )
                ).delete(synchronize_session=False)
                db.query(CommunityPoll).filter(
                    CommunityPoll.message_id.in_(
                        db.query(CommunityMessage.id).filter(
                            CommunityMessage.community_id == community_id
                        )
                    )
                ).delete(synchronize_session=False)
                db.query(CommunityMessage).filter(
                    CommunityMessage.community_id == community_id
                ).delete(synchronize_session=False)
                db.query(CommunityMember).filter(
                    CommunityMember.community_id == community_id
                ).delete(synchronize_session=False)
                db.query(Community).filter(Community.id == community_id).delete(
                    synchronize_session=False
                )
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
