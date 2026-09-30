import json
import requests

token_data = json.load(open('onedrive_token_old.json', encoding='utf-8'))
token = token_data['access_token']
headers = {'Authorization': f'Bearer {token}'}

manifest = json.load(open('engine/transfer_manifest.json', encoding='utf-8'))
subjects = ['anesthesia', 'radiology', 'psychiatry', 'orthopedics', 'pediatrics', 'surgery', 'obg']

for s in subjects:
    items = [v for k,v in manifest.items() if isinstance(v, dict) and v.get('subject_id') == s]
    it = items[0]
    res = requests.get(f'https://graph.microsoft.com/v1.0/sites/root/drive/items/{it["onedrive_item_id"]}?$select=name', headers=headers)
    old_name = res.json().get('name') if res.status_code == 200 else f'ERR {res.status_code}'
    print(f'{s:<12}: manifest="{it.get("filename")}" | old SP="{old_name}"')
