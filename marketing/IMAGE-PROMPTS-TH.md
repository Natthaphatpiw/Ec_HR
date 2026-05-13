# LinForge HR — Image Prompts (ภาษาไทย)

ชุด prompt สำหรับสร้างภาพ marketing ที่ **มีข้อความฝังในภาพ** (in-image typography)
ตอบ 5 คำถามใน 10 วินาทีแรก:
1. นี่คือ SaaS อะไร? 2. แก้ปัญหาอะไร? 3. ใช้แล้วดีขึ้นยังไง? 4. หน้าตาระบบเป็นอย่างไร? 5. ทำอะไรต่อ (CTA)?

---

## หลักการสำคัญ

| รายการ | กติกา |
|---|---|
| ภาษาในภาพ | ไทย (มี EN ตัวเล็กได้ในบาง element) |
| ฟอนต์ | Sans-serif, semi-bold สำหรับ headline, regular สำหรับ body |
| ห้าม | emoji ทุกชนิด, ภาพการ์ตูน, gradient เกินจริง, stock photo ที่ดู cliché |
| Brand palette | navy `#0F172A`, orange `#FB923C`, white `#FFFFFF`, emerald `#059669` (success) |
| สัดส่วน | 1:1 (1080×1080), 4:5 (1080×1350), 9:16 (1080×1920), 16:9 (1920×1080) |
| ข้อความใน Hook | ≤ 12 คำ, อ่านเข้าใจใน 2 วินาที |
| Sub-description | 1–2 บรรทัด อธิบาย feature/benefit สั้นๆ แต่ wow |
| Tools | Midjourney v6+, DALL·E 3, Flux 1.1 Pro, Imagen 3, Ideogram (ดี text rendering) |

> **เครื่องมือแนะนำที่สุดสำหรับ text-in-image**: **Ideogram 2.0** หรือ **DALL·E 3** เพราะ render ตัวอักษรไทย/อังกฤษได้ค่อนข้างถูก

---

## TEMPLATE A — Product Screenshot + Big Outcome (ใช้บ่อยที่สุด)

### โครงสร้างองค์ประกอบ (สำคัญมาก — copy ไปต่อ prompt ทุกอัน)

```
[Top 18%]  HEADLINE ใหญ่ (≤12 คำ) + แถบ orange เล็กบอกหมวด
[Middle 60%]  Phone/Screenshot mockup เป็นพระเอก กลางภาพ
[Right/Left of mockup]  3 feature callouts คั่นด้วย thin orange line
[Bottom 15%]  CTA pill button + tagline เล็ก + URL
[Corner]  โลโก้ "LinForge HR" + tiny "Powered by LINE OA"
```

### A1 — Hero Ad: "ลา OT เช็คอิน — จบในแชท LINE"

```
A premium SaaS marketing graphic, 1080×1080 square format, designed in the
style of Pipedrive / Notion / Linear product ads.

LAYOUT (top to bottom):
- Top band (18% height): On a clean white background, render this Thai
  headline in BOLD large sans-serif text (Inter or Noto Sans Thai):
  "ลา OT เช็คอิน — จบในแชท LINE"
  Color: navy #0F172A. Above the headline, a small orange pill chip with
  white text: "HR SaaS · ทำงานบน LINE"
- Middle 60%: Center a photorealistic iPhone mockup (slight 5-degree tilt)
  showing a LIFF leave-request form screen with navy header and orange
  submit button. Phone casts a soft shadow on the surface below.
- Left of phone: 3 feature callout cards stacked vertically, each with a
  small navy icon and Thai text:
    "ขอลา 30 วินาทีเสร็จ"
    "หัวหน้ากดอนุมัติใน LINE"
    "AI ช่วยตอบคำถาม HR"
  Each card connects to the phone with a thin orange dashed line.
- Bottom 15%: A solid orange pill button reading "ทดลองใช้ฟรี 30 วัน" in
  white text. Below it small navy text: "ไม่ต้องโหลดแอป · 5 นาทีพร้อมใช้".
  Bottom-right corner: small navy logo text "LinForge HR".

STYLE: Crisp, minimal, B2B SaaS premium. Color palette strictly navy
#0F172A, orange #FB923C, white. NO EMOJI, NO PEOPLE. Use real Thai
typography, no garbled text. 8K render quality.
```

**Caption คู่กัน:**
> หัวหน้ายังต้องตามใบลาผ่าน LINE ส่วนตัว Excel กับโทรศัพท์อยู่อีกหรือ?
> LinForge HR ย้ายงาน HR ทั้งระบบเข้ามาอยู่ในแชท LINE ที่ทีมคุณเปิดทุกวันแล้ว
> ลา OT เช็คอิน สลิป ตารางงาน + AI ช่วยคิด — เริ่มต้น $100/เดือน
> 👉 ทดลองฟรี 30 วัน · ไม่ต้องผูกบัตร

