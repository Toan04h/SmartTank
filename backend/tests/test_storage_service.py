import uuid
from app.services.storage_service import generate_upload_url, generate_download_url

# Presigned URL generation is a local HMAC signing operation (no network call),
# so these exercise the real boto3 client rather than mocking it.

def test_generate_upload_url_object_key_format():
    trip_id = uuid.uuid4()

    result = generate_upload_url(trip_id)

    assert result["object_key"] == f"trips/{trip_id}/route.png"

def test_generate_upload_url_is_signed():
    # Which signature scheme boto3 picks (SigV2's "Signature=" vs SigV4's
    # "X-Amz-Signature=") depends on the client's region/credential config,
    # so assert on the substring both schemes share rather than the full name.
    result = generate_upload_url(uuid.uuid4())

    assert result["upload_url"].startswith("https://")
    assert "Signature=" in result["upload_url"]
    assert "Expires" in result["upload_url"]

def test_generate_download_url_includes_object_key_and_is_signed():
    url = generate_download_url("trips/abc/route.png")

    assert url.startswith("https://")
    assert "trips/abc/route.png" in url
    assert "Signature=" in url
    assert "Expires" in url
