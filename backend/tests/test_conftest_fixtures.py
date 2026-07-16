def test_client_hits_public_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200

def test_client_authenticates_as_overridden_user(client, test_user):
    response = client.get("/users/profile")

    assert response.status_code == 200
    assert response.json()["email"] == test_user.email
