#!/usr/bin/env python3
"""YouTube OAuth2 device flow - get token to access full playlist."""
import json, urllib.request, time, sys, os

CLIENT_SECRET = '/home/openclaw/.openclaw/credentials/youtube-oauth-client.json'
TOKEN_FILE = '/home/openclaw/.openclaw/credentials/youtube-token.json'

with open(CLIENT_SECRET) as f:
    client = json.load(f)['installed']

client_id = client['client_id']
client_secret = client['client_secret']
token_uri = client['token_uri']
SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

# Step 1: Get device code
print("🔄 Getting device code...")
req = urllib.request.Request(
    'https://oauth2.googleapis.com/device/code',
    data=urllib.parse.urlencode({
        'client_id': client_id,
        'scope': ' '.join(SCOPES),
    }).encode(),
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)
with urllib.request.urlopen(req) as r:
    device_data = json.loads(r.read())

print(f"\n🔑 Code: {device_data['user_code']}")
print(f"🔗 Link: {device_data['verification_url']}")
print(f"\n⏳ Bấm link, đăng nhập, nhập code này rồi approve...")
print(f"   Hết hạn sau: {device_data['expires_in']} giây")

# Save device code info for polling
with open(TOKEN_FILE, 'w') as f:
    json.dump({'device_info': device_data}, f)

print("\n📦 Đã lưu thông tin device. Vy sẽ poll cho đến khi anh approve...")
