import json
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_DIR = Path(__file__).resolve().parent.parent

dump = json.load(open("engine/scratch_optha_ent_tg_dump.json", encoding="utf-8"))
marrow_ch = json.load(open("engine/scratch_marrow_ch_slice.json", encoding="utf-8"))

MY_MARROW = -1003264222864
SUBJECTWISE = -1003506593387
MARROW_FLAT = -1003659432109

optha_mm = dump["my_marrow_optha_211"]
optha_s1_raw = dump["subjectwise_optha_2741"]
optha_flat = [m for m in marrow_ch if 294 <= m["msg_id"] <= 334]

# Remove duplicate 2760 in Subjectwise
seen_docs = set()
optha_s1 = []
for x in optha_s1_raw:
    if x["doc_id"] in seen_docs:
        continue
    seen_docs.add(x["doc_id"])
    optha_s1.append(x)

ent_mm = dump["my_marrow_ent_146"]
ent_s1 = dump["subjectwise_ent_3102"]
ent_s2 = dump["subjectwise_ent_2647"]
ent_flat = [m for m in marrow_ch if 229 <= m["msg_id"] <= 293]

def format_duration(seconds):
    if not seconds:
        return "0m 00s"
    sec = round(seconds)
    m = sec // 60
    s = sec % 60
    h = m // 60
    m = m % 60
    if h > 0:
        return f"{h}h {m:02d}m {s:02d}s"
    return f"{m:02d}m {s:02d}s"

# Standardized titles for Ophthalmology (1..40)
# Verified from Marrow Syllabus & Subjectwise/Flat titles
OPHTHA_CANONICAL_TITLES = [
    "How to Approach Ophthalmology",
    "Anatomy of Eye: Layers, Structure of Eyeball and Cornea",
    "Anatomy of Eye: Sclera and Pathologies, Limbus, and Ocular Drug Routes",
    "Anatomy of Eye: Middle Layer, Horner Syndrome, and Accommodation",
    "Anatomy of Eye: Innermost Layer, Blood Supply, and Embryology",
    "Neuro-Ophthalmology: Visual Pathway and Visual Field Defects",
    "Neuro-Ophthalmology: Pupillary Reflexes and Light Reflex Pathway Lesions",
    "Neuro-Ophthalmology: Optic Atrophy, Neuritis, and Papilledema",
    "Neuro-Ophthalmology: Color Blindness and Congenital Anomalies",
    "Squint: Extraocular Muscles, Binocular Single Vision, and Types",
    "Squint: Clinical Investigations",
    "Squint: Paralytic Squint and Gaze Palsy",
    "Squint: Restrictive, Comitant, and Pseudo-Strabismus",
    "Lens: Anatomy and Metabolism",
    "Lens: Acquired Cataract and Clinical Features",
    "Lens: Cataract Surgery and Complications",
    "Lens: Congenital Cataract and Ectopia Lentis",
    "Glaucoma: Clinical Investigations",
    "Glaucoma: Open-Angle and Angle-Closure Glaucoma",
    "Glaucoma: Secondary and Congenital Glaucoma",
    "Optics: Tests for Vision and Normal Optics of the Eye",
    "Optics: Myopia and Hypermetropia",
    "Optics: Astigmatism and Tests for Refraction",
    "Retina: Anatomy and Investigations",
    "Retina: Retinoblastoma and Macular Edema",
    "Retina: Dystrophies and Fundus Changes (Retinitis Pigmentosa)",
    "Retina: Vascular Disorders Part 1 (Diabetic Retinopathy)",
    "Retina: Vascular Disorders Part 2 (Hypertensive Retinopathy and CRAO)",
    "Retina: Retinal Detachment",
    "Cornea: Special Investigations",
    "Cornea: Corneal Ulcers and Keratitis",
    "Cornea: Corneal Dystrophies, Keratoconus, and Miscellaneous",
    "Uvea: Anterior Uveitis",
    "Uvea: Intermediate, Posterior, and Panuveitis",
    "Conjunctiva: Anatomy and Types of Conjunctivitis",
    "Eyelid: Anatomy and Disorders",
    "Orbit: Clinical Anatomy and Diseases",
    "Ocular Trauma",
    "Lacrimal Apparatus: Anatomy, Watering Eye, and Dacryocystitis",
    "Community Ophthalmology"
]

