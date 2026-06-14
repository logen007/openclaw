#!/usr/bin/env python3
"""Try to enable YouTube Data API and set up OAuth via Google Cloud API."""
import json, urllib.request, sys

# Load existing service account
with open('/home/openclaw/.openclaw/credentials/google-service-account.json') as f:
    sa = json.load(f)

# We need to enable YouTube Data API for this project
# First check if it's already enabled
PROJECT_ID = sa['project_id']
print(f"📋 Project: {PROJECT_ID}")

# We need to use the service account to enable APIs
# But service accounts need the Service Usage Admin role to enable APIs
# Let me try anyway

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/cloud-platform']
creds = service_account.Credentials.from_service_account_file(
    '/home/openclaw/.openclaw/credentials/google-service-account.json',
    scopes=SCOPES
)

try:
    service = build('serviceusage', 'v1', credentials=creds)
    name = f'projects/{PROJECT_ID}/services/youtube.googleapis.com'
    request = service.services().get(name=name)
    result = request.execute()
    print(f"✅ YouTube API state: {result.get('state', 'unknown')}")
except Exception as e:
    print(f"❌ Cannot check/enable API: {e}")
    print("\nVy cần anh giúp 1 tí:")