---

## TEMPLATE B — Before/After Split Screen

### B1 — "เลิก Excel หลายแผ่น" (Pain → Solution)

```
A high-conversion SaaS Facebook ad, 1200×628 horizontal format.

LAYOUT:
- Top band (15%): center-aligned Thai headline in bold:
  "เลิก Excel หลายแผ่น — เปิด LINE จัดการ HR ครบเลย"
  Color: navy. Below in smaller gray text: "ระบบที่ดี ระเบียบที่ง่าย เพียงคลิ้กๆ ก็จบ"

- Middle 70%: Vertical split into two equal halves divided by a thin
  orange line.

  LEFT HALF — labeled "ก่อน" in a small red pill at top-left:
  Top-down photograph of a chaotic desk: scattered Thai Excel printouts
  stacked unevenly, sticky notes with handwritten Thai (ลา / OT / สาย),
  a desk calculator, an old paper attendance ledger, coffee stain on
  one sheet. Desaturated colors, slight yellow tint.

  RIGHT HALF — labeled "หลัง" in a small emerald pill at top-left:
  Clean white desk with ONE smartphone showing a LIFF dashboard
  screen (navy header, orange accent KPI cards). Beside the phone:
  a single succulent plant, a white coffee cup. Bright, organized,
  full-color, soft natural light.

- Bottom 15%: Orange pill button "ดูเดโม 1 นาที →" + tiny text
  "ec-hr-one.vercel.app · เริ่มต้น $100/เดือน".

STYLE: Strong visual contrast left-vs-right. Photorealistic. NO EMOJI,
NO PEOPLE. Thai typography rendered correctly. 8K.
```

---

## TEMPLATE C — 3-Step Flow (ขั้นตอนง่าย)

### C1 — "เริ่มใช้ใน 3 ขั้นตอน"

```
A clean infographic-style SaaS marketing image, 1080×1350 portrait (Reels).

LAYOUT:
- Top 12%: Thai headline center: "เริ่มใช้ใน 3 ขั้นตอน — เสร็จใน 5 นาที"
  Color navy. Tiny gray subline: "ไม่ต้องโหลดแอป · ไม่ต้องเทรนพนักงาน"

- Middle 70%: Three vertical step blocks separated by thin orange arrows
  pointing downward.

  STEP 1 — circular icon (line-art QR code, orange stroke) + Thai text:
  "1. สแกน QR เพิ่ม LINE OA"
  Sub: "พนักงานเปิด LINE ของตัวเอง สแกนครั้งเดียว"

  STEP 2 — circular icon (line-art chat bubble + sparkle, orange stroke):
  "2. กรอกฟอร์มสมัครใน LIFF"
  Sub: "ชื่อ-สกุล แผนก ตำแหน่ง รูปบัตร · 4 ขั้นตอน"

  STEP 3 — circular icon (line-art checkmark + factory) + Thai text:
  "3. HR กดอนุมัติ — พร้อมใช้งาน"
  Sub: "พนักงานได้รับการ์ดยืนยันใน LINE ทันที"

- Bottom 18%: A subtle phone mockup peeking from bottom-right showing the
  registration success screen (small, 30% of bottom area). Orange pill
  button reading "ลองให้ลูกค้าสมัคร" + tiny navy text "support@linforgehr.com".

STYLE: Editorial / infographic. Background: warm cream-white #FAFAF7.
Icons: monoline orange #FB923C strokes. Text in navy. NO EMOJI, NO PEOPLE.
8K render with correctly rendered Thai text.
```

---

## TEMPLATE D — Metric Hero (ตัวเลขเด่น)

### D1 — "ลดเวลาเอกสาร 70%"

```
A bold "metric hero" SaaS marketing ad, 1080×1080 square.

LAYOUT:
- Hero center: A MASSIVE orange number "70%" in a custom serif/display
  font, taking up 40% of the canvas height, color #FB923C with a subtle
  inner shadow.
- Above the number: small orange pill "ผลลัพธ์จริงจากลูกค้า"
- Below the number (in navy): "เวลาทำเอกสาร HR ที่ลดลง — เดือนแรก"
- Around the number: 3 small floating proof cards arranged in an arc:
    Card top-left: "ลา → 3 วินาที" (small phone icon outline)
    Card top-right: "อนุมัติ → 1 คลิก" (small thumbs-up outline)
    Card bottom-center: "AI ตอบเป็นภาษาไทย" (small sparkle outline)
  Each card has a thin navy border and white background.
- Bottom 12%: Orange pill button "อ่านเคสจริง →" + tiny text "โรงงานชลบุรี · 120 คน · 6 เดือน"

STYLE: Bold typographic poster, like Stripe or Linear's metric ads.
White background with subtle orange radial glow behind the number.
NO EMOJI, NO PEOPLE. Render all Thai text correctly. 8K.
```