# Standardized titles for ENT (1..64)
# Verified from Marrow Syllabus & Subjectwise/Flat titles
ENT_CANONICAL_TITLES = [
    "How to Prepare ENT Using Edition 6",
    "Basics of Ear",
    "Clinical Embryology of Inner Ear",
    "Anatomy of Middle Ear",
    "Clinical Anatomy of External Ear",
    "Physiology of Hearing",
    "Clinical Anatomy of Inner Ear Part 1",
    "Clinical Anatomy of Inner Ear Part 2",
    "Nerve Supply of Ear",
    "Tuning Fork Tests",
    "Pure Tone Audiometry (PTA)",
    "Audiology Part 3 (Impedance Audiometry and OAE)",
    "Audiology Part 4: BERA and ASSR",
    "Vestibular Physiology",
    "Vertigo and Vestibular Function Tests",
    "Diseases of Pinna",
    "Diseases of External Auditory Canal (EAC)",
    "Conditions of Tympanic Membrane",
    "Acute Otitis Media (AOM)",
    "Serous Otitis Media (OME / Glue Ear)",
    "Chronic Mucosal Otitis Media (CMOM)",
    "Chronic Suppurative Otitis Media (CSOM) and Cholesteatoma",
    "Complications of Otitis Media",
    "Otosclerosis",
    "Meniere's Disease",
    "Superior Semicircular Canal Dehiscence",
    "Benign Paroxysmal Positional Vertigo (BPPV)",
    "Vestibular Neuritis",
    "Sudden Sensorineural Hearing Loss (SNHL) and Other Conditions",
    "Tumors of External and Middle Ear (Glomus Tumor)",
    "Acoustic Neuroma (Vestibular Schwannoma)",
    "Facial Nerve Anatomy and Electrodiagnostic Tests Part 1",
    "Facial Nerve Part 2: Bell's Palsy and Other Disorders",
    "Hearing Rehabilitation: Hearing Aids and Cochlear Implants",
    "Clinical Diseases of External Nose and Choanal Atresia",
    "Clinical Anatomy of Lateral Wall of Nose",
    "Clinical Anatomy and Diseases of Nasal Septum",
    "Nerve Supply of Nose and Related Disorders Part 1",
    "Nerve Supply of Nose and Related Disorders Part 2",
    "Arterial Supply of Nose and Epistaxis",
    "Clinical Anatomy of PNS and Rhinosinusitis",
    "Complications of Sinusitis",
    "Nasal Polyps (Antrochoanal and Ethmoidal)",
    "Fungal Sinusitis",
    "Atrophic Rhinitis and Granulomatous Conditions of Nose",
    "Fractures of Face and CSF Rhinorrhea",
    "Tumors of Nose and Paranasal Sinuses",
    "Clinical Anatomy of Pharynx Part 1",
    "Clinical Anatomy of Pharynx Part 2",
    "Clinical Anatomy of Pharynx Part 3",
    "Clinical Anatomy of Pharynx Part 4: Retropharyngeal Abscess",
    "Adenoid Hypertrophy",
    "Juvenile Nasopharyngeal Angiofibroma (JNA)",
    "Nasopharyngeal Carcinoma",
    "Conditions of Tonsil and Tonsillectomy Part 1",
    "Conditions of Tonsil Part 2",
    "Clinical Anatomy of Larynx Part 1",
    "Clinical Anatomy of Larynx Part 2",
    "Larynx Infections (Acute and Chronic Laryngitis)",
    "Congenital Anomalies of Larynx (Laryngomalacia)",
    "Voice Disorders and Benign Lesions of Vocal Cords",
    "Nerve Supply of Vocal Cords and Vocal Cord Palsy",
    "Carcinoma of Larynx",
    "Tracheostomy and Foreign Body in Airway"
]

print(f"Total Optha titles: {len(OPHTHA_CANONICAL_TITLES)}")
print(f"Total ENT titles: {len(ENT_CANONICAL_TITLES)}")

# Build Optha records
optha_verified_records = []
for i in range(40):
    lec_no = i + 1
    title = f"{lec_no}. {OPHTHA_CANONICAL_TITLES[i]}"
    mm = optha_mm[i]
    s1 = optha_s1[i]
    fl = optha_flat[i]
    
    # Primary source is My Marrow (chat -1003264222864), corroborated by Subjectwise (-1003506593387)
    # and Marrow Flat (-1003659432109)
    doc_id = mm.get("doc_id") or s1.get("doc_id")
    size = mm.get("size") or s1.get("size")
    dur = mm.get("duration") or s1.get("duration")
    
    optha_verified_records.append({
        "lecture_no": lec_no,
        "title": title,
        "duration_seconds": round(dur) if dur else 0,
        "duration_formatted": format_duration(dur),
        "file_size": size,
        "document_id": doc_id,
        "primary_source": {
            "chat_id": MY_MARROW,
            "message_id": mm["msg_id"],
            "caption": (mm.get("text") or "").split("\n")[0],
            "filename": mm.get("filename")
        },
        "corroboration": [
            {
                "channel_name": "Subjectwise Lectures",
                "chat_id": SUBJECTWISE,
                "topic_id": 2741,
                "message_id": s1["msg_id"],
                "caption": (s1.get("text") or "").split("\n")[0],
                "filename": s1.get("filename"),
                "doc_id_match": (mm.get("doc_id") == s1.get("doc_id"))
            },
            {
                "channel_name": "Marrow Channel",
                "chat_id": MARROW_FLAT,
                "message_id": fl["msg_id"],
                "caption": (fl.get("text") or "").split("\n")[0],
                "filename": fl.get("filename"),
                "duration_match": (abs((mm.get("duration") or 0) - (fl.get("duration") or 0)) <= 2)
            }
        ]
    })

# Build ENT records
ent_verified_records = []
for i in range(64):
    lec_no = i + 1
    title = f"{lec_no}. {ENT_CANONICAL_TITLES[i]}"
    s1 = ent_s1[i]
    s2 = ent_s2[i]
    fl = ent_flat[i]
    
    # In My Marrow, lecture 52 was skipped.
    # Lectures 1..51 are indices 0..50
    # Lecture 52 (index 51) is missing in My Marrow
    # Lectures 53..64 (indices 52..63) are indices 51..62 in ent_mm
    mm = None
    if lec_no <= 51:
        mm = ent_mm[i]
    elif lec_no == 52:
        mm = None # Missing in My Marrow!
    else:
        mm = ent_mm[i - 1] # Shifted by 1

    doc_id = s1.get("doc_id")
    size = s1.get("size")
    dur = s1.get("duration")
    
    # For primary source: if mm exists, use mm (My Marrow -1003264222864),
    # otherwise use s1 (Subjectwise -1003506593387)
    if mm:
        primary_chat = MY_MARROW
        primary_msg_id = mm["msg_id"]
        primary_caption = (mm.get("text") or "").split("\n")[0]
        primary_fn = mm.get("filename")
    else:
        primary_chat = SUBJECTWISE
        primary_msg_id = s1["msg_id"]
        primary_caption = (s1.get("text") or "").split("\n")[0]
        primary_fn = s1.get("filename")

    ent_verified_records.append({
        "lecture_no": lec_no,
        "title": title,
        "duration_seconds": round(dur) if dur else 0,
        "duration_formatted": format_duration(dur),
        "file_size": size,
        "document_id": doc_id,
        "missing_in_my_marrow": (mm is None),
        "primary_source": {
            "chat_id": primary_chat,
            "message_id": primary_msg_id,
            "caption": primary_caption,
            "filename": primary_fn
        },
        "corroboration": [
            {
                "channel_name": "Subjectwise Lectures Topic 3102",
                "chat_id": SUBJECTWISE,
                "topic_id": 3102,
                "message_id": s1["msg_id"],
                "caption": (s1.get("text") or "").split("\n")[0],
                "filename": s1.get("filename")
            },
            {
                "channel_name": "Subjectwise Lectures Topic 2647",
                "chat_id": SUBJECTWISE,
                "topic_id": 2647,
                "message_id": s2["msg_id"] if s2 else None,
                "caption": (s2.get("text") or "").split("\n")[0] if s2 else None,
                "filename": s2.get("filename") if s2 else None
            },
            {
                "channel_name": "Marrow Channel",
                "chat_id": MARROW_FLAT,
                "message_id": fl["msg_id"] if fl else None,
                "caption": (fl.get("text") or "").split("\n")[0] if fl else None,
                "filename": fl.get("filename") if fl else None
            }
        ]
    })

# Save JSON datasets
out_optha = PROJECT_DIR / "engine" / "marrow_ophthalmology_verified.json"
out_ent = PROJECT_DIR / "engine" / "marrow_ent_verified.json"

out_optha.write_text(json.dumps(optha_verified_records, indent=2, ensure_ascii=False), encoding="utf-8")
out_ent.write_text(json.dumps(ent_verified_records, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"Saved {len(optha_verified_records)} Ophthalmology lectures to {out_optha}")
print(f"Saved {len(ent_verified_records)} ENT lectures to {out_ent}")
