const fs = require('fs');
const path = require('path');

const catalogPath = path.resolve(__dirname, '../public/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const HIGH_YIELD_RULES = [
  // 1. NEUROANATOMY
  {
    pattern: /Transverse Section/i,
    pearls: [
      "Midbrain: Weber syndrome (paramedian branches of PCA; CN III palsy + contralateral hemiplegia); Benedikt syndrome (red nucleus involvement + tremor)",
      "Pons: Millard-Gubler (CN VI, VII + contralateral hemiplegia); Foville syndrome (conjugate gaze palsy)",
      "Medulla: Wallenberg lateral medullary syndrome (PICA occlusion; loss of pain/temp on ipsilateral face, contralateral body; Horner syndrome)"
    ]
  },
  {
    pattern: /Shrikant Verma/i,
    pearls: [
      "Key skull base foramina: Foramen ovale (Mandibular nerve V3, Accessory meningeal artery, Lesser petrosal nerve, Emissary vein)",
      "Cavernous sinus lateral wall: CN III, IV, V1, V2; Center: CN VI and Internal Carotid Artery",
      "Pterion landmark: Junction of 4 bones (frontal, parietal, temporal, sphenoid); overlies anterior branch of middle meningeal artery"
    ]
  },
  {
    pattern: /Smily Pruthi/i,
    pearls: [
      "Glycogen Storage Diseases: Von Gierke (Glucose-6-Phosphatase; severe hypoglycemia, lactic acidosis, hepatomegaly); Pompe (Lysosomal alpha-glucosidase; cardiomyopathy)",
      "Urea Cycle Disorders: Ornithine Transcarbamylase (OTC) deficiency is X-linked recessive; elevated orotic acid with hyperammonemia",
      "Rate-limiting enzymes: HMG-CoA reductase (cholesterol), PFK-1 (glycolysis), Acetyl-CoA carboxylase (fatty acid synthesis)"
    ]
  },

  // 2. MEDICINE - GENERAL & EXAM PEARLS
  {
    pattern: /5 Hacks.*NEET PG/i,
    pearls: [
      "Top-scoring high-yield triad: Emergency cardiology (ECG/Arrhythmia) + Clinical nephrology (Acid-Base/Electrolytes) + Neurology localization",
      "Focus heavily on Harrison criteria for infective endocarditis, rheumatology autoantibodies, and staging of kidney disease"
    ]
  },

  // 3. MEDICINE - CARDIOLOGY
  {
    pattern: /Takotsubo.*Brugada/i,
    pearls: [
      "Brugada Syndrome: SCN5A sodium channel mutation; pseudo-RBBB with coved ST-segment elevation in V1-V3; high risk of polymorphic VT/VF; ICD indicated",
      "Takotsubo Cardiomyopathy: Transient left ventricular apical ballooning with hypercontractile basal segments triggered by acute emotional/physical catecholamine surge"
    ]
  },
  {
    pattern: /ECG and Arrhythmias/i,
    pearls: [
      "Narrow complex regular tachycardia: SVT (AVNRT/AVRT); initial vagal maneuvers, then Adenosine 6mg rapid IV push",
      "Atrial Fibrillation: Irregularly irregular pulse without distinct P waves; rate control with beta-blockers/diltiazem, anticoagulation by CHA2DS2-VASc score",
      "Ventricular Tachycardia: Monomorphic VT with pulse: IV Amiodarone 150mg over 10 mins or synchronized cardioversion (100J)"
    ]
  },
  {
    pattern: /Hypokalemia & Hyperkalemia/i,
    pearls: [
      "Hyperkalemia ECG: Tall peaked T waves -> Prolonged PR & flat P -> Widened QRS -> Sine wave pattern; Emergency stabilization: IV Calcium gluconate 10% 10mL",
      "Hypokalemia ECG: Flattened/inverted T waves, ST-segment depression, prominent U waves, prolonged QT interval; predisposes to Torsades de Pointes"
    ]
  },
  {
    pattern: /Cardiology Image Based/i,
    pearls: [
      "STEMI localization: Leads II, III, aVF (Inferior - RCA); V1-V4 (Anterior - LAD); I, aVL, V5-V6 (Lateral - LCx)",
      "Echocardiogram: Asymmetric septal hypertrophy with SAM of anterior mitral leaflet indicates HOCM",
      "CXR findings: Boot-shaped heart in Tetralogy of Fallot; Egg-on-string appearance in Transposition of Great Arteries (TGA)"
    ]
  },
  {
    pattern: /Basic Life Support/i,
    pearls: [
      "High-Quality CPR: Chest compression rate of 100-120/min; compression depth 5-6 cm (adults); complete chest recoil after each compression",
      "Compression-to-ventilation ratio: 30:2 for single rescuers in adults, children, and infants (15:2 for 2-rescuer pediatric resuscitation)"
    ]
  },
  {
    pattern: /Pulseless Electrical Activity/i,
    pearls: [
      "PEA / Asystole: Non-shockable rhythms; immediately resume CPR for 2 minutes, administer Epinephrine 1 mg IV/IO every 3 to 5 minutes",
      "Always investigate reversible causes (5 H's: Hypovolemia, Hypoxia, Hydrogen ion/acidosis, Hypo/Hyperkalemia, Hypothermia; 5 T's: Tension pneumothorax, Tamponade, Toxins, Thrombosis PE, Thrombosis MI)"
    ]
  },
  {
    pattern: /Advanced Cardiac Life Support/i,
    pearls: [
      "Shockable rhythms (VF / Pulseless VT): Immediate defibrillation (120-200 J biphasic), 2 min CPR, shock, Epinephrine 1mg q3-5m, Amiodarone 300mg after 3rd shock",
      "Target post-cardiac arrest temperature management (TTM): 32°C - 36°C for at least 24 hours to optimize neurological recovery"
    ]
  },
  {
    pattern: /Mechanical Ventilation/i,
    pearls: [
      "ARDS Lung-Protective Strategy: Low tidal volume ventilation (4-8 mL/kg of predicted body weight, target 6 mL/kg PBW)",
      "Plateau Pressure (Pplat) safety limit: Maintain Pplat <= 30 cmH2O to prevent alveolar overdistension (barotrauma/volutrauma)",
      "Driving pressure (Pplat - PEEP): Target < 15 cmH2O is strongly correlated with increased survival in ARDS"
    ]
  },
  {
    pattern: /Massive Transfusion/i,
    pearls: [
      "Balanced 1:1:1 Hemostatic Resuscitation: Transfuse 1 unit Packed RBCs : 1 unit Fresh Frozen Plasma : 1 unit Platelets",
      "Lethal Triad Prevention: Aggressively counteract hypothermia, metabolic acidosis, and coagulopathy; monitor ionized calcium (citrate toxicity)"
    ]
  },
  {
    pattern: /\bArds\b/i,
    pearls: [
      "Berlin Definition of ARDS: Acute onset within 1 week of clinical insult; bilateral pulmonary opacities not fully explained by heart failure or fluid overload",
      "Severity by PaO2/FiO2 ratio with PEEP >= 5 cmH2O: Mild (201-300), Moderate (101-200), Severe (<= 100 mmHg); prone positioning indicated for P/F < 150"
    ]
  },
  {
    pattern: /Snake Bite/i,
    pearls: [
      "20-Minute Whole Blood Clotting Test (20WBCT): Rapid bedside test for venom-induced consumptive coagulopathy (VICC) in viper bites",
      "Elapid bites (Cobra, Krait): Neurotoxic paralysis with early ptosis, diplopia, bulbar palsy; trial of Neostigmine + Atropine test"
    ]
  },
  {
    pattern: /Infective Endocarditis/i,
    pearls: [
      "Modified Duke Criteria: 2 Major, 1 Major + 3 Minor, or 5 Minor criteria required for definitive diagnosis",
      "Major Criteria: Persistently positive blood cultures for typical organisms; Echocardiographic evidence of endocardial involvement (vegetation, abscess, new valvular regurgitation)",
      "Clinical signs: Janeway lesions (painless erythematous macules on palms/soles, septic emboli); Osler nodes (painful nodules on pads of fingers/toes, immune complex)"
    ]
  },

  // 4. MEDICINE - ENDOCRINOLOGY & METABOLISM
  {
    pattern: /Diabetic Ketoacidosis/i,
    pearls: [
      "Initial Fluid Resuscitation: 0.9% Normal Saline 1-1.5 L/hr in the 1st hour; evaluate serum potassium before starting IV insulin",
      "Insulin & Potassium rules: If K+ < 3.3 mEq/L, hold insulin and replace potassium; when glucose reaches 200 mg/dL, add 5% Dextrose to prevent hypoglycemia and cerebral edema"
    ]
  },
  {
    pattern: /Multiple Endocrine Neoplasia/i,
    pearls: [
      "MEN 1 (Wermer syndrome, MEN1 gene): 3 P's - Parathyroid adenoma (hypercalcemia), Pituitary adenoma (prolactinoma), Pancreatic islet cell tumors (gastrinoma)",
      "MEN 2A (Sipple syndrome, RET proto-oncogene): Medullary thyroid carcinoma + Pheochromocytoma + Parathyroid hyperplasia",
      "MEN 2B (RET mutation M918T): Medullary thyroid carcinoma (aggressive) + Pheochromocytoma + Mucosal neuromas & Marfanoid habitus"
    ]
  },
  {
    pattern: /Diseases of Anterior Pituitary/i,
    pearls: [
      "Prolactinoma: Most common functional pituitary adenoma; medical therapy with dopamine agonists (Cabergoline first-line, Bromocriptine) is preferred over surgery",
      "Visual field defect: Bitemporal hemianopia due to upward compression of optic chiasm by pituitary macroadenoma (> 10 mm)"
    ]
  },
  {
    pattern: /Endocrinology Image Based/i,
    pearls: [
      "Thyroid Scintigraphy: Graves disease shows diffusely increased radioactive iodine uptake; Subacute thyroiditis (de Quervain) shows low/absent uptake",
      "Cushing Disease: Pituitary MRI showing microadenoma; bilateral inferior petrosal sinus sampling (BIPSS) gold standard when MRI is equivocal",
      "Graves ophthalmopathy: Proptosis, lid lag, chemosis; CT orbit shows enlargement of extraocular muscle bellies with sparing of tendons"
    ]
  },
  {
    pattern: /Electrolyte Imbalances/i,
    pearls: [
      "Hyponatremia Correction Limit: Do not exceed 8 mEq/L in 24 hours to prevent irreversible Osmotic Demyelination Syndrome (Central Pontine Myelinolysis)",
      "Symptomatic severe hyponatremia (< 120 mEq/L with seizures/coma): 3% hypertonic saline 100 mL IV bolus over 10 mins, repeat up to twice if needed"
    ]
  },

  // 5. MEDICINE - NEPHROLOGY
  {
    pattern: /Bartter.*Gitelman.*Liddle/i,
    pearls: [
      "Bartter Syndrome: Loop of Henle NKCC2 cotransporter defect; mimics loop diuretics; hypokalemic metabolic alkalosis with hypercalciuria",
      "Gitelman Syndrome: Distal tubule NCCT cotransporter defect; mimics thiazide diuretics; hypokalemic metabolic alkalosis with hypocalciuria and hypomagnesemia",
      "Liddle Syndrome: ENaC channel gain-of-function mutation; severe hypertension, hypokalemic metabolic alkalosis, with suppressed renin and low aldosterone"
    ]
  },
  {
    pattern: /Thrombotic Thrombocytopenic Purpura/i,
    pearls: [
      "Classic Pentad (FAT RN): Fever, microAngiopathic hemolytic anemia (schistocytes on smear), Thrombocytopenia, Renal insufficiency, Neurologic abnormalities",
      "Pathophysiology & Management: Severe ADAMTS13 deficiency (< 10%); immediate therapeutic Plasma Exchange (PLEX) is lifesaving; platelet transfusions are contraindicated"
    ]
  },
  {
    pattern: /Renal Tubular Acidosis/i,
    pearls: [
      "Type 1 RTA (Distal): Impaired alpha-intercalated cell H+ secretion; urine pH > 5.5 despite systemic acidosis, nephrocalcinosis, hypokalemia",
      "Type 2 RTA (Proximal): Impaired HCO3- reabsorption; associated with Fanconi syndrome (glucosuria, aminoaciduria, phosphaturia); hypokalemia",
      "Type 4 RTA (Hyperkalemic): Hypoaldosteronism or aldosterone resistance; common in diabetic nephropathy; hyperkalemic normal anion gap metabolic acidosis"
    ]
  },

  // 6. MEDICINE - GASTROENTEROLOGY & HEPATOLOGY
  {
    pattern: /Zollinger Ellison/i,
    pearls: [
      "Gastrinoma Diagnosis: Fasting serum gastrin > 1000 pg/mL; Secretin stimulation test shows paradoxical increase in gastrin levels (> 120 pg/mL)",
      "Passaro's Gastrinoma Triangle: Junction of cystic and common bile duct, junction of 2nd and 3rd parts of duodenum, junction of neck and body of pancreas"
    ]
  },
  {
    pattern: /Hepatorenal Syndrome/i,
    pearls: [
      "Hepatorenal Syndrome (HRS): Marked splanchnic arterial vasodilation causing severe renal vasoconstriction and pre-renal failure unresponsive to albumin expansion",
      "First-line medical treatment: Terlipressin (vasoconstrictor) combined with intravenous 20% Albumin; definitive cure is liver transplantation"
    ]
  },
  {
    pattern: /Wilson Disease.*Hemochromatosis/i,
    pearls: [
      "Wilson Disease: Autosomal recessive ATP7B mutation; decreased serum ceruloplasmin, increased 24h urinary copper, Kayser-Fleischer rings on slit lamp; chelator: D-penicillamine / Trientine",
      "Hereditary Hemochromatosis: HFE gene mutation (C282Y homozygote); bronze diabetes, cirrhosis, pseudogout, dilated cardiomyopathy; treatment: therapeutic phlebotomy"
    ]
  },

  // 7. MEDICINE - HEMATOLOGY & ONCOLOGY
  {
    pattern: /Multiple Myeloma/i,
    pearls: [
      "CRAB Diagnostic Criteria: HyperCalcemia (> 11 mg/dL), Renal insufficiency (Cr > 2 mg/dL), Anemia (Hb < 10 g/dL), Bone lytic lesions on skeletal survey",
      "Laboratory findings: Monoclonal 'M' spike on serum protein electrophoresis, Bence Jones proteinuria (free light chains), bone marrow clonal plasma cells >= 10%"
    ]
  },
  {
    pattern: /Sickle Cell.*G-6pd/i,
    pearls: [
      "Sickle Cell Anemia: Point mutation in beta-globin gene codon 6 (GAG -> GTG, Glutamic acid -> Valine); Howell-Jolly bodies (functional asplenia), Salmonella osteomyelitis",
      "G6PD Deficiency: X-linked recessive; episodic acute hemolysis triggered by fava beans, primaquine, dapsone, infection; Heinz bodies and bite cells on smear"
    ]
  },

  // 8. MEDICINE - NEUROLOGY
  {
    pattern: /\bStroke\b/i,
    pearls: [
      "Ischemic Stroke Thrombolytic Window: IV Alteplase / Tenecteplase within 4.5 hours of last known normal (provided no contraindications and non-contrast CT excludes hemorrhage)",
      "Mechanical Thrombectomy Window: Large vessel occlusion (LVO) of anterior circulation up to 24 hours based on mismatch on CT perfusion / MR diffusion"
    ]
  },
  {
    pattern: /Epilepsy and EEG/i,
    pearls: [
      "Absence Seizures: Classic 3 Hz generalized spike-and-wave discharge on EEG; drug of choice is Ethosuximide (or Valproate)",
      "Juvenile Myoclonic Epilepsy (JME): Bilateral polyspike-and-wave discharges; morning myoclonic jerks; drug of choice is Valproate (Levetiracetam in females of childbearing age)"
    ]
  },
  {
    pattern: /Raised ICP and Brain Death/i,
    pearls: [
      "Cushing's Triad of Raised ICP: Hypertension with widened pulse pressure, Bradycardia, and Irregular/depressed respirations (impending brain herniation)",
      "Brain Death Protocol: Irreversible coma, complete absence of brainstem reflexes (pupillary, corneal, oculocephalic, gag/cough), and positive apnea test (PaCO2 >= 60 mmHg)"
    ]
  },
  {
    pattern: /Meningitis/i,
    pearls: [
      "Bacterial CSF profile: Markedly elevated opening pressure, neutrophilic pleocytosis (> 1000/uL), high protein (> 100 mg/dL), low glucose (CSF/serum glucose ratio < 0.4)",
      "Empiric antimicrobial regimen: Ceftriaxone 2g IV q12h + Vancomycin + Dexamethasone (give with or before 1st antibiotic dose to reduce hearing loss and mortality)"
    ]
  },
  {
    pattern: /Myasthenia Gravis/i,
    pearls: [
      "Pathophysiology: Autoantibodies against postsynaptic acetylcholine receptors (AChR-Ab, 85%) or MuSK; fluctuating fatigable weakness, ptosis, diplopia worse at end of day",
      "Diagnosis & Management: Decremental response on repetitive nerve stimulation; Pyridostigmine (AChE inhibitor); screening CT chest for thymoma (present in 10-15%)"
    ]
  },
  {
    pattern: /Guillian Barre/i,
    pearls: [
      "Clinical Presentation: Rapidly progressive ascending symmetrical flaccid paralysis with areflexia following Campylobacter jejuni or viral gastroenteritis/URI",
      "CSF Finding: Albuminocytologic dissociation (elevated protein with normal WBC count after 1st week); treatment: IVIG or Plasmapheresis (corticosteroids ineffective)"
    ]
  },
  {
    pattern: /Subarachnoid Hemorrhage/i,
    pearls: [
      "Clinical Presentation: Sudden onset 'worst headache of life' (thunderclap headache); 85% caused by rupture of saccular (berry) aneurysm at circle of Willis",
      "Workup & Complications: Non-contrast head CT (> 95% sensitive in first 6h); lumbar puncture for xanthochromia if CT negative; Nimodipine to prevent delayed cerebral vasospasm"
    ]
  },

  // 9. MEDICINE - RHEUMATOLOGY & IMMUNOLOGY
  {
    pattern: /Systemic Lupus Erythematosus/i,
    pearls: [
      "Serological Markers: ANA (most sensitive screening test, > 98%), Anti-dsDNA (specific, correlates with lupus nephritis activity), Anti-Smith (most specific for SLE)",
      "Lupus Nephritis: Class IV (diffuse proliferative) is most severe and common; 'wire loop' subendothelial deposits on biopsy; treated with Cyclophosphamide or MMF + steroids"
    ]
  },
  {
    pattern: /\bVasculitis\b/i,
    pearls: [
      "Granulomatosis with Polyangiitis (GPA): c-ANCA (anti-PR3 positive); necrotizing granulomas of upper respiratory tract (saddle nose), lungs (cavities), and kidneys (RPGN)",
      "Microscopic Polyangiitis (MPA) & Churg-Strauss (EGPA): p-ANCA (anti-MPO positive); EGPA characterized by severe asthma, marked eosinophilia, and extravascular granulomas"
    ]
  },

  // 10. MEDICINE - PULMONOLOGY
  {
    pattern: /Pulmonary Thromboembolism/i,
    pearls: [
      "Diagnostic Workup: CT Pulmonary Angiography (CTPA) is gold standard investigation; Wells score defines clinical probability; D-dimer high negative predictive value",
      "ECG & Hemodynamics: S1Q3T3 pattern (specific but insensitive for acute RV strain); massive PE with hypotension (systolic BP < 90 mmHg) warrants immediate thrombolysis"
    ]
  },
  {
    pattern: /Fat Embolism/i,
    pearls: [
      "Classic Clinical Triad: Respiratory distress (hypoxemia), Neurological deficits (confusion/coma), and Petechial rash (conjunctiva, neck, axillae) 24-72h after long bone fracture",
      "Management: Early surgical fracture stabilization reduces risk; supportive oxygenation and ventilatory care; systemic steroids remain controversial"
    ]
  },
  {
    pattern: /Flow Volume Curve.*Dlco/i,
    pearls: [
      "Obstructive vs Restrictive: FEV1/FVC < 0.70 defines obstructive defect (scooped-out expiratory flow-volume loop); normal/high FEV1/FVC with low TLC defines restrictive defect",
      "DLCO Differentiation: Reduced DLCO in Emphysema, Idiopathic Pulmonary Fibrosis, and Pulmonary Hypertension; normal/elevated DLCO in Bronchial Asthma"
    ]
  },
  {
    pattern: /ABG Analysis Simplified/i,
    pearls: [
      "Primary Step: pH < 7.35 (acidemia) vs > 7.45 (alkalemia); evaluate directional change of PaCO2 and HCO3- (ROME: Respiratory Opposite, Metabolic Equal)",
      "High Anion Gap Metabolic Acidosis (HAGMA): AG = Na - (Cl + HCO3); normal AG 8-12 mEq/L; causes (MUDPILES: Methanol, Uremia, DKA, Paraldehyde, Iron/INH, Lactic acidosis, Ethylene glycol, Salicylates)",
      "Winter's Formula for metabolic acidosis compensation: Expected PaCO2 = 1.5 * [HCO3-] + 8 (+/- 2)"
    ]
  },
  {
    pattern: /\bAids\b/i,
    pearls: [
      "CD4 Prophylaxis Thresholds: CD4 < 200/uL -> Pneumocystis jirovecii pneumonia (TMP-SMX); CD4 < 100/uL -> Toxoplasma gondii & Cryptococcus; CD4 < 50/uL -> MAC (Azithromycin)",
      "Antiretroviral Therapy (ART): 2 NRTIs (Tenofovir + Emtricitabine/Lamivudine) + 1 INSTI (Dolutegravir or Bictegravir); initiate promptly regardless of CD4 count"
    ]
  },

  // 11. SURGERY - CLINICAL PEARLS
  {
    pattern: /Case of Post-Op Fever/i,
    pearls: [
      "The 5 W's Chronological Framework: Day 1-2 Wind (Atelectasis/pneumonia), Day 3 Water (UTI), Day 5 Wound (Surgical site infection), Day 7+ Walking (DVT/PE), Any day Wonder drugs (Drug fever)",
      "Day 1 fever with sudden wound bronzing and gas formation: Necrotizing soft tissue infection (Clostridium perfringens or Group A Strep) requiring emergent surgical debridement"
    ]
  },
  {
    pattern: /Shock Part/i,
    pearls: [
      "Hemodynamic Profiling: Hypovolemic & Cardiogenic shock feature high SVR with cold peripheries; Distributive/Septic shock features warm peripheries with low SVR and hyperdynamic CO",
      "Initial Resuscitation: Crystalloid fluid bolus 30 mL/kg within 3 hours for sepsis; Norepinephrine is first-line vasopressor to target Mean Arterial Pressure (MAP) >= 65 mmHg"
    ]
  },
  {
    pattern: /Breast Case Discussion/i,
    pearls: [
      "Triple Assessment of Breast Lump: 1. Clinical examination, 2. Bilateral mammography and/or USG, 3. Pathological evaluation (Core needle biopsy is gold standard, FNAC cannot assess invasiveness)",
      "Receptor Status & Therapy: ER/PR positive (endocrine therapy: Tamoxifen in premenopausal, Aromatase inhibitors in postmenopausal); HER2 positive (Trastuzumab targeted therapy)"
    ]
  },
  {
    pattern: /Case of Swelling of Neck/i,
    pearls: [
      "Midline Neck Masses: Thyroglossal Duct Cyst (moves upwards on both swallowing AND tongue protrusion; Sistrunk procedure); Thyroid nodule (moves with swallowing only)",
      "Lateral Neck Masses: Branchial Cleft Cyst (anterior border of upper 1/3 sternocleidomastoid); Cystic Hygroma (transilluminates brilliantly in posterior triangle)"
    ]
  },
  {
    pattern: /Upper GI Hemorrhage/i,
    pearls: [
      "Immediate Management: 2 large-bore (16-18G) IV lines, crystalloid resuscitation, restrictive blood transfusion (target Hb 7-9 g/dL), high-dose IV PPI bolus and infusion",
      "Endoscopic Intervention: Perform esophagogastroduodenoscopy (EGD) within 24 hours; Forrest classification for peptic ulcer bleeding risk (Forrest Ia/Ib/IIa require endoscopic therapy)"
    ]
  },
  {
    pattern: /Clinical Case Discussion - Lump/i,
    pearls: [
      "Surgical Physical Signs: Fluctuation (presence of fluid), Translucency (clear fluid like hydrocele/cystic hygroma), Compressibility (hemangioma/vascular malformation)",
      "Fixity Rules: Lump moves with contraction of muscle lies within or deep to that muscle; lump becomes prominent with muscle contraction lies superficial to the muscle plane"
    ]
  },
  {
    pattern: /Abdominal Emergencies/i,
    pearls: [
      "Acute Peritonitis: Involuntary abdominal guarding, board-like rigidity, and rebound tenderness; erect chest/abdominal X-ray demonstrating free air under the right hemidiaphragm indicates perforated hollow viscus",
      "Acute Mesenteric Ischemia: Severe postprandial abdominal pain out of proportion to mild physical exam findings; CT angiography is diagnostic test of choice"
    ]
  },
  {
    pattern: /Clinical Case.*Scrotal/i,
    pearls: [
      "Testicular Torsion vs Epididymitis: Negative Prehn sign (no pain relief with scrotal elevation) and absent cremasteric reflex indicate torsion (surgical emergency: detorsion within 6 hours)",
      "Scrotal Transillumination: Positive in Hydrocele and Spermatocele; negative in Varicocele, Hernia, and Testicular malignancy"
    ]
  },
  {
    pattern: /Basics of Trauma|Abdominal Trauma|Thoracic Trauma|Head Trauma|Trauma - Emergency/i,
    pearls: [
      "ATLS Primary Survey (ABCDE): Airway with cervical spine protection, Breathing and ventilation, Circulation with hemorrhage control, Disability (GCS & pupils), Exposure and hypothermia control",
      "Tension Pneumothorax: Immediate needle thoracostomy (5th intercostal space anterior axillary line or 2nd ICS midclavicular line) followed by tube thoracostomy; do NOT wait for chest X-ray",
      "eFAST Examination: Rapid ultrasound assessment of 4 acoustic windows (Hepatorenal/Morison pouch, Splenorenal, Pelvic/suprapubic, Pericardial, and bilateral pleura for pneumothorax)"
    ]
  },
  {
    pattern: /Clinical Case Discussion - Inguinoscrotal/i,
    pearls: [
      "Anatomy of Inguinal Hernias: Indirect hernia passes through deep inguinal ring, lateral to inferior epigastric vessels; Direct hernia protrudes through Hesselbach's triangle, medial to inferior epigastric vessels",
      "Internal Ring Occlusion Test: Finger placed 1.25 cm above midinguinal point; impulse on cough prevented indicates Indirect Inguinal Hernia"
    ]
  },
  {
    pattern: /Deep Vein Thrombosis/i,
    pearls: [
      "Virchow's Triad of Thrombosis: Venous stasis (prolonged bed rest/surgery), Endothelial damage (trauma/catheter), Hypercoagulability (malignancy, factor V Leiden, antiphospholipid syndrome)",
      "Diagnostic & Therapeutic standard: Compression duplex ultrasonography is primary test; Wells clinical score; initial anticoagulation with DOACs (Apixaban/Rivaroxaban) or LMWH"
    ]
  }
];

let totalTopics = 0;
let highYieldCount = 0;
let standardCount = 0;

(catalog.subjects || []).forEach(sub => {
  (sub.modules || []).forEach(mod => {
    (mod.topics || []).forEach(topic => {
      totalTopics++;
      
      const matchingRule = HIGH_YIELD_RULES.find(r => r.pattern.test(topic.title));
      if (matchingRule) {
        topic.is_high_yield = true;
        topic.pearls = matchingRule.pearls;
        highYieldCount++;
      } else {
        topic.is_high_yield = false;
        topic.pearls = [];
        standardCount++;
      }
    });
  });
});

console.log(`Processing complete:`);
console.log(`Total topics: ${totalTopics}`);
console.log(`High-Yield topics: ${highYieldCount} (${Math.round((highYieldCount/totalTopics)*100)}%)`);
console.log(`Standard topics: ${standardCount} (${Math.round((standardCount/totalTopics)*100)}%)`);

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
console.log(`Successfully updated ${catalogPath}`);
