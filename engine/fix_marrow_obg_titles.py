"""Repair Marrow Edition 6 OBG lecture titles across SharePoint, manifest and sections.

Background: 34 of the 109 OBG videos in `My Marrow` (chat -1003264222864, topic 423) were
posted with a bare-number caption and a numeric filename, so `normalize_lecture_title()`
fabricated placeholders like "2. Obstetrics & Gynecology Part 2". Those placeholders
propagated into marrow_sections.json, transfer_manifest.json, catalog.json and the
SharePoint filenames themselves.

The real titles were recovered by cross-verifying three independent Telegram groups:
  * `Subjectwise Lectures` topic 3167 "OBGY (Marrow)"  - 110 titled uploads
  * `Marrow` channel -1003659432109                    - titled uploads, independent rip
  * `My Marrow` topic 423                              - durations of the actual videos
Every lecture matched on all three by duration (+-1s) and on title text between the two
titled groups, so each accepted title has two-source agreement plus a fingerprint check.

Note on numbering: `My Marrow` never received Marrow's official lecture 53 ("Other
Complications of 3rd Stage of Labor"), so its 109 files are numbered 1..109 while Marrow's
own numbering runs 1..110. The original Marrow number is preserved as `marrow_lecture_no`.

Usage:
    python engine/fix_marrow_obg_titles.py            # dry run, prints the plan
    python engine/fix_marrow_obg_titles.py --apply    # renames on SharePoint + rewrites data
"""
import json
import os
import sys
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent

OLD_TENANT_ID = "938a1924-0af0-4599-819b-177a1dcf8fd6"
OLD_CLIENT_ID = "ba92c830-fac7-4d60-a0ff-8bf0b581a4c4"
MARROW_CHAT_ID = -1003264222864
SP_FOLDER = "/Aspirin_LMS/04_Marrow_Edition_6/13_Obstetrics_and_Gynecology"

