import uuid
from app.services.storage_service import generate_upload_url, generate_download_url

# Presigned URL generation is a local HMAC signing operation (no network call),
# so these exercise the real boto3 client rather than mocking it.

def test_generate_upload_url_object_key_format():
    trip_id = uuid.uuid4()

    result = generate_upload_url(trip_id)

    assert result["object_key"] == f"trips/{trip_id}/route.png"

def test_generate_upload_url_is_signed_with_five_minute_expiry():
    result = generate_upload_url(uuid.uuid4())

    assert result["upload_url"].startswith("https://")
    assert "X-Amz-Signature=" in result["upload_url"]
    assert "X-Amz-Expires=300" in result["upload_url"]

def test_generate_download_url_includes_object_key_and_one_hour_expiry():
    url = generate_download_url("trips/abc/route.png")

    assert url.startswith("https://")
    assert "trips/abc/route.png" in url
    assert "X-Amz-Signature=" in url
    assert "X-Amz-Expires=3600" in url
