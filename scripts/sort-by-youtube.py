#!/usr/bin/env python3
"""Rewrite sheet sorted by YouTube playlist order."""
import json, urllib.request, urllib.parse, time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import AuthorizedSession

# Load OAuth token
TOKEN_DATA = json.load(open('/home/openclaw/.openclaw/credentials/youtube-oauth-token.json', 'r'))
with open('/home/openclaw/.openclaw/credentials/youtube-oauth-client.json') as f:
    client = json.loads(f.read())['installed']

creds = Credentials(
    token=TOKEN_…n'],
    refresh_token=TOKEN_…n'],
    client_id=client['client_id'],
    client_secret=client…t'],
    token_uri=client['token_uri'],
    scopes=['https://www.googleapis.com/auth/spreadsheets']
)
session = AuthorizedSession(creds)

SID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog'

# Fetch YouTube playlist
with open('/home/openclaw/.openclaw/credentials/youtube-api-key.txt') as f:
    API_KEY = ***

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

# Build entries in YouTube order
entries = []
for pos, title, vid in all_videos:
    if title == 'Deleted video':
        entries.append(('[Deleted]', 'NO', 'Removed from YouTube', vid))
    elif title == 'Private video':
        entries.append(('[Private]', 'NO', 'Private video', vid))
    else:
        entries.append((title, '', '', vid))

# Missing songs (từ SONGS.md nhưng không còn trong playlist)
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

# Add missing songs at the end
entries.extend(missing)

live = len([r for r in entries if r[1] != 'NO'])
gone = len([r for r in entries if r[0] == '[Deleted]' or r[0] == '[Private]'])
rm = len(missing)
print(f"Live:{live} Deleted/Private:{gone} Missing:{rm} Total:{len(entries)}")

rows = [['Song', 'Available', 'Note', 'Video ID']]
for e in entries:
    rows.append(list(e))

# Write to sheet
session.post(f'https://sheets.googleapis.com/v4/spreadsheets/{SID}/values/PlayList!A1:D{len(rows)}/clear')
session.put(
    f'https://sheets.googleapis.com/v4/spreadsheets/{SID}/values/PlayList!A1:D{len(rows)}',
    params={'valueInputOption': 'USER_ENTERED'},
    json={'values': rows, 'majorDimension': 'ROWS'}
)

# Verify
r = session.get(f'https://sheets.googleapis.com/v4/spreadsheets/{SID}/values/PlayList!A:D')
vals = r.json().get('values', [])
print(f"✅ Done! {len(vals)} rows")
if vals:
    print(f"   Header: {vals[0]}")
    print(f"   Row 2: {vals[1]}")  # Should be first YouTube video
    print(f"   Row 3: {vals[2]}")
    print(f"   Last: {vals[-1]}")

print(f"🔗 https://docs.google.com/spreadsheets/d/{SID}/edit")
