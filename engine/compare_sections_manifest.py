import json
import re

sec = json.load(open('engine/marrow_sections.json', encoding='utf-8'))
sec_by_subj = {}
for s in sec:
    subj = s.get('subject_id')
    sec_by_subj[subj] = {}
    for v in s.get('videos', []):
        t = v.get('title', '')
        m = re.match(r'^(\d+)\.', t)
        if m:
            sec_by_subj[subj][int(m.group(1))] = t

manifest = json.load(open('engine/transfer_manifest.json', encoding='utf-8'))
subjects = ['anesthesia', 'radiology', 'psychiatry', 'orthopedics', 'pediatrics', 'surgery', 'obg']

for subj in subjects:
    items = [v for k,v in manifest.items() if isinstance(v, dict) and v.get('subject_id') == subj and v.get('status') == 'completed']
    print(f'=== {subj} ({len(items)} completed) ===')
    diffs = []
    for it in items:
        t = it.get('title', '')
        m = re.match(r'^(\d+)\.', t)
        if m:
            num = int(m.group(1))
            sec_title = sec_by_subj.get(subj, {}).get(num)
            if sec_title and sec_title.strip() != t.strip():
                diffs.append((num, t, sec_title))
        else:
            diffs.append(('NO_NUM', t, ''))
    print(f'  Diffs against marrow_sections: {len(diffs)}')
    for d in diffs[:5]:
        print(f'    #{d[0]}: manifest="{d[1]}" vs sec="{d[2]}"')
