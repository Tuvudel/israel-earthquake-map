#!/usr/bin/env python3
"""
Google Drive utilities for uploading earthquake data files.

Provides:
- authenticate_service_account(): authenticate with Google Drive API
- upload_file_to_drive(): upload/update file in specific Drive folder
- make_file_public(): make uploaded file publicly accessible
"""

import json
import os
from pathlib import Path
from typing import Optional

from google.auth import default
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload


def authenticate_service_account(credentials_json: str) -> tuple:
    """
    Authenticate with Google Drive API using service account credentials.
    
    Args:
        credentials_json: JSON string containing service account credentials
        
    Returns:
        Tuple of (credentials, service) for Google Drive API
    """
    try:
        # Parse credentials from JSON string
        credentials_info = json.loads(credentials_json)
        
        # Create credentials object
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=['https://www.googleapis.com/auth/drive']
        )
        
        # Build the Drive service
        service = build('drive', 'v3', credentials=credentials)
        
        print("✓ Successfully authenticated with Google Drive API")
        return credentials, service
        
    except Exception as e:
        print(f"✗ Error authenticating with Google Drive: {e}")
        raise


def find_or_create_folder(service, folder_name: str = "Israel-Earthquake-Map") -> str:
    """
    Find the target folder in Google Drive, create if it doesn't exist.
    
    Args:
        service: Google Drive service object
        folder_name: Name of the folder to find/create
        
    Returns:
        Folder ID string
    """
    try:
        # Search for existing folder
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        files = results.get('files', [])
        
        if files:
            folder_id = files[0]['id']
            print(f"✓ Found existing folder '{folder_name}' (ID: {folder_id})")
            return folder_id
        else:
            # Create new folder
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            folder = service.files().create(body=folder_metadata, fields='id').execute()
            folder_id = folder.get('id')
            print(f"✓ Created new folder '{folder_name}' (ID: {folder_id})")
            return folder_id
            
    except Exception as e:
        print(f"✗ Error finding/creating folder: {e}")
        raise


def upload_file_to_drive(service, file_path: str, folder_id: str, filename: str = "all_EQ_cleaned.csv") -> Optional[str]:
    """
    Upload file to Google Drive folder, update if it already exists.
    
    Args:
        service: Google Drive service object
        file_path: Local path to the file
        folder_id: Google Drive folder ID
        filename: Name for the file in Drive
        
    Returns:
        File ID string if successful, None if failed
    """
    try:
        # Check if file already exists in the folder
        query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        existing_files = results.get('files', [])
        
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }
        
        # Create media upload object
        media = MediaFileUpload(file_path, resumable=True)
        
        if existing_files:
            # Update existing file
            file_id = existing_files[0]['id']
            file = service.files().update(
                fileId=file_id,
                media_body=media,
                fields='id'
            ).execute()
            print(f"✓ Updated existing file '{filename}' (ID: {file_id})")
        else:
            # Create new file
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            file_id = file.get('id')
            print(f"✓ Uploaded new file '{filename}' (ID: {file_id})")
        
        return file_id
        
    except Exception as e:
        print(f"✗ Error uploading file to Drive: {e}")
        return None


def make_file_public(service, file_id: str) -> bool:
    """
    Make a Google Drive file publicly accessible.
    
    Args:
        service: Google Drive service object
        file_id: Google Drive file ID
        
    Returns:
        True if successful, False if failed
    """
    try:
        # Create public permission
        permission = {
            'type': 'anyone',
            'role': 'reader'
        }
        
        service.permissions().create(
            fileId=file_id,
            body=permission,
            fields='id'
        ).execute()
        
        print(f"✓ Made file publicly accessible (ID: {file_id})")
        return True
        
    except Exception as e:
        print(f"✗ Error making file public: {e}")
        return False


def upload_earthquake_data_to_drive(file_path: str, credentials_json: str) -> bool:
    """
    Main function to upload earthquake data to Google Drive.
    
    Args:
        file_path: Path to the GeoJSON file
        credentials_json: JSON string containing service account credentials
        
    Returns:
        True if successful, False if failed
    """
    try:
        print("🌐 Starting Google Drive upload...")
        
        # Authenticate
        credentials, service = authenticate_service_account(credentials_json)
        
        # Find or create target folder
        folder_id = find_or_create_folder(service)
        
        # Upload file
        file_id = upload_file_to_drive(service, file_path, folder_id)
        if not file_id:
            print("⚠️ File upload failed")
            return False
        
        # Make file public
        if not make_file_public(service, file_id):
            print("⚠️ Failed to make file public, but upload succeeded")
            # Don't fail the entire process for this
        
        print("✅ Google Drive upload completed successfully")
        return True
        
    except Exception as e:
        print(f"⚠️ Google Drive upload failed: {e}")
        return False