---

## TEMPLATE E — Feature Cards (4-grid)

### E1 — "6 ฟีเจอร์ ใน 1 LINE OA"

```
A SaaS feature-showcase ad, 1080×1080 square.

LAYOUT:
- Top 15%: Thai headline "6 ฟีเจอร์ HR — ใน 1 LINE OA" in bold navy,
  centered. Below in small gray: "ไม่ต้องโหลดแอป ไม่ต้องล็อกอินใหม่"

- Middle 70%: A 3×2 grid of feature cards (3 columns, 2 rows), each card
  with a white background, thin navy-100 border, soft shadow. Each card
  contains a monoline orange icon (40px), a Thai label (semi-bold navy),
  and a one-line Thai sub-text (gray):

    Card 1: icon "calendar-clock" — "ขอลางาน" / "ดูโควต้าคงเหลือทันที"
    Card 2: icon "timer"         — "ขอ OT" / "คิดค่าล่วงเวลาให้อัตโนมัติ"
    Card 3: icon "receipt"       — "สลิปเงินเดือน" / "ดูย้อนหลังทุกเดือน"
    Card 4: icon "calendar-grid" — "ตารางงาน" / "drag-drop รายสัปดาห์"
    Card 5: icon "map-pin"       — "เข้า-ออกงาน" / "GPS + IP + รูป 3 ชั้น"
    Card 6: icon "sparkles"      — "AI ผู้ช่วย" / "ตอบเป็นภาษาไทย/EN/中文"

- Bottom 15%: Orange pill button "ดูสาธิตทั้ง 6 ระบบ" + tiny text
  "เริ่มต้น $100/เดือน · ทดลองฟรี 30 วัน · linforgehr.com"

STYLE: Notion / Linear feature page style. Background: off-white #F8FAFC.
Cards crisp, evenly spaced, plenty of whitespace. NO EMOJI, NO PEOPLE.
Thai text rendered perfectly. 8K.
```

---

## TEMPLATE F — Persona-based ("เป็นเรื่องของคุณ")

### F1 — "HR ที่ตอบแชทเดิมทุกวัน"

```
A persona-driven SaaS ad, 1080×1350 portrait.

LAYOUT:
- Top 15%: Thai headline "HR ไม่ควรเสียเวลาตอบคำถามเดิมทุกวัน" in bold navy.

- Middle 60%: Compositional split.
  LEFT (40%): Stylized line-art portrait of an exhausted Thai female HR
  officer (early 30s, bun hairstyle, blouse) holding her head, surrounded
  by 4 chat-bubble shapes with Thai text inside each bubble:
    "เหลือวันลากี่วัน?"
    "ขอสลิปย้อนหลัง"
    "อนุมัติ OT หรือยัง?"
    "ลืมกดเข้างานทำไง?"
  Drawn in monoline navy strokes on white background.

  RIGHT (60%): A photorealistic phone mockup showing the ForgeHR AI
  chat screen answering the same questions, with a green check badge
  floating top-right. The phone has a soft orange glow halo.

- Bottom 25%: 3 small benefit pills in a row:
  "ตอบ 24 ชม. ไม่หยุด" · "ภาษาไทย/EN/中文" · "เชื่อมข้อมูลสด"
  Below: Orange pill button "ให้ AI ตอบแทนคุณ →"

STYLE: Editorial illustration left + product photography right. Mood:
sympathetic but solution-forward. Navy and orange accent only. NO EMOJI.
Realistic Thai text. 8K.
```

---

## TEMPLATE G — Comparison Table (vs Excel)

### G1 — "Excel vs LinForge HR"

