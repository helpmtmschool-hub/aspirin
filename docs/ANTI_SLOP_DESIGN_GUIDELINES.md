# 🚫 Anti-Slop Design Guidelines & Prohibited AI Patterns

**Target:** Aspirin LMS Flutter Mobile Application (Android)  
**Purpose:** Establish non-negotiable visual, architectural, and UX guardrails to prevent generic, uninspired, and recognizable "AI slop" from entering the application.

---

## 1. What is "AI Slop" in Mobile Software?

"AI slop" refers to the emergence of interchangeable, formulaic, and superficial design patterns produced by Large Language Models trained on generic internet templates. When asked to design an interface, LLMs repeatedly default to the same statistical cliches: **purple/neon glow meshes, uncalibrated glassmorphism, three identical feature cards, generic 'Inter' typography at every weight, meaningless buzzword copy, and broken mobile edge-cases**.

In medical software, AI slop is particularly fatal:
* Medical students and doctors study under cognitive exhaustion. Gimmicky neon glows and translucent cards increase eye strain.
* High-stakes medical content demands **precision, high contrast, authoritative typography, and bulletproof offline reliability**, not trendy Dribbble mockups.

---

## 2. Master Table of Prohibited AI Tells

| Category | Banned AI Slop Pattern | Why It Fails | What to Implement Instead |
| :--- | :--- | :--- | :--- |
| **Color** | **The "Lila / Cyber-Purple" Gradient** (`#8B5CF6`, `#A855F7` glows) | The universal signature of cheap AI templates; completely out of place in clinical medicine. | **Clinical Dual-Engine Palette**: Marrow Deep Teal (`#00A389`) or PrepLadder Indigo (`#6366F1`) on grounded slate/charcoal neutrals. |
| **Surfaces** | **Indiscriminate Glassmorphism** (`BackdropFilter` on every card) | Murky legibility, high GPU repaints, destroys battery on budget Android devices. | **Solid elevated cards** with subtle 1px borders (`#1E293B` on `#0B0F19`), tinted drop shadows, or clean divider lines. |
| **Contrast** | **Pure Black (`#000000`) & Pure White (`#FFFFFF`) extremes** | Extreme contrast causes halation and visual fatigue during 8-hour study shifts. | **Off-black bases** (`#0B0F19`, `#131B2E`) and softened white text (`#F8FAFC`, `#E2E8F0`). |
| **Typography** | **The "Inter at Every Scale" Default** | Sterile, corporate, and indistinguishable from 10,000 generic SaaS apps. | **High-readability Humanist/Grotesque pairing**: `Outfit` for authoritative headers and `Plus Jakarta Sans` for dense medical body text. |
| **Typography** | **Unjustified Editorial Serif Injection** (e.g. Fraunces, Instrument Serif) | LLMs default to serifs believing "serif = premium". Medical LMS apps are clinical toolsets, not lifestyle magazines. | **Clean, modern sans-serif display**. Serifs are barred from UI controls, cards, and lecture listings. |
| **Punctuation** | **The Em-Dash (`—`) Overuse** | The #1 linguistic tell of AI-generated copy across headers, cards, and metadata. | **Zero em-dashes**. Use hyphens (`-`), line breaks, parentheticals, or clean commas. |
| **Layout** | **The "Three Equal Cards" Row** | Repetitive 3-column symmetrical boxes where each box has an icon, title, and 2 lines of text. | **Varied architectural rhythm**: Asymmetric bento cells, collapsibles, horizontal carousels, and master-detail lists. |
| **Layout** | **Floating Eyebrow Overload** (`MODULE OVERVIEW`, `HIGH YIELD`) on every header | Clutters the viewport and creates a monotonous, robotic rhythm. | **Restraint**: Maximum 1 eyebrow per 3 screen sections. Let clean headlines speak for themselves. |
| **UX** | **Generic "Next-Next-Next" Carousel Onboarding** | Explains obvious things like "Watch Videos" and "Read Notes" instead of showing value. | **Zero-Friction Direct Entry**: Open directly to Home with search and 1-tap lecture resumption. |
| **Data** | **"Jane Doe / Acme" Placeholder Data** | Destroys credibility and looks like a dummy wireframe. | **Authentic Indian MBBS faculty and real clinical topics** (Dr. Rohan Khandelwal, Dr. Gobind Rai Garg; Intestinal Obstruction, Glomerulonephritis). |
| **Data** | **Fake-Perfect Numbers** (`100%`, `50%`, `99.9%`) | Reads as artificial and untrustworthy. | **Realistic study telemetry**: `47.2% completed`, `18m left of 42m`, `3.2 hrs today`. |
| **Icons** | **Emoji-as-System-Icon Syndrome** (using 🦴, 🫀 as buttons) | Unprofessional, breaks platform consistency across Android versions. | **Consistent stroke vector icons** from a single vetted family (`hugeicons`, `phosphor`, or custom clinical SVGs). |
| **Iconography** | **The Sparkle Icon / Magic Wand** (`✨`, `Icons.auto_awesome`, `sparkles`) | Universal cliché of forced, superficial AI hype; completely destroys serious clinical authority. | **Zero sparkle icons anywhere**. Use precise medical & functional symbols (stethoscope, bookmark, clock, search). |
| **Gamification** | **Infantilizing Confetti, Coins & Cartoon Pets** | Demeans medical doctors studying for postgraduate entrance exams. | **Clinical achievement telemetry**: Exam countdowns, study streak counters, revision completion velocity. |

