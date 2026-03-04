"""Tests for label endpoints: CRUD, PR association."""


def test_list_default_labels(client):
    resp = client.get("/api/labels")
    assert resp.status_code == 200
    labels = resp.json()
    assert isinstance(labels, list)
    assert len(labels) >= 5  # seeded defaults
    names = [l["name"] for l in labels]
    assert "bug" in names
    assert "feature" in names


def test_create_label(client):
    resp = client.post("/api/labels", json={
        "name": "test-label",
        "color": "#ff0000",
        "description": "A test label",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test-label"
    assert data["color"] == "#ff0000"
    assert data["description"] == "A test label"


def test_create_duplicate_label(client):
    resp = client.post("/api/labels", json={
        "name": "test-label",
        "color": "#00ff00",
    })
    # Should fail because name is unique
    assert resp.status_code in (400, 409, 500)


def test_add_label_to_pr(client, repo_id, pr_id):
    # Get the "bug" label id
    labels = client.get("/api/labels").json()
    bug_label = next(l for l in labels if l["name"] == "bug")

    resp = client.post(
        f"/api/repos/{repo_id}/prs/{pr_id}/labels",
        json={"label_id": bug_label["id"]},
    )
    assert resp.status_code == 200

    # Verify label appears on PR
    pr = client.get(f"/api/repos/{repo_id}/prs/{pr_id}").json()
    label_names = [l["name"] for l in pr["labels"]]
    assert "bug" in label_names


def test_remove_label_from_pr(client, repo_id, pr_id):
    labels = client.get("/api/labels").json()
    bug_label = next(l for l in labels if l["name"] == "bug")

    resp = client.delete(f"/api/repos/{repo_id}/prs/{pr_id}/labels/{bug_label['id']}")
    assert resp.status_code == 200

    # Verify label removed
    pr = client.get(f"/api/repos/{repo_id}/prs/{pr_id}").json()
    label_names = [l["name"] for l in pr["labels"]]
    assert "bug" not in label_names


def test_filter_prs_by_label(client, repo_id, pr_id):
    # Add a label first
    labels = client.get("/api/labels").json()
    feature_label = next(l for l in labels if l["name"] == "feature")
    client.post(f"/api/repos/{repo_id}/prs/{pr_id}/labels", json={"label_id": feature_label["id"]})

    # Filter
    resp = client.get(f"/api/repos/{repo_id}/prs", params={"label": "feature"})
    assert resp.status_code == 200
    prs = resp.json()
    assert len(prs) >= 1
    for pr in prs:
        assert any(l["name"] == "feature" for l in pr["labels"])


def test_delete_label(client):
    labels = client.get("/api/labels").json()
    test_label = next((l for l in labels if l["name"] == "test-label"), None)
    if test_label:
        resp = client.delete(f"/api/labels/{test_label['id']}")
        assert resp.status_code == 200
