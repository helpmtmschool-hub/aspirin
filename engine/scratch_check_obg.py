"""
Cross-reference OBG titles from all available sources:
1. scratch_marrow_obg_tg.json - Telegram message captions + filenames
2. marrow_caption_audit.json - Cleaned audit captions
3. transfer_manifest.json - Current (potentially wrong) titles
4. marrow_sections.json - Current section titles + raw_filenames

Goal: Build complete accurate title mapping for all 110 OBG videos.
"""
import json

# Source 1: Telegram raw data with captions and filenames
with open('engine/scratch_marrow_obg_tg.json', 'r', encoding='utf-8') as f:
    tg_data = json.load(f)

# Source 2: Caption audit
with open('engine/marrow_caption_audit.json', 'r', encoding='utf-8') as f:
    audit = json.load(f)
audit_items = audit.get('OBG', {}).get('items', [])

# Source 3: Current manifest
with open('engine/transfer_manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# Source 4: Marrow sections
with open('engine/marrow_sections.json', 'r', encoding='utf-8') as f:
    sections = json.load(f)
obg_section = next(s for s in sections if s.get('subject_id') == 'obg')
section_videos = obg_section.get('videos', [])

# Build lookup by message_id from each source
tg_by_msg = {}
for item in tg_data:
    mid = item.get('msg_id')
    if mid:
        tg_by_msg[mid] = item

audit_by_msg = {}
for item in audit_items:
    mid = item.get('message_id')
    if mid:
        audit_by_msg[mid] = item

section_by_msg = {}
for item in section_videos:
    mid = item.get('message_id')
    if mid:
        section_by_msg[mid] = item

manifest_by_msg = {}
for k, v in manifest.items():
    if v.get('subject_id') == 'obg':
        mid = v.get('telegram_message_id')
        if mid:
            manifest_by_msg[mid] = (k, v)

# Now cross-reference
print("=" * 120)
print(f"{'MsgID':>6} | {'#':>3} | {'TG Caption':<50} | {'TG Filename':<50} | {'Current Title':<50} | {'Status'}")
print("=" * 120)

for msg_id in range(424, 533):
    tg = tg_by_msg.get(msg_id, {})
    aud = audit_by_msg.get(msg_id, {})
    sec = section_by_msg.get(msg_id, {})
    mk, mv = manifest_by_msg.get(msg_id, (None, {}))

    tg_text = tg.get('text', '').strip()
    tg_fn = tg.get('filename', '') or ''
    current_title = mv.get('title', '???')
    caption_num = aud.get('caption_num', '')

    # Check if current title is generic
    is_generic = 'Obstetrics & Gynecology Part' in current_title or 'Obstetrics &amp; Gynecology Part' in current_title

    status = 'GENERIC' if is_generic else 'OK'

    print(f"{msg_id:>6} | {caption_num:>3} | {tg_text:<50} | {tg_fn:<50} | {current_title:<50} | {status}")
