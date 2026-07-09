import boto3 
import uuid
from app.core.config import settings

s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_S3_REGION
)

def generate_upload_url(trip_id: uuid.UUID) -> dict:
    # Build a unique object key - where the file lives in the bucket
    object_key = f"trips/{trip_id}/route.png"
    
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.AWS_S3_BUCKET,
            "Key": object_key,
            "ContentType": "image/png",
        },
        ExpiresIn=300,
    )
    
    return {
        "upload_url": url,
        "object_key": object_key
    }
    
def generate_download_url(object_key: str) -> str:
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.AWS_S3_BUCKET,
            "Key": object_key,
        },
        ExpiresIn=3600,
    )
    
    return url
    