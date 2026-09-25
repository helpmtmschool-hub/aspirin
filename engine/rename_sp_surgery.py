"""
Renames already uploaded Marrow Surgery lectures on SharePoint/OneDrive
to match their genuine, verified titles in-place (no re-upload needed).
Also updates transfer_manifest.json and catalog.json.
"""

import os, sys, json, re, requests
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from engine.telegram_to_onedrive import load_env_file, OneDriveClient

CLEAN_SURGERY_TITLES = {
    1: "1. How to Read Surgery",
    2: "2. Patient Safety Zone and Surgery Position",
    3: "3. Surgical Blades and Energy Source",
    4: "4. Suture Knot and Surgical Drain",
    5: "5. Case of Post-Op Fever",
    6: "6. Day Care Surgery",
    7: "7. Surgical Nutrition",
    8: "8. Shock Part 1",
    9: "9. Shock Part 2",
    10: "10. Breast Part 1",
    11: "11. Breast Part 2",
    12: "12. Breast Case Discussion and Operative Video",
    13: "13. Breast Part 3",
    14: "14. Breast Part 4",
    15: "15. Thyroid Part 1",
    16: "16. Thyroid Part 2",
    17: "17. Thyroid Part 3",
    18: "18. Case of Swelling of Neck",
    19: "19. Parathyroid",
    20: "20. Adrenal Gland",
    21: "21. Esophagus Part 1",
    22: "22. Esophagus Part 2",
    23: "23. Esophagus Part 3",
    24: "24. Stomach Part 1",
    25: "25. Stomach Part 2",
    26: "26. Stomach Part 3",
    27: "27. Bariatric Surgery",
    28: "28. Upper GI Hemorrhage",
    29: "29. Intestinal Obstruction Part 1",
    30: "30. Intestinal Obstruction Part 2",
    31: "31. Small and Large Bowel Conditions",
    32: "32. Appendix",
    33: "33. Colorectal Polyps Part 1",
    34: "34. Colorectal Polyps Part 2",
    35: "35. Rectal and Anal Diseases Part 1",
    36: "36. Rectal and Anal Diseases Part 2",
    37: "37. Liver Part 1",
    38: "38. Liver Part 2",
    39: "39. Spleen",
    40: "40. Gall Bladder and Biliary Tree Part 1",
    41: "41. Gall Bladder and Biliary Tree Part 2",
    42: "42. Benign Pancreatic Conditions",
    43: "43. Malignant Pancreatic Conditions",
    44: "44. Clinical Case Discussion - Lump",
    45: "45. Abdominal Emergencies - Clinical Scenarios",
    46: "46. Testicular Disorders Part 1",
    47: "47. Testicular Disorders Part 2",
    48: "48. Clinical Case of a Scrotal Swelling",
    49: "49. Urethral and Penile Disorders",
    50: "50. Kidney Part 1",
    51: "51. Kidney Part 2",
    52: "52. Urinary Bladder",
    53: "53. Prostate Part 1",
    54: "54. Prostate Part 2",
    55: "55. Minimally Invasive Surgery",
    56: "56. Transplant Surgery",
    57: "57. Plastic Surgery - Wounds and Cleft Lip Part 1",
    58: "58. Plastic Surgery - Wounds and Cleft Lip Part 2",
    59: "59. Neurosurgery Part 1",
    60: "60. Neurosurgery Part 2",
    61: "61. Basics of Trauma Management",
    62: "62. Abdominal Trauma",
    63: "63. Thoracic Trauma",
    64: "64. Head Trauma",
    65: "65. Thermal Injury",
    66: "66. Trauma - Emergency Scenarios",
    67: "67. Clinical Case Discussion - Inguinoscrotal Swelling",
    68: "68. Hernia Part 1",
    69: "69. Hernia Part 2",
    70: "70. Deep Vein Thrombosis",
    71: "71. Varicose Veins",
    72: "72. Arterial Disorders Part 1",
    73: "73. Arterial Disorders Part 2",
    74: "74. Lymphatic System",
    75: "75. Oral Cancers",
    76: "76. Clinical Case Discussion - Oral Lesion",
    77: "77. Salivary Glands",
    78: "78. Skin Tumors and Soft Tissue Sarcomas",
    79: "79. Thoracic and Mediastinum",
    80: "80. Common Surgical Swellings with Clinical Case Discussions",
    81: "81. Common Ulcers with Clinical Case Discussions",
    82: "82. Surgical Instruments"
}

def main():
    load_env_file()
    client_id = os.environ.get("ONEDRIVE_CLIENT_ID")
    client_secret = os.environ.get("ONEDRIVE_CLIENT_SECRET")
    refresh_token = os.environ.get("ONEDRIVE_REFRESH_TOKEN")
    tenant_id = os.environ.get("ONEDRIVE_TENANT_ID", "938a1924-0af0-4599-819b-177a1dcf8fd6")

    if not client_id or not refresh_token:
        token_file = PROJECT_ROOT / "onedrive_token.json"
        if token_file.exists():
            with open(token_file, "r") as f:
                d = json.load(f)
                client_id = client_id or d.get("client_id")
                refresh_token = refresh_token or d.get("refresh_token")

    od = OneDriveClient(client_id, client_secret, refresh_token, tenant_id=tenant_id, drive_target="sites/root/drive")
    token = od.get_valid_token()

    # List all children in 04_Marrow_Edition_6/12_General_Surgery
    folder_path = "/Aspirin_LMS/04_Marrow_Edition_6/12_General_Surgery"
    url = f"https://graph.microsoft.com/v1.0/sites/root/drive/root:{folder_path}:/children?$top=100&$select=id,name,size,webUrl"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    items = []
    while url:
        res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
        if res.status_code != 200:
            print(f"Error fetching SP files: {res.status_code} - {res.text}")
            break
        data = res.json()
        items.extend(data.get("value", []))
        url = data.get("@odata.nextLink")

    print(f"Found {len(items)} files on SharePoint in {folder_path}")

    # Load transfer manifest
    manifest_file = PROJECT_ROOT / "engine" / "transfer_manifest.json"
    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    renamed_count = 0
    for item in items:
        cur_name = item["name"]
        item_id = item["id"]
        
        # Extract lecture number from filename, e.g. "45. Inguinal..." or "45.mp4" or "1 HOW TO READ..."
        m = re.match(r"^(\d+)[\.\s]", cur_name)
        if not m:
            continue
        lec_num = int(m.group(1))
        
        target_title = CLEAN_SURGERY_TITLES.get(lec_num)
        if not target_title:
            continue
            
        target_filename = f"{target_title}.mp4"
        
        if cur_name != target_filename:
            print(f"Renaming Lec {lec_num:02d}: '{cur_name}' -> '{target_filename}'")
            patch_url = f"https://graph.microsoft.com/v1.0/sites/root/drive/items/{item_id}"
            patch_res = requests.patch(patch_url, headers=headers, json={"name": target_filename})
            if patch_res.status_code in [200, 201]:
                print(f"  [OK] Successfully renamed on SharePoint.")
                renamed_count += 1
            else:
                print(f"  [FAIL] Error renaming: {patch_res.status_code} - {patch_res.text}")
                continue
                
        # Update manifest entry if present
        target_mid = None
        marrow_sections_file = PROJECT_ROOT / "engine" / "marrow_sections.json"
        if marrow_sections_file.exists():
            try:
                with open(marrow_sections_file, "r", encoding="utf-8") as mf:
                    ms_data = json.load(mf)
                s_sec = next((s for s in ms_data if s["subject_id"] == "surgery"), None)
                if s_sec and 0 < lec_num <= len(s_sec.get("videos", [])):
                    target_mid = s_sec["videos"][lec_num - 1].get("message_id")
            except Exception:
                pass

        for key, entry in manifest.items():
            is_match = (
                entry.get("onedrive_item_id") == item_id or
                entry.get("filename") in (cur_name, target_filename) or
                (target_mid and key == f"mr_-1003264222864_{target_mid}")
            )
            if is_match:
                entry["title"] = target_title
                entry["filename"] = target_filename
                entry["onedrive_path"] = f"{folder_path}/{target_filename}"
                if "web_url" in entry:
                    entry["web_url"] = entry["web_url"].rsplit("/", 1)[0] + "/" + requests.utils.quote(target_filename)

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Also update public/transfer_manifest.json if it exists
    pub_manifest = PROJECT_ROOT / "public" / "transfer_manifest.json"
    if pub_manifest.exists():
        with open(pub_manifest, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

    print(f"\nDone! Renamed {renamed_count} files on SharePoint and synchronized manifest.")

if __name__ == "__main__":
    main()