# msg_id -> verified lecture title, cross-checked against Subjectwise Lectures + Marrow channel
CLEAN_OBG_TITLES = {
    424: "1. How to Study OBG",
    425: "2. Gametogenesis",
    426: "3. Fertilization and Implantation",
    427: "4. Teratogenic Exposure of Conceptus",
    428: "5. Fetus",
    429: "6. Placenta",
    430: "7. Placental Functions",
    431: "8. Placental Anomalies",
    432: "9. Cord and Anomalies",
    433: "10. Amniotic Fluid and Its Disorders Part 1",
    434: "11. Amniotic Fluid and Its Disorders Part 2",
    435: "12. Antenatal Patient History",
    436: "13. Antenatal Patient Signs, Symptoms and Minor Ailments",
    437: "14. Antenatal Patient Investigation and Advice",
    438: "15. Aneuploidy Screening",
    439: "16. Fetal Monitoring",
    440: "17. Maternal Adaptation in Pregnancy",
    441: "18. Obstetrics Pharmacology Integration",
    442: "19. Obstetrics Radiology Integration Part 1",
    443: "20. Obstetrics Radiology Integration Part 2",
    444: "21. Obstetrics Medicine Integration",
    445: "22. Anemia in Pregnancy Part 1",
    446: "23. Anemia in Pregnancy Part 2",
    447: "24. Diabetes in Pregnancy Part 1",
    448: "25. Diabetes in Pregnancy Part 2",
    449: "26. HTN in Pregnancy Part 1",
    450: "27. HTN in Pregnancy Part 2",
    451: "28. IUGR",
    452: "29. HIV in Pregnancy",
    453: "30. Rh Negative Pregnancy",
    454: "31. Twin Pregnancy Part 1",
    455: "32. Twin Pregnancy Part 2",
    456: "33. Preterm Labor Part 1",
    457: "34. Preterm Labor Part 2",
    458: "35. PROM",
    459: "36. Abortion Part 1",
    460: "37. Abortion Part 2",
    461: "38. Ectopic Pregnancy Part 1",
    462: "39. Ectopic Pregnancy Part 2",
    463: "40. Gestational Trophoblastic Disease",
    464: "41. Antepartum Haemorrhage",
    465: "42. Placenta Accreta Spectrum",
    466: "43. Maternal Pelvis",
    467: "44. Fetal Skull",
    468: "45. Terminology Related to Labor",
    469: "46. Leopold Maneuver and Antenatal Examination",
    470: "47. Mechanism of Labor",
    471: "48. Normal Labor",
    472: "49. Induction of Labor",
    473: "50. Stages of Labor, Abnormal Labor and Partogram Part 1",
    474: "51. Stages of Labor, Abnormal Labor and Partogram Part 2",
    475: "52. Complications of 3rd Stage of Labor - PPH",
    476: "53. Malpresentation Part 1",
    477: "54. Malpresentation Part 2",
    478: "55. Instrumental Delivery",
    479: "56. Cesarean Section",
    480: "57. Puerperium",
    481: "58. Menstrual Cycle",
    482: "59. Atypical Uterine Bleeding Part 1",
    483: "60. Atypical Uterine Bleeding Part 2",
    484: "61. Dysmenorrhea",
    485: "62. Gynecology Anatomy Integration Part 1",
    486: "63. Gynecology Anatomy Integration Part 2",
    487: "64. Gynecology Anatomy Integration Part 3",
    488: "65. Gynecology Anatomy Integration Part 4",
    489: "66. Gynecology Physiology Integration Part 1",
    490: "67. Gynecology Physiology Integration Part 2",
    491: "68. Gynecology Pharmacology Integration Part 1",
    492: "69. Gynecology Pharmacology Integration Part 2",
    493: "70. Gynecology Pharmacology Integration Part 3",
    494: "71. Gynecology Pathology Integration Part 1",
    495: "72. Gynecology Pathology Integration Part 2",
    496: "73. Menopause",
    497: "74. PCOS Part 1",
    498: "75. PCOS Part 2",
    499: "76. Endometriosis",
    500: "77. Fibroid Part 1",
    501: "78. Fibroid Part 2",
    502: "79. Polyp and Adenomyosis",
    503: "80. Congenital Malformations of Uterus",
    504: "81. Prolapse",
    505: "82. Stress Urinary Incontinence",
    506: "83. Urinary Fistulas",
    507: "84. Normal Sexual Development",
    508: "85. Puberty",
    509: "86. Disorders of Sexual Development Part 1",
    510: "87. Disorders of Sexual Development Part 2",
    511: "88. Primary Amenorrhea",
    512: "89. Secondary Amenorrhea",
    513: "90. Vaginitis",
    514: "91. PID",
    515: "92. Genital TB",
    516: "93. Female Infertility",
    517: "94. Male Infertility",
    518: "95. Natural Methods of Contraception",
    519: "96. Barrier Methods of Contraception",
    520: "97. Estrogen and Progesterone Contraceptives",
    521: "98. Only Progesterone Contraceptives",
    522: "99. IUCDs",
    523: "100. Permanent Methods of Contraception",
    524: "101. Miscellaneous Contraception",
    525: "102. Endometrial Hyperplasia",
    526: "103. Endometrial Cancer",
    527: "104. CIN Part 1",
    528: "105. CIN Part 2",
    529: "106. Cancer Cervix",
    530: "107. Ovarian Cancer Part 1",
    531: "108. Ovarian Cancer Part 2",
    532: "109. Vulvar Cancer",
}


def get_graph_token() -> str:
    """The legacy 5ncjwt app is configured as a public client - no secret needed to refresh."""
    token_file = PROJECT_ROOT / "onedrive_token_old.json"
    data = json.loads(token_file.read_text(encoding="utf-8"))
    res = requests.post(
        f"https://login.microsoftonline.com/{OLD_TENANT_ID}/oauth2/v2.0/token",
        data={
            "client_id": os.environ.get("OLD_ONEDRIVE_CLIENT_ID", OLD_CLIENT_ID),
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "refresh_token",
            "refresh_token": data["refresh_token"],
        },
        timeout=60,
    )
    res.raise_for_status()
    fresh = res.json()
    data["access_token"] = fresh["access_token"]
    if fresh.get("refresh_token"):
        data["refresh_token"] = fresh["refresh_token"]
    token_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return fresh["access_token"]