```
A SaaS comparison ad, 1080×1080 square, designed like a clean SaaS
landing-page comparison table.

LAYOUT:
- Top 12%: Thai headline "ทำไมเลิกใช้ Excel แล้วเปลี่ยนมา LinForge HR" in bold navy.

- Middle 75%: A two-column comparison table with rounded corners.

  COLUMN 1 — header "Excel / Manual" with a small gray X icon, gray
  background:
    "ต้องกรอกเอง · พลาดง่าย"
    "ไม่มีแจ้งเตือน"
    "หาเอกสารย้อนหลังลำบาก"
    "ไม่มี audit log"
    "พนักงานต้องสอนทุกครั้ง"

  COLUMN 2 — header "LinForge HR" with a small emerald check icon,
  navy background, white text:
    "พนักงานกรอกผ่าน LINE ใน 30 วินาที"
    "Flex card แจ้งเตือนทันที"
    "Audit log ครบทุก action"
    "พนักงานเปิด LINE ของตัวเอง"
    "AI ช่วยตอบคำถาม HR ตลอด 24 ชม."

  Rows alternate background slightly for readability.

- Bottom 13%: Orange pill button "ทดลองใช้ฟรี 30 วัน →" + tiny text
  "ไม่ต้องผูกบัตร · ย้ายข้อมูลจาก Excel ฟรี"

STYLE: Linear / Notion comparison-table aesthetic. Crisp, minimal,
typography-forward. NO EMOJI, NO PEOPLE. Thai text precise. 8K.
```

---

## ประโยค Hook ที่ขายดี (ใช้ใน headline ของภาพ)

| # | Hook | สิ่งที่สื่อ |
|---|---|---|
| H1 | "ลา OT เช็คอิน — จบในแชท LINE" | Zero-friction |
| H2 | "เลิก Excel หลายแผ่น เปิด LINE จัดการ HR ครบ" | Pain killer |
| H3 | "HR ครบทั้งระบบ + AI — $100/เดือน" | ราคา hook |
| H4 | "5 นาที จาก signup ถึงพนักงานคนแรกใช้งาน" | Time-to-value |
| H5 | "AI ผู้ช่วย HR คนไทย พูดได้ 3 ภาษา" | AI angle |
| H6 | "พนักงานปั๊มบัตรแทนกัน? เราตรวจ 3 ชั้น" | Anti-fraud |
| H7 | "ลดงาน HR ซ้ำ ๆ 70% ในเดือนแรก" | Metric proof |
| H8 | "Drag-drop ตารางทำงาน ทั้งของตัวเองและทีม" | Schedule UX |
| H9 | "ระบบที่ดี ระเบียบที่ง่าย เพียงคลิ้กๆ ก็จบ" | Slogan |
| H10 | "เพิ่ม LINE OA ทีเดียว — เปิดประตู HR ทั้งหมด" | Onboarding |

---

## Sub-description (ตัวอักษรเล็กใต้ hook — สำคัญมาก ต้อง wow)

| # | Sub | คู่กับ Hook |
|---|---|---|
| S1 | "พัฒนาโดยทีม HR + AI Engineers · พร้อมใช้ในไทยและอาเซียน" | H1, H3 |
| S2 | "ไม่มีค่า setup · ไม่ต้องเทรนพนักงาน · ยกเลิกได้ตลอด" | H3, H4 |
| S3 | "Geofence + IP whitelist + รูปยืนยัน — ป้องกันโกงเวลา 100%" | H6 |
| S4 | "อ่าน database สด ตอบคำถาม HR ได้ทันที 24 ชม." | H5 |
| S5 | "ใช้กับโรงงาน ร้านอาหาร office ทั้งคนเข้างาน onsite และ remote" | H1, H2 |
| S6 | "ลด Excel 80% · ลดการโทรตามใบลา 95%" | H7 |
| S7 | "ทดลองฟรี 30 วัน · ไม่ต้องผูกบัตร · บิลรายเดือน" | H3 |

---

## CTA buttons (ใช้ใน pill ด้านล่างของภาพ)

- **Primary**: "ทดลองใช้ฟรี 30 วัน →" (orange BG, white text)
- **Secondary**: "ดูสาธิต 60 วินาที →" (transparent BG, navy border)
- **Sales-led**: "นัดทีมขายผ่าน LINE →" (emerald BG, white text)
- **Urgency**: "เริ่มต้นแค่ $100/เดือน · ลด 20% ปีนี้" (white BG, navy text)

---

## Posting cadence (Recommended)

| Week | Template | Hook | Goal |
|---|---|---|---|
| 1 | A (Product+Outcome) | H1 / H3 | Awareness |
| 2 | B (Before/After) | H2 | Pain killer |
| 3 | D (Metric hero) | H7 | Performance ads |
| 4 | C (3-step flow) | H4 / H10 | Conversion |
| 5 | F (Persona) | H5 | Decision-makers |
| 6 | E (Feature 4-grid) | H8 / H10 | Re-marketing |
| 7 | G (Comparison) | H2 / H9 | Final push |

หมุน creative ทุก 60 วันเพื่อหลีกเลี่ยง ad fatigue
