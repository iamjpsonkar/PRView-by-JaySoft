"""Tests for webhook endpoints: CRUD and event validation."""


def test_create_webhook(client):
    resp = client.post("/api/webhooks", json={
        "url": "https://example.com/webhook",
        "events": ["pr.created", "comment.created"],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["url"] == "https://example.com/webhook"
    assert set(data["events"]) == {"pr.created", "comment.created"}
    assert data["active"] is True


def test_create_webhook_wildcard(client):
    resp = client.post("/api/webhooks", json={
        "url": "https://example.com/all-events",
        "events": ["*"],
    })
    assert resp.status_code == 201
    assert "*" in resp.json()["events"]


def test_create_webhook_invalid_event(client):
    resp = client.post("/api/webhooks", json={
        "url": "https://example.com/bad",
        "events": ["invalid.event"],
    })
    assert resp.status_code in (400, 422)


def test_list_webhooks(client):
    resp = client.get("/api/webhooks")
    assert resp.status_code == 200
    webhooks = resp.json()
    assert isinstance(webhooks, list)
    assert len(webhooks) >= 1
    for wh in webhooks:
        assert "id" in wh
        assert "url" in wh
        assert "events" in wh
        assert "active" in wh


def test_delete_webhook(client):
    # Create one to delete
    create_resp = client.post("/api/webhooks", json={
        "url": "https://example.com/to-delete",
        "events": ["pr.created"],
    })
    wh_id = create_resp.json()["id"]

    resp = client.delete(f"/api/webhooks/{wh_id}")
    assert resp.status_code == 200

    # Verify deleted
    webhooks = client.get("/api/webhooks").json()
    assert not any(wh["id"] == wh_id for wh in webhooks)


def test_create_webhook_with_secret(client):
    resp = client.post("/api/webhooks", json={
        "url": "https://example.com/secret",
        "events": ["review.created"],
        "secret": "my-secret-key",
    })
    assert resp.status_code == 201
