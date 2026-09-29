import json
import requests
import time

token_data = json.load(open('onedrive_token_old.json', encoding='utf-8'))
token = token_data['access_token']
headers = {'Authorization': f'Bearer {token}'}

manifest = json.load(open('engine/transfer_manifest.json', encoding='utf-8'))

SUBJECT_FOLDERS = {
    "surgery":     "Aspirin_LMS/04_Marrow_Edition_6/12_General_Surgery",
    "obg":         "Aspirin_LMS/04_Marrow_Edition_6/13_Obstetrics_and_Gynecology",
    "pediatrics":  "Aspirin_LMS/04_Marrow_Edition_6/14_Pediatrics",
    "psychiatry":  "Aspirin_LMS/04_Marrow_Edition_6/15_Psychiatry",
    "orthopedics": "Aspirin_LMS/04_Marrow_Edition_6/16_Orthopedics",
    "anesthesia":  "Aspirin_LMS/04_Marrow_Edition_6/17_Anesthesiology",
    "radiology":   "Aspirin_LMS/04_Marrow_Edition_6/18_Radiology",
}

# Collect manifest items by item_id
manifest_by_id = {}
for k, v in manifest.items():
    if isinstance(v, dict) and v.get('subject_id') in SUBJECT_FOLDERS:
        item_id = v.get('onedrive_item_id')
        if item_id:
            manifest_by_id[item_id] = (k, v)

print(f"Total manifest items to verify: {len(manifest_by_id)}")

mismatches = []
matched = 0

for subj, folder in SUBJECT_FOLDERS.items():
    url = f"https://graph.microsoft.com/v1.0/sites/root/drive/root:/{folder}:/children?$select=id,name,size&$top=200"
    items_in_sp = []
    while url:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"ERROR fetching {folder}: {res.status_code} {res.text[:100]}")
            break
        data = res.json()
        items_in_sp.extend(data.get('value', []))
        url = data.get('@odata.nextLink')

    print(f"Subject '{subj}': found {len(items_in_sp)} items in old SharePoint")
    for sp_item in items_in_sp:
        sp_id = sp_item['id']
        sp_name = sp_item['name']
        if sp_id in manifest_by_id:
            k, mf_item = manifest_by_id[sp_id]
            mf_name = mf_item.get('filename')
            if mf_name != sp_name:
                mismatches.append({'subj': subj, 'id': sp_id, 'manifest': mf_name, 'sp': sp_name})
            else:
                matched += 1
        else:
            print(f"  [Unmapped in manifest] {subj}: {sp_name} (ID: {sp_id})")

print(f"\nVerification Results:")
print(f"  Matched: {matched}/{len(manifest_by_id)}")
print(f"  Mismatches: {len(mismatches)}")
for m in mismatches:
    print(f"  MISMATCH in {m['subj']}: manifest='{m['manifest']}' vs SP='{m['sp']}'")
