"""
Cloud/Local storage abstraction layer.
Handles file operations for both local filesystem and Google Cloud Storage.
"""

import json
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Optional


class StorageProvider(ABC):
    """Abstract base class for storage providers"""

    @abstractmethod
    def read_json(self, file_path: str) -> Optional[Dict]:
        """Read JSON file and return parsed content"""
        pass

    @abstractmethod
    def write_json(self, file_path: str, data: Dict) -> bool:
        """Write data to JSON file"""
        pass

    @abstractmethod
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists"""
        pass

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        pass

    @abstractmethod
    def list_files(self, directory: str) -> list:
        """List files in directory"""
        pass


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider"""

    def read_json(self, file_path: str) -> Optional[Dict]:
        """Read JSON file from local filesystem"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return None

    def write_json(self, file_path: str, data: Dict) -> bool:
        """Write JSON file to local filesystem"""
        try:
            # Ensure directory exists
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return False

    def file_exists(self, file_path: str) -> bool:
        """Check if file exists locally"""
        return Path(file_path).exists()

    def delete_file(self, file_path: str) -> bool:
        """Delete local file"""
        try:
            Path(file_path).unlink()
            return True
        except Exception as e:
            print(f"Error deleting {file_path}: {e}")
            return False

    def list_files(self, directory: str) -> list:
        """List files in local directory"""
        try:
            path = Path(directory)
            if not path.exists():
                return []
            return [f.name for f in path.glob("*.json")]
        except Exception as e:
            print(f"Error listing {directory}: {e}")
            return []


class CloudStorageProvider(StorageProvider):
    """Google Cloud Storage provider"""

    def __init__(self, bucket_name: str):
        """Initialize GCS client"""
        self.bucket_name = bucket_name
        try:
            from google.cloud import storage

            self.client = storage.Client()
            self.bucket = self.client.bucket(bucket_name)
        except ImportError:
            raise ImportError(
                "google-cloud-storage not installed. "
                "Install it with: pip install google-cloud-storage"
            )
        except Exception as e:
            raise Exception(f"Failed to initialize Cloud Storage: {e}")

    def read_json(self, file_path: str) -> Optional[Dict]:
        """Read JSON file from Cloud Storage"""
        try:
            blob = self.bucket.blob(file_path)
            if not blob.exists():
                return None
            content = blob.download_as_string()
            return json.loads(content)
        except Exception as e:
            print(f"Error reading {file_path} from GCS: {e}")
            return None

    def write_json(self, file_path: str, data: Dict) -> bool:
        """Write JSON file to Cloud Storage"""
        try:
            blob = self.bucket.blob(file_path)
            content = json.dumps(data, ensure_ascii=False, indent=2)
            blob.upload_from_string(content, content_type="application/json")
            return True
        except Exception as e:
            print(f"Error writing {file_path} to GCS: {e}")
            return False

    def file_exists(self, file_path: str) -> bool:
        """Check if file exists in Cloud Storage"""
        try:
            blob = self.bucket.blob(file_path)
            return blob.exists()
        except Exception as e:
            print(f"Error checking existence of {file_path}: {e}")
            return False

    def delete_file(self, file_path: str) -> bool:
        """Delete file from Cloud Storage"""
        try:
            blob = self.bucket.blob(file_path)
            blob.delete()
            return True
        except Exception as e:
            print(f"Error deleting {file_path} from GCS: {e}")
            return False

    def list_files(self, directory: str) -> list:
        """List files in Cloud Storage directory"""
        try:
            blobs = self.client.list_blobs(
                self.bucket_name, prefix=directory, delimiter="/"
            )
            return [blob.name.split("/")[-1] for blob in blobs if blob.name.endswith(".json")]
        except Exception as e:
            print(f"Error listing {directory} in GCS: {e}")
            return []


def get_storage_provider() -> StorageProvider:
    """Factory function to get appropriate storage provider based on environment"""
    environment = os.getenv("ENVIRONMENT", "local").lower()

    if environment == "cloud":
        bucket_name = os.getenv("GCS_BUCKET_NAME")
        if not bucket_name:
            raise ValueError(
                "GCS_BUCKET_NAME environment variable not set for cloud environment"
            )
        return CloudStorageProvider(bucket_name)
    else:
        return LocalStorageProvider()
