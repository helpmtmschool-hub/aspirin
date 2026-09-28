"""Verify the 28 Marrow Edition 6 dermatology videos on the old SharePoint against independently
titled Telegram sources, and emit engine/marrow_derm_true_titles.json.

Binding rules (no invented titles):
  * SharePoint file  -> My Marrow message   : exact byte size (the file that was transferred)
  * My Marrow message -> Subjectwise title  : identical Telegram document id (same file object);
    lecture 27 is a re-encode there, so it binds on duration (+-1s) instead
  * Subjectwise title -> Marrow channel copy: exact byte size from an independent rip (different
    document ids), which confirms lecture number and topic for every one of the 28

Title text is taken from `Subjectwise Lectures` topic 2712 'Dermatology (Marrow)'. Two departures
from that source are recorded rather than silently applied:
  * 'Bulbous Disorders' (L9/L10) is spelled 'bullous' in the independent rip and in the source
    channel; 'Bullous' is the dermatological term, so the independent spelling wins.
  * '&' is rendered as 'and' and the ' - Part N' separator as ' Part N', matching the naming
    standard already used by the Marrow surgery/OBG tracks.
"""
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "engine"))

from scratch_graph import old_graph  # noqa: E402

MY_MARROW_CHAT = -1003264222864
SP_FOLDER = "Aspirin_LMS/04_Marrow_Edition_6/19_Dermatology"
CORROB = PROJECT_ROOT / "engine" / "scratch_derm_corroboration.json"


def lecture_no(text):
    m = re.match(r"\s*(\d{1,2})\b", text or "")
    return int(m.group(1)) if m else None


def polish(title):
    """Subjectwise caption -> repo standard 'N. Title'."""
    t = re.sub(r"^\s*\d{1,2}[\s:.\-]+", "", (title or "").strip())
    t = t.replace("&", "and").replace(" - Part", " Part").replace("\u2019", "'")
    t = re.sub(r"\bBulbous\b", "Bullous", t)
    t = re.sub(r"\btopics\b", "Topics", t)
    t = re.sub(r"\brelated\b", "Related", t)
    return f"{lecture_no(title)}. {re.sub(r'\\s+', ' ', t).strip()}"


def main():
    corro = json.loads(CORROB.read_text(encoding="utf-8"))
    a_by_size = {}
    for r in corro["A_my_marrow_310"]:
        if r["size"]:
            a_by_size[r["size"]] = r
    b_by_doc, b_by_dur = {}, {}
    for r in corro["B_subjectwise_2712"]:
        if r.get("doc_id"):
            b_by_doc[r["doc_id"]] = r
        if r.get("duration"):
            b_by_dur[round(r["duration"])] = r
    c_by_size = {r["size"]: r for r in corro["C_marrow_channel_970_1005"] if r.get("size")}

    sp_files = old_graph().children(SP_FOLDER)
    sp_files = [dict(f, path=f"{SP_FOLDER}/{f['name']}") for f in sp_files if f.get("file")]
    print(f"SharePoint files: {len(sp_files)}   My Marrow msgs: {len(a_by_size)}")

    lectures = []
    problems = []
    for sp in sorted(sp_files, key=lambda f: lecture_no(f["name"]) or 999):
        a = a_by_size.get(sp["size"])
        if not a:
            problems.append(f"{sp['name']}: no My Marrow message of size {sp['size']}")
            continue
        no = lecture_no(a["caption"]) or lecture_no(a["filename"]) or lecture_no(sp["name"])
        b = b_by_doc.get(a["doc_id"])
        bind = "telegram_document_id"
        if not b and a.get("duration"):
            b = b_by_dur.get(round(a["duration"]))
            bind = "duration"
        if not b:
            problems.append(f"L{no} ({sp['name']}): no titled source found")
            continue
        c = c_by_size.get(sp["size"])
        if not c:
            problems.append(f"L{no}: independent rip has no size match")
        title = polish(b["caption"])
        lectures.append({
            "seq": no,
            "telegram_message_id": a["msg_id"],
            "title": title,
            "previous_title": sp["name"],
            "duration_seconds": int(round(a["duration"] or 0)),
            "size_bytes": sp["size"],
            "source_a_doc_id": a["doc_id"],
            "binding": bind,
            "source_b_chat_id": -1003506593387,
            "source_b_topic_id": 2712,
            "source_b_message": b["msg_id"],
            "source_b_title": b["caption"],
            "source_c_chat_id": -1003659432109,
            "source_c_message": c["msg_id"] if c else None,
            "source_c_title": c["caption"] if c else None,
            "sharepoint_item_id": sp["id"],
            "sharepoint_path": sp["path"],
        })

    lectures.sort(key=lambda l: l["seq"])
    contiguous = [l["seq"] for l in lectures] == list(range(1, len(lectures) + 1))
    print(f"verified lectures: {len(lectures)}  contiguous 1..N: {contiguous}")
    for p in problems:
        print("  PROBLEM:", p)
    for l in lectures:
        print(f"  L{l['seq']:>2} msg{l['telegram_message_id']} [{l['binding'][:8]}] "
              f"'{l['previous_title']}' -> '{l['title']}'")

    out = PROJECT_ROOT / "engine" / "marrow_derm_true_titles.json"
    out.write_text(json.dumps({
        "generated": "2026-09-28",
        "subject_id": "dermatology",
        "platform": "marrow",
        "telegram_chat_id": MY_MARROW_CHAT,
        "source_channel_topic_id": 310,
        "sharepoint_folder": SP_FOLDER,
        "lecture_count": len(lectures),
        "title_authority": "Subjectwise Lectures topic 2712 'Dermatology (Marrow)'",
        "corroborating_rip": "Marrow channel -1003659432109 (independent upload, different document ids)",
        "normalizations": [
            "'Bulbous Disorders' -> 'Bullous Disorders' per the independent rip and source channel spelling",
            "'&' -> 'and' and ' - Part N' -> ' Part N' to match the Marrow surgery/OBG naming standard",
            "U+2019 apostrophe in 'Hansen\u2019s' normalized to ASCII apostrophe",
        ],
        "lectures": lectures,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
