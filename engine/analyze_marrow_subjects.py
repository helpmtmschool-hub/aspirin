"""Analyze each Marrow subject's source folder, title verification, etc."""
import json

with open('engine/transfer_manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

subjects_info = {}
for key, item in manifest.items():
    if not isinstance(item, dict):
        continue
    if item.get('platform') != 'marrow':
        continue
    subj = item.get('subject_id', 'unknown')
    if subj == 'dermatology':
        continue
    folder = item.get('folder_path', '?')
    if subj not in subjects_info:
        subjects_info[subj] = {
            'folder': folder, 'count': 0, 'bytes': 0,
            'has_title_verified': 0, 'has_onedrive_id': 0,
            'sample_titles': [], 'sample_keys': [],
            'source_onedrive_ids': 0, 'has_source_sp_filename': 0,
        }
    subjects_info[subj]['count'] += 1
    subjects_info[subj]['bytes'] += item.get('size_bytes', 0)
    if item.get('title_verified'):
        subjects_info[subj]['has_title_verified'] += 1
    if item.get('onedrive_item_id'):
        subjects_info[subj]['has_onedrive_id'] += 1
    if item.get('source_onedrive_item_id'):
        subjects_info[subj]['source_onedrive_ids'] += 1
    if item.get('source_sp_filename'):
        subjects_info[subj]['has_source_sp_filename'] += 1
    if len(subjects_info[subj]['sample_titles']) < 3:
        subjects_info[subj]['sample_titles'].append(item.get('title', '?'))
    if len(subjects_info[subj]['sample_keys']) < 2:
        subjects_info[subj]['sample_keys'].append(key)

for subj, info in sorted(subjects_info.items()):
    gb = info['bytes'] / (1024**3)
    print()
    print("=== {} ({} files, {:.2f} GiB) ===".format(subj.upper(), info['count'], gb))
    print("  Source folder: {}".format(info['folder']))
    print("  Has onedrive_item_id (old SP): {}/{}".format(info['has_onedrive_id'], info['count']))
    print("  Has source_onedrive_item_id: {}/{}".format(info['source_onedrive_ids'], info['count']))
    print("  Title verified: {}/{}".format(info['has_title_verified'], info['count']))
    print("  Has source_sp_filename: {}/{}".format(info['has_source_sp_filename'], info['count']))
    print("  Sample titles: {}".format(info['sample_titles']))