---

## 3. Visual & Aesthetic Anti-Patterns (Detailed Rules)

### 3.1 The Neon / Gradient Ban
```dart
// ❌ BANNED: The quintessential AI purple-cyan cyber glow
Container(
  decoration: BoxDecoration(
    gradient: LinearGradient(
      colors: [Color(0xFF8B5CF6), Color(0xFF06B6D4)],
    ),
    boxShadow: [
      BoxShadow(
        color: Color(0xFF8B5CF6).withOpacity(0.6),
        blurRadius: 24,
        spreadRadius: 4,
      ),
    ],
  ),
);

// ✅ ALLOWED: Clinical Marrow Teal with disciplined tinted surface
Container(
  decoration: BoxDecoration(
    color: const Color(0xFF1E293B),
    borderRadius: BorderRadius.circular(12),
    border: Border.all(
      color: const Color(0xFF334155),
      width: 1,
    ),
    boxShadow: const [
      BoxShadow(
        color: Color(0x1A000000),
        blurRadius: 8,
        offset: Offset(0, 2),
      ),
    ],
  ),
);
```

### 3.2 The Glassmorphism Abuse Ban
* **Rule:** Do not wrap normal list items, subject cards, or video tiles in `BackdropFilter` or translucent blur layers.
* **Cost:** On budget Android phones (common among medical interns), blurring 15 list items in a ListView drops frame rates from 60 FPS to 18 FPS and drains the battery rapidly.
* **Permitted Exception:** Glassmorphism is permitted **only** on fixed top app bars or floating audio player pills, and **must** degrade to a solid color if the device OS signals low-power mode.

### 3.3 The Single Corner Radius Rule
* **Rule:** Pick one coherent radius scale across the app. Do not mix pill buttons, square cards, 8px inputs, and 24px dialogs in the same view.
* **Aspirin Standard:**
  * Small tags/chips: `6px`
  * Standard cards & text inputs: `12px`
  * Modals & bottom sheets: `16px` (top corners only)
  * Action buttons: `10px` or full pill for quick filters.

---

## 4. Typography & Copywriting Slop

### 4.1 The Em-Dash (`—`) Absolute Ban
The em-dash character is the single most recognizable fingerprint of LLM text generation.
* **Banned:** `"Surgery — Intestinal Obstruction — 42 mins"`
* **Allowed:** `"Surgery: Intestinal Obstruction (42 mins)"` or `"Surgery • Intestinal Obstruction • 42 mins"`

### 4.2 Prohibited Buzzword Verbs
Never use marketing filler verbs in UI microcopy, empty states, or onboarding:
* ❌ *Elevate your clinical learning*
* ❌ *Seamlessly unleash your medical potential*
* ❌ *Supercharge your revision with next-gen intelligence*
* ❌ *Revolutionize your study workflow*

**Clinical Replacement Standard:** Use concrete, functional actions:
* ✅ *Resume Intestinal Obstruction from 14:20*
* ✅ *Download 14 lectures for offline ward revision*
* ✅ *Review 18 high-yield pearls for INI-CET*

---

## 5. UX & Mobile Interaction Anti-Patterns

### 5.1 No Neglected Empty States ("The Desert")
When an empty state occurs (e.g. no downloads yet, no search results found), AI models frequently generate a blank screen with a tiny centered label: `"No items"`.

**Required Pattern:** Every empty state must have:
1. A clear, human-centered explanation.
2. A contextual illustration or relevant icon.
3. A direct, 1-tap call-to-action button.

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                    [ 📥 Cloud Icon ]                   │
│                                                        │
│             No Lectures Downloaded Yet                 │
│   Download lectures over Wi-Fi to continue studying    │
│    during hospital postings without connectivity.      │
│                                                        │
│             [ 📚 Browse 19 Subjects ]                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5.2 No Raw Settings Dumps
Never present settings as a flat, unorganized list of 25 switches. Group settings into clear clinical domains:
* **Playback & Video:** Default speed, streaming quality, cellular download warning.
* **Appearance & Theme:** Marrow Teal, PrepLadder Indigo, OLED Pure Black.
* **Storage & Offline:** Cached files, downloaded video size, clear cache button.
* **Account & Device:** Active hardware session, sync status.

### 5.3 The Absolute Ban on the Sparkle Icon ("✨" / `Icons.auto_awesome` / `LucideIcons.sparkles` / Magic Wand)
The four-pointed or multi-pointed star sparkle glyph has degenerated into the single most recognizable visual cliché of low-effort, superficial "AI features" slapped onto software. In a serious medical learning platform, sparkle icons look childish, distracting, and unscientific.

* **Hard Ban:** The sparkle icon in any form (Unicode `✨`, Flutter Material `Icons.auto_awesome`, `LucideIcons.sparkles`, `PhosphorIcons.sparkle`, or custom starburst SVGs) is **strictly forbidden across all screens and components**.
* **Forbidden Placements:**
  * **Never in Search Bars:** Do not add sparkles to simulate "AI Search" or "Smart Search". Use a clean magnifying glass icon (`LucideIcons.search`).
  * **Never in High-Yield Pearls:** Do not use sparkles to badge exam recall points or pearls. Use a clinical bookmark (`LucideIcons.bookmark`), clinical gem, or dot bullet.
  * **Never on Resume Cards or Recommendations:** Do not label recommended lectures or last-watched items with sparkles. Use standard play (`LucideIcons.play`), history, or clock glyphs.
  * **Never on Action Buttons or Chips:** No "magic" buttons or sparkle filter chips.
  * **Never in Splash or Onboarding:** No decorative starbursts or fairy-dust graphics.

### 5.4 No Fake "AI Chatbot" Overlays
Do not add floating chatbot bubbles, magical assistant buttons, or conversational overlays floating over the video player or syllabus. Aspirin LMS is an educational content delivery system, not an experimental chatbot demo.

---

## 6. Performance & Code-Level Anti-Patterns

### 6.1 State Management Jank
* **Banned:** Calling `setState` inside scroll controllers, video progress timers, or gesture drag updates. This causes the entire widget tree to rebuild on every frame, generating micro-stutters during lecture scrubbing.
* **Required:** Use targeted Riverpod providers (`ref.watch(progressProvider.select(...))`) or `ValueListenableBuilder` to re-render only the specific time label or progress slider.

### 6.2 The Hand-Rolled Icon Anti-Pattern
* **Banned:** Hand-coding raw SVG path strings (`Path()..moveTo(10, 20)..cubicTo(...)`) for standard icons. They result in inconsistent stroke weights, bad hitboxes, and alignment artifacts.
* **Required:** Use vetted icon sets (`lucide_icons` or `phosphor`) with globally locked `strokeWidth: 1.5`.

### 6.3 Hardcoded Magic Numbers
* **Banned:** Arbitrary layout coordinates (`SizedBox(height: 37)`, `Padding(top: 19)`).
* **Required:** Adhere to an 8-point spatial grid (`4`, `8`, `12`, `16`, `24`, `32`, `48`).

---

## 7. Pre-Flight Anti-Slop Audit Checklist

Before committing any feature or UI screen, the engineer or AI assistant must verify:

- [ ] **Zero Sparkle Icons:** Are all screens and buttons completely free of sparkle icons (`✨`, `Icons.auto_awesome`, `LucideIcons.sparkles`, `PhosphorIcons.sparkle`)?
- [ ] **No Lila/Cyber-Purple glows:** Are accents strictly locked to Marrow Teal or PrepLadder Indigo?
- [ ] **Zero Em-Dashes (`—`):** Is the visible text completely free of em-dashes?
- [ ] **No Hand-Rolled SVG icons:** Are all icons drawn from a single standardized family?
- [ ] **No Glassmorphism on lists:** Are all scrolling items using solid, performant surfaces?
- [ ] **Realistic Medical Data:** Are clinical topic names and faculty titles 100% authentic?
- [ ] **Button Contrast Tested:** Does all button text pass WCAG AA (4.5:1 minimum contrast)?
- [ ] **Empty States Designed:** Does the screen handle 0 items gracefully with a clear CTA?
- [ ] **Hardware Back Button Respected:** Does pressing Android back navigate gracefully without exiting unexpectedly?
- [ ] **120 FPS Fluidity:** Does scrolling through all 19 subjects maintain a steady 60/120 FPS on physical devices?
