# ACE Altius — AI Illustration Generation Prompts

## Master Style Reference

All illustrations must match the **Storyset "cuate" style** — the reference files are `Thinking face-cuate.svg` and `Good team-cuate.svg`.

### Style Fingerprint

- **Flat 2D vector illustration** — no 3D, no gradients, no baked-in shadows or glows
- **Full-scene compositions** with decorative background elements (floating shapes, dashed lines, small geometric ornaments)
- **Clean outlines** on all elements, roughly 1–2px weight
- **Solid fills only** — no gradients, no textures
- **Character anatomy**: slightly stylised proportions, rounded facial features, expressive but simple eyes
- **Output format**: SVG (vector) preferred; PNG with transparent background acceptable
- **Canvas**: square (500×500 or 800×800) with plenty of breathing room around the character

### Brand Color Palette (STRICT — no other colors)

| Role | Hex |
|---|---|
| Dark teal — primary fills (clothing, large areas) | `#0A3F3A` |
| Orange — accents (shoes, bags, small highlights) | `#E48328` |
| Blue — props (folders, phones, stethoscopes, screens) | `#2083B9` |
| Off-white — skin tones, eyes, highlights | `#E6E8E7` |
| White — paper, teeth, shirt highlights | `#FFFFFF` |
| Light grey — decorative background shapes only | `#DBDBDB` or `#EBEBEB` |

> ⚠️ No greens, purples, pinks, reds, or any color outside this list. No drop shadows. No baked-in glow effects.

---

## Asset List & Individual Prompts

---

### 1. `plane.png` — Top-view Airplane

**Usage**: Flies across screen during page transition animation (AirplaneTransition.tsx).  
**Format**: PNG, transparent background, ~600×600px  
**Orientation**: Bird's-eye / top-down view (looking down at the plane from above)

