#!/usr/bin/env python3
"""Create new Karaoke PlayList sheet with user's OAuth credentials."""
import json, urllib.request, urllib.parse, unicodedata, time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import AuthorizedSession

# 1. Exchange auth code for tokens
AUTH_CODE = '4/0AdkVLPwQeP3NgpVTjObGUVc0SZq_4fJp1fErhfNYz4qEzKNp8aBEtJuyjwAJvzOb-2ZICg'
REDIRECT_URI = 'http://localhost:8080/'

with open('/home/openclaw/.openclaw/credentials/youtube-oauth-client.json') as f:
    client = json.loads(f.read())['installed']

data = urllib.parse.urlencode({
    'code': AUTH_CODE, 'client_id': client['client_id'],
    'client_secret': client['client_secret'],
    'redirect_uri': REDIRECT_URI, 'grant_type': 'authorization_code',
}).encode()

req = urllib.request.Request(client['token_uri'], data=data,
    headers={'Content-Type': 'application/x-www-form-urlencoded'})
with urllib.request.urlopen(req, timeout=15) as r:
    token_data = json.loads(r.read())

creds = Credentials(
    token=token_data['access_token'],
    refresh_token=token_data.get('refresh_token'),
    client_id=client['client_id'],
    client_secret=client['client_secret'],
    token_uri=client['token_uri'],
    scopes=['https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive']
)
session = AuthorizedSession(creds)
print("✅ OAuth ready!")

# 2. Create new spreadsheet
r = session.post('https://sheets.googleapis.com/v4/spreadsheets', json={
    'properties': {'title': 'Karaoke PlayList'},
    'sheets': [{'properties': {'title': 'PlayList'}}]
})
if r.status_code != 200:
    print(f"❌ Create failed: {r.status_code} {r.text[:300]}")
    exit(1)
new_id = r.json()['spreadsheetId']
print(f"✅ Created: {new_id}")

# 3. Read API key from file
with open('/home/openclaw/.openclaw/credentials/youtube-api-key.txt') as f:
    API_KEY = f.read().strip()

PLIST_ID = 'PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7'
all_videos = []
page_token = None
while True:
    params = {'part': 'snippet', 'maxResults': 50, 'playlistId': PLIST_ID, 'key': API_KEY}
    if page_token: params['pageToken'] = page_token
    with urllib.request.urlopen(
        f"https://www.googleapis.com/youtube/v3/playlistItems?{urllib.parse.urlencode(params)}",
        timeout=15
    ) as r:
        d = json.loads(r.read())
    for item in d.get('items', []):
        s = item['snippet']
        all_videos.append((s['position'], s['title'], s['resourceId']['videoId']))
    page_token = d.get('nextPageToken')
    if not page_token: break
    time.sleep(0.3)
all_videos.sort()
print(f"✅ YouTube: {len(all_videos)} videos")

# 4. Build entries with sorting
entries = []
for pos, title, vid in all_videos:
    if title == 'Deleted video':
        entries.append(('[Deleted]', 'NO', 'Removed from YouTube', vid))
    elif title == 'Private video':
        entries.append(('[Private]', 'NO', 'Private video', vid))
    else:
        entries.append((title, '', '', vid))

missing = [
    ('Bình Yên - Vũ. (Live)', 'NO', 'Removed from YouTube playlist', ''),
    ('Cho Tôi Đi Theo Với', 'NO', 'Removed from YouTube playlist', ''),
    ('Con Đường Màu Xanh - Lệ Quyên ft. Lê Hiếu', 'NO', 'Removed from YouTube playlist', ''),
    ('Dĩ Vãng Nhạt Nhòa - Lân Nhã', 'NO', 'Removed from YouTube playlist', ''),
    ('Mascara - Chillies', 'NO', 'Removed from YouTube playlist', ''),
    ('Mùa Xuân Đầu Tiên - Mai Chí Công', 'NO', 'Removed from YouTube playlist', ''),
    ('Otherside - Red Hot Chili Peppers', 'NO', 'Removed from YouTube playlist', ''),
    ('Simple Love - Obito', 'NO', 'Removed from YouTube playlist', ''),
    ('Sài Gòn Đau Lòng Quá - Hứa Kim Tuyền x Hoàng Duyên', 'NO', 'Removed from YouTube playlist', ''),
    ('Tóc Tựa Tuyết (发如雪) - Châu Kiệt Luân', 'NO', 'Removed from YouTube playlist', ''),
    ('Vì Em Quá Yêu Anh - Mỹ Tâm', 'NO', 'Removed from YouTube playlist', ''),
    ('Đường Một Chiều', 'NO', 'Removed from YouTube playlist', ''),
]

def sort_key(s):
    s = unicodedata.normalize('NFKD', s.lower())
    return ''.join(c for c in s if c.isascii() or c == ' ')

entries.extend(missing)
entries.sort(key=lambda e: sort_key(e[0]))

rows = [['Song', 'Available', 'Note', 'Video ID']]
for e in entries:
    rows.append(list(e))

live = len([r for r in rows[1:] if r[1] != 'NO'])
dlt = len([r for r in rows[1:] if r[0] == '[Deleted]' or r[0] == '[Private]'])
rm = len(missing)
print(f"Live:{live} Deleted/Private:{dlt} Missing:{rm} Total:{len(rows)}")

# 5. Write to sheet
r = session.put(
    f'https://sheets.googleapis.com/v4/spreadsheets/{new_id}/values/PlayList!A1:D{len(rows)}',
    params={'valueInputOption': 'USER_ENTERED'},
    json={'values': rows, 'majorDimension': 'ROWS'}
)
print(f"Write: {r.status_code}")

# 6. Share with user
session.post(
    f'https://www.googleapis.com/drive/v3/files/{new_id}/permissions',
    json={'type': 'user', 'role': 'writer', 'emailAddress': 'decybnet@gmail.com'}
)
print("✅ Shared with decybnet@gmail.com")

# 7. Verify
r = session.get(f'https://sheets.googleapis.com/v4/spreadsheets/{new_id}/values/PlayList!A:D')
vals = r.json().get('values', [])
print(f"✅ Verified: {len(vals)} rows")
if vals:
    print(f"   Header: {vals[0]}")
    print(f"   Sample: {vals[1]}")
    print(f"   Last:   {vals[-1]}")

print(f"\n🔗 https://docs.google.com/spreadsheets/d/{new_id}/edit")
