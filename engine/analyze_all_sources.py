import json
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

dump = json.load(open("engine/scratch_optha_ent_tg_dump.json", encoding="utf-8"))
marrow_ch = json.load(open("engine/scratch_marrow_ch_slice.json", encoding="utf-8"))

print("=== OPHTHALMOLOGY SOURCES ===")
print(f"My Marrow (topic 211): {len(dump['my_marrow_optha_211'])} items")
print(f"Subjectwise (topic 2741): {len(dump['subjectwise_optha_2741'])} items")

# In marrow_ch, separate ENT and Optha
marrow_ch_ent = []
marrow_ch_optha = []
for m in marrow_ch:
    t = m.get("text", "") or m.get("filename", "")
    # Check if ENT or Optha
    if any(k in t.lower() for k in ["ent", "ear", "nose", "throat", "larynx", "pharynx", "tympan", "mastoid", "stapes", "otitis", "sinus", "rhin", "adenoid", "tonsil"]):
        marrow_ch_ent.append(m)
    elif any(k in t.lower() for k in ["opth", "eye", "cornea", "lens", "retina", "glaucoma", "orbit", "uvea", "cataract", "strabismus", "squint", "conjunctiv"]):
        marrow_ch_optha.append(m)
    else:
        # Check msg_id range
        if 228 <= m["msg_id"] <= 292:
            marrow_ch_ent.append(m)
        elif 293 <= m["msg_id"] <= 335:
            marrow_ch_optha.append(m)

print(f"Marrow flat channel - ENT: {len(marrow_ch_ent)} items, Optha: {len(marrow_ch_optha)} items")

print("\n=== ENT SOURCES ===")
print(f"My Marrow (topic 146): {len(dump['my_marrow_ent_146'])} items")
print(f"Subjectwise (topic 3102): {len(dump['subjectwise_ent_3102'])} items")
print(f"Subjectwise (topic 2647): {len(dump['subjectwise_ent_2647'])} items")

# Let's inspect first 3 and last 3 of each Optha source
print("\n--- Optha: My Marrow (211) samples ---")
for x in dump['my_marrow_optha_211'][:3] + dump['my_marrow_optha_211'][-3:]:
    print(f"  id={x['msg_id']} fn={x['filename']} text={x['text'][:50]} size={x['size']} dur={x['duration']}")

print("\n--- Optha: Subjectwise (2741) samples ---")
for x in dump['subjectwise_optha_2741'][:3] + dump['subjectwise_optha_2741'][-3:]:
    print(f"  id={x['msg_id']} fn={x['filename']} text={x['text'][:50]} size={x['size']} dur={x['duration']}")

print("\n--- Optha: Marrow flat channel samples ---")
for x in marrow_ch_optha[:3] + marrow_ch_optha[-3:]:
    print(f"  id={x['msg_id']} fn={x['filename']} text={x['text'][:50]} size={x['size']} dur={x['duration']}")

print("\n--- ENT: My Marrow (146) samples ---")
for x in dump['my_marrow_ent_146'][:3] + dump['my_marrow_ent_146'][-3:]:
    print(f"  id={x['msg_id']} fn={x['filename']} text={x['text'][:50]} size={x['size']} dur={x['duration']}")

print("\n--- ENT: Subjectwise (3102) samples ---")
for x in dump['subjectwise_ent_3102'][:3] + dump['subjectwise_ent_3102'][-3:]:
    print(f"  id={x['msg_id']} fn={x['filename']} text={x['text'][:50]} size={x['size']} dur={x['duration']}")

print("\n--- ENT: Subjectwise (2647) samples ---")
for x in dump['subjectwise_ent_2647'][:3] + dump['subjectwise_ent_2647'][-3:]:
    print(f"  id={x['msg_id']} fn={x['filename']} text={x['text'][:50]} size={x['size']} dur={x['duration']}")

print("\n--- ENT: Marrow flat channel samples ---")
for x in marrow_ch_ent[:3] + marrow_ch_ent[-3:]:
    print(f"  id={x['msg_id']} fn={x['filename']} text={x['text'][:50]} size={x['size']} dur={x['duration']}")