**Prompt:**
> Flat 2D vector illustration of a commercial passenger airplane viewed from directly above (top-down bird's-eye perspective). The fuselage is a long oval shape in `#0A3F3A` (dark teal). Wings are swept back, filled with `#0A3F3A`. Engine nacelles on wings are `#E48328` (orange) accent ovals. The tail fin and horizontal stabilisers are `#2083B9` (blue). Small oval windows along the fuselage are `#E6E8E7` (off-white). Clean black outline strokes on all elements. Solid fills, no gradients, no shadows. Transparent background. Storyset cuate flat illustration style. 500×500 canvas, plane centered with breathing room on all sides.

**Notes:**
- The plane will be scaled to 180–280px wide in the app, so keep details readable at small size
- No passengers visible through windows — just oval window shapes
- The nose should point upward (toward top of canvas) since the animation moves the plane upward

---

### 2. `student-sad.svg` — Sad / Dreaming Student (Section 2, Left)

**Usage**: Page 2 of landing — "Before ACE" state. Student sitting dejected on a bench.  
**Format**: SVG, transparent background  
**Canvas**: 500×500, character takes up bottom ~60% of frame

**Prompt:**
> Flat 2D vector illustration in Storyset cuate style. A young South Asian male student sitting on a wooden bench, slumped posture, chin resting on one hand propped on his knee. He wears a `#0A3F3A` (dark teal) shirt and dark trousers. Shoes are `#E48328` (orange). His face is `#E6E8E7` (off-white/light skin), expression sad or worried. Above his head floats a dream/thought bubble containing a graduation cap icon in `#2083B9` (blue) — the cap he wishes for. Beside the bench sits a small travel suitcase in `#E48328` (orange). Background: decorative small question marks and dashed lines in `#DBDBDB` grey scattered around. All fills solid, no gradients. Black outlines. Transparent background. Storyset cuate illustration style.

**Notes:**
- Sitting pose, not standing — this is the "lost/overwhelmed" state
- Thought bubble should be clearly a dream/wish (use dotted bubble border, not solid speech bubble)
- Keep character South Asian (matches target user demographic)

---

### 3. `student-ready.svg` — Ready / Hopeful Student (Section 2, Right)

**Usage**: Page 2 — "After ACE" state. Confident student standing with documents ready.  
**Format**: SVG, transparent background  
**Canvas**: 500×500

**Prompt:**
> Flat 2D vector illustration in Storyset cuate style. A young South Asian male student standing upright, confident posture, slight smile. He wears a `#0A3F3A` (dark teal) shirt. One hand holds a `#2083B9` (blue) document folder. He has a `#E48328` (orange) backpack on his back. Shoes are `#E48328` (orange). Face and skin are `#E6E8E7` (off-white). Background: decorative small checkmarks, stars, and confetti dots in `#DBDBDB` and `#E48328`. Small upward energy lines radiate from the character suggesting enthusiasm. All fills solid, no gradients. Black outlines. Transparent background. Storyset cuate illustration style.

**Notes:**
- This is the positive contrast to student-sad — same character, different mood
- Energy lines (3–4 short curved lines) around shoulders/head suggest confidence
- He should look like he's about to step forward

---

### 4. `student-walking.svg` — Walking Student (Section 3, Stage 1)

**Usage**: Page 3, bottom-left — first stage of the 4-stage journey diagonal.  
**Format**: SVG, transparent background  
**Canvas**: 500×500

**Prompt:**
> Flat 2D vector illustration in Storyset cuate style. A young South Asian male student walking mid-stride, seen from a 3/4 front angle. He wears a `#0A3F3A` (dark teal) jacket over a light shirt. He carries a `#E48328` (orange) backpack. One hand holds a phone or small notebook. Shoes are `#E48328` (orange). Face is `#E6E8E7` (off-white), expression focused and determined. Background: small dashed path lines and tiny footstep marks in `#DBDBDB`. All fills solid, no gradients. Black outlines. Transparent background. Storyset cuate illustration style.

**Notes:**
- Mid-stride: one leg forward, one back — conveys movement
- This is the earliest/youngest stage — appearance should look like an undergrad student
- Backpack is key prop, distinguishes this stage

---

### 5. `student-confident.svg` — Confident Consultant Student (Section 3, Stage 2)

**Usage**: Page 3, second stage — slightly more polished than stage 1.  
**Format**: SVG, transparent background  
**Canvas**: 500×500

**Prompt:**
> Flat 2D vector illustration in Storyset cuate style. A young South Asian male standing tall, confident, arms slightly out or one hand on hip. He wears `#0A3F3A` (dark teal) trousers and a white shirt. He has round glasses (thin `#0A3F3A` frames). A `#2083B9` (blue) headset/earphones are visible. He holds a `#2083B9` (blue) tablet or clipboard. Shoes are `#E48328` (orange). Face is `#E6E8E7` (off-white), expression confident and composed. Background: decorative small circular rings and small lightning bolt icons in `#DBDBDB`. All fills solid, no gradients. Black outlines. Transparent background. Storyset cuate illustration style.

**Notes:**
- Glasses are a key visual differentiator from stage 1 (same character, evolved)
- Headset suggests student portal / online consultation
- Slightly more formal than stage 1 but not fully professional yet

---

### 6. `student-professional.svg` — Dual-Career Professional (Section 3, Stage 3)

**Usage**: Page 3, third stage — representing specialized career paths.  
**Format**: SVG, transparent background  
**Canvas**: 500×500

**Prompt:**
> Flat 2D vector illustration in Storyset cuate style. A young South Asian male standing proudly. He wears a `#0A3F3A` (dark teal) engineer's hard hat on his head and holds a `#2083B9` (blue) stethoscope in one hand — representing dual career success (engineering and medicine). He wears a professional white lab coat over `#0A3F3A` dark trousers. The stethoscope dangles from his hand, earpieces in `#2083B9` (blue). Shoes are `#E48328` (orange). Face is `#E6E8E7` (off-white), expression proud and accomplished. Background: small gear icons and small medical cross icons in `#DBDBDB` scattered around. All fills solid, no gradients. Black outlines. Transparent background. Storyset cuate illustration style.

**Notes:**
- Hard hat + stethoscope combo is intentional — represents multiple career paths ACE students take
- Lab coat should be clearly white (#FFFFFF) with `#0A3F3A` outline
- This is stage 3 of 4 — character should look more mature/successful than previous stages

---

### 7. `student-corporate.svg` — Corporate Success (Section 3, Stage 4)

**Usage**: Page 3, top-right — final stage, peak success.  
**Format**: SVG, transparent background  
**Canvas**: 500×500

**Prompt:**
> Flat 2D vector illustration in Storyset cuate style. A young South Asian male in a sharp `#0A3F3A` (dark teal) business suit, standing tall with a rolling travel suitcase in `#E48328` (orange) beside him. He holds a `#2083B9` (blue) smartphone in one raised hand, looking at it confidently. His other hand grips the suitcase handle. He wears a white shirt with a `#2083B9` (blue) tie. Shoes are `#E48328` (orange). Face is `#E6E8E7` (off-white), expression successful and at ease. Background: small plane silhouettes and city building outlines in `#DBDBDB`. All fills solid, no gradients. Black outlines. Transparent background. Storyset cuate illustration style.

**Notes:**
- Rolling suitcase is the key prop — suggests international travel and success
- This is the "destination achieved" stage — most polished appearance
- Suit jacket lapels should be visible and clean

---

### 8. `student-aspiring.svg` — The Aspiring Vision (Section 4)

**Usage**: Page 4 — hero illustration for the final CTA section "Your future starts here."  
**Format**: SVG, transparent background  
**Canvas**: 500×500 (or taller — 500×600 if needed for the composition)

**Prompt:**
> Flat 2D vector illustration in Storyset cuate style. A young South Asian person (gender-neutral or female for variety) standing with arms open wide, face turned slightly upward, expression joyful and full of hope — the classic "embracing the future" pose. They wear a `#0A3F3A` (dark teal) outfit (top and trousers). Shoes are `#E48328` (orange). Face/skin is `#E6E8E7` (off-white). Behind them: large concentric circles radiating outward in alternating `#0A3F3A` and `#DBDBDB` — like ripples of energy. A small `#2083B9` (blue) globe floats above and to one side. Small 4-pointed sparkle stars in `#E48328` and `#2083B9` scatter around. A `#0A3F3A` graduation cap floats near the top of the composition. All fills solid, no gradients. Black outlines. Transparent background. Storyset cuate illustration style.

**Notes:**
- Arms open wide is the iconic pose for this section — must be clear and expressive
- Concentric circles are a background composition element, not clothing
- This is the emotional peak of the landing page — illustration should feel celebratory and aspirational
- Consider making this character female or more ambiguous to add diversity to the character set

---

## Generation Tips

**Where to generate these:**
- **Adobe Firefly** (firefly.adobe.com) — best for vector-style, can output SVG
- **Midjourney** — add `--style raw --ar 1:1` for cleanest results
- **DALL-E 3** (via ChatGPT) — good with detailed prompts
- **Recraft.ai** — specialises in vector/flat illustration style, highly recommended

**After generation:**
1. Open in Figma or Illustrator
2. Replace any off-palette colors with the exact hex codes above
3. Remove any gradients — replace with flat fills
4. Export as SVG (for illustrations) or PNG with transparent bg (for plane)
5. Place files in `/public/` folder of the project

**File placement in project:**
```
/public/
  plane.png
  illustrations/
    student-sad.svg
    student-ready.svg
    student-walking.svg
    student-confident.svg
    student-professional.svg
    student-corporate.svg
    student-aspiring.svg
```