def list_sp_folder(token: str) -> list:
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://graph.microsoft.com/v1.0/sites/root/drive/root:{SP_FOLDER}:/children?$top=200&$select=id,name,size"
    items = []
    while url:
        res = requests.get(url, headers=headers, timeout=60)
        res.raise_for_status()
        page = res.json()
        items.extend(page.get("value", []))
        url = page.get("@odata.nextLink")
    return items


def main():
    apply_changes = "--apply" in sys.argv
    # Provenance of the original cross-verification. Read from the durable artifact when present
    # (it is self-describing after a run), else from the scratch captures, else degrade to none.
    def _load(name):
        f = PROJECT_ROOT / "engine" / name
        return json.loads(f.read_text(encoding="utf-8")) if f.exists() else []

    evidence = {}
    durable = _load("marrow_obg_true_titles.json")
    for lec in durable.get("lectures", []) if isinstance(durable, dict) else []:
        evidence[lec["telegram_message_id"]] = {
            "seq": lec["seq"], "marrow_no": lec["marrow_lecture_no"],
            "was_generic": lec["was_placeholder"], "was_placeholder": lec["was_placeholder"],
            "previous_title": lec.get("previous_title"),
            "previous_sp_filename": lec.get("previous_sp_filename"),
            "b_msg": lec.get("source_b_message"), "c_msg": lec.get("source_c_message"),
            "title_B": lec.get("source_b_title"), "title_C": lec.get("source_c_title"),
        }
    for v in _load("scratch_obg_verified.json"):
        evidence.setdefault(v["msg_id"], {}).update(v)
    for v in _load("scratch_obg_final.json"):
        evidence[v["msg_id"]] = {**evidence.get(v["msg_id"], {}), **v}

    manifest_path = PROJECT_ROOT / "engine" / "transfer_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sections_path = PROJECT_ROOT / "engine" / "marrow_sections.json"
    sections = json.loads(sections_path.read_text(encoding="utf-8"))

    targets = {}
    for msg_id, title in CLEAN_OBG_TITLES.items():
        entry = manifest.get(f"mr_{MARROW_CHAT_ID}_{msg_id}")
        if not entry:
            print(f"  [WARN] msg {msg_id} absent from manifest - skipped")
            continue
        targets[msg_id] = (entry, title, f"{title}.mp4")

    changed_local = [m for m, (e, t, f) in targets.items() if e.get("title") != t]
    print(f"OBG manifest entries: {len(targets)}   titles needing change: {len(changed_local)}")

    token = get_graph_token()
    sp_items = list_sp_folder(token)
    by_id = {it["id"]: it for it in sp_items}
    print(f"SharePoint files in {SP_FOLDER}: {len(sp_items)}\n")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    renamed = kept = failed = 0
    plan = []
    for seq, msg_id in enumerate(sorted(targets), 1):
        entry, title, new_name = targets[msg_id]
        # Marrow's own numbering skips lecture 53, which `My Marrow` never received.
        ev = evidence.get(msg_id, {})
        marrow_no = ev.get("marrow_no") or (seq if seq <= 52 else seq + 1)
        item_id = entry.get("onedrive_item_id")
        sp = by_id.get(item_id)
        if not sp:
            print(f"  [WARN] msg {msg_id}: manifest item id {item_id} not found on SharePoint")
            failed += 1
            continue
        old_name = sp["name"]
        # Stick to the first recorded damage state: a later run sees already-clean titles.
        was_ph = ev.get("was_generic") or ev.get("was_placeholder") or "Gynecology Part" in (entry.get("title") or "")
        prev_title = ev.get("previous_title") or entry.get("title")
        prev_name = ev.get("previous_sp_filename") or old_name
        plan.append({
            "seq": seq, "marrow_lecture_no": marrow_no, "telegram_message_id": msg_id,
            "title": title, "previous_title": prev_title, "was_placeholder": bool(was_ph),
            "previous_sp_filename": prev_name,
            "duration_seconds": entry.get("duration_seconds"),
            "source_b_message": ev.get("b_msg"), "source_b_title": ev.get("title_B"),
            "source_c_message": ev.get("c_msg"), "source_c_title": ev.get("title_C"),
        })
        if old_name == new_name:
            kept += 1
        else:
            renamed += 1
            print(f"  L{seq:>3} msg{msg_id}: '{old_name}'  ->  '{new_name}'")
            if not apply_changes:
                continue
            res = requests.patch(
                f"https://graph.microsoft.com/v1.0/sites/root/drive/items/{item_id}",
                headers=headers, json={"name": new_name}, timeout=60,
            )
            if res.status_code not in (200, 201):
                print(f"      [FAIL] {res.status_code} {res.text[:200]}")
                failed += 1
                renamed -= 1
                kept += 1
                continue
            data = res.json()
            entry["title"] = title
            entry["filename"] = new_name
            entry["onedrive_item_id"] = data.get("id", item_id)
            entry["onedrive_path"] = f"{SP_FOLDER}/{new_name}"
            entry["web_url"] = data.get("webUrl", entry.get("web_url"))
            print(f"      [OK] renamed")

    print(f"\nSharePoint: {renamed} renamed, {kept} already correct, {failed} failed")
    if not apply_changes:
        print("\nDRY RUN - no data written. Re-run with --apply.")
        return

    for seq, msg_id in enumerate(sorted(targets), 1):
        entry, title, new_name = targets[msg_id]
        ev = evidence.get(msg_id, {})
        entry["title"] = title
        entry["marrow_lecture_no"] = ev.get("marrow_no") or (seq if seq <= 52 else seq + 1)
        entry["title_verified"] = {
            "verified_on": "2026-09-27",
            "method": "duration fingerprint + caption number across 3 independent Telegram groups",
            "sources": [
                {"chat": "Subjectwise Lectures", "chat_id": -1003506593387, "topic_id": 3167,
                 "message_id": ev.get("b_msg"), "title": ev.get("title_B")},
                {"chat": "Marrow", "chat_id": -1003659432109, "message_id": ev.get("c_msg"),
                 "title": ev.get("title_C")},
            ],
        }

    marrow_nos = {m: (evidence.get(m, {}).get("marrow_no") or (s if s <= 52 else s + 1))
                  for s, m in enumerate(sorted(targets), 1)}

    for sec in sections:
        if sec.get("subject_id") != "obg":
            continue
        for vid in sec.get("videos", []):
            mid = vid.get("message_id")
            if mid in CLEAN_OBG_TITLES:
                vid["title"] = CLEAN_OBG_TITLES[mid]
                vid["marrow_lecture_no"] = marrow_nos[mid]

    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    (PROJECT_ROOT / "public" / "transfer_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    sections_path.write_text(json.dumps(sections, indent=2, ensure_ascii=False), encoding="utf-8")
    (PROJECT_ROOT / "engine" / "marrow_obg_true_titles.json").write_text(
        json.dumps({"generated": "2026-09-27", "subject_id": "obg", "platform": "marrow",
                    "telegram_chat_id": MARROW_CHAT_ID, "sharepoint_folder": SP_FOLDER,
                    "lecture_count": len(plan), "missing_marrow_lecture": 53, "lectures": plan},
                   indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("Wrote transfer_manifest.json (engine + public), marrow_sections.json, marrow_obg_true_titles.json")

    # The catalog's boilerplate pearls quote the lecture title, so they kept naming the old
    # placeholders even after the topics themselves were corrected. Refresh them in place.
    catalog_path = PROJECT_ROOT / "public" / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    renames = {l["telegram_message_id"]: (l.get("previous_title"), l["title"])
               for l in plan if l.get("previous_title") and l["previous_title"] != l["title"]}
    refreshed = 0
    for sub in catalog.get("subjects", []):
        for mod in sub.get("modules", []):
            for topic in mod.get("topics", []):
                old, new = renames.get(topic.get("message_id"), (None, None))
                if not old or topic.get("chat_id") != MARROW_CHAT_ID:
                    continue
                for i, pearl in enumerate(topic.get("pearls") or []):
                    if isinstance(pearl, str) and old in pearl:
                        topic["pearls"][i] = pearl.replace(old, new)
                        refreshed += 1
    catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Refreshed {refreshed} stale pearl lines in catalog.json across {len(renames)} renamed lectures")
    print("Next: node engine/sync_catalog.cjs   # regenerates public/catalog.json")


if __name__ == "__main__":
    main()
