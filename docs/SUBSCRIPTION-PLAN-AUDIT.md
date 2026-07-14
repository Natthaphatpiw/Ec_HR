# Subscription Plan Audit

เอกสารนี้ตรวจสอบความสอดคล้องระหว่างไฟล์ `(Sample) Subscription Plans.pdf` กับความสามารถของระบบ EC AIHR ใน repository นี้ เพื่อใช้ตัดสินใจก่อนนำแพ็กเกจไปเสนอขาย

- วันที่ตรวจ: 13 กรกฎาคม 2026
- เอกสารต้นทาง: `/Users/natthaphat/Downloads/(Sample) Subscription Plans.pdf`
- จำนวน: 2 หน้า ขนาดสไลด์ 16:9
- วิธีตรวจ: เรนเดอร์ทุกหน้าเป็นภาพ, ตรวจเลย์เอาต์ด้วยสายตา, สกัดข้อความ และเทียบกับ route, component, data layer และ SQL schema/migrations จริง
- หมายเหตุสถานะ: Analytics, Excel export, geofence และ payroll กำลังถูก implement ใน change set นี้ ต้องผ่าน verification ก่อนเปลี่ยนเป็นพร้อมขาย

## คำตัดสินโดยสรุป

PDF ยังไม่ควรถูกนำไปเสนอว่าเป็นรายการฟีเจอร์ที่พร้อมใช้งานทั้งหมด ปัจจุบันระบบมีแกนสำคัญที่สาธิตได้จริง ได้แก่ LINE-first onboarding, check-in/out, attendance history, leave/OT request, LINE approval, weekly schedule, manager contact และ AI chat แต่รายการต่อไปนี้ยังเป็นบางส่วนหรือยังไม่มีจริง: feature gating รายแพ็กเกจ, IP/photo attendance, downloadable e-payslip, production analytics, advanced analytics, Excel/PDF export, drag-and-drop schedule, customer API และ customization console

ระบบบังคับ trial และจำนวนที่นั่งได้จริงผ่าน `seat_limit` แต่ยังไม่มี entitlement matrix ที่กำหนดว่า Starter, Growth และ Enterprise ใช้ฟีเจอร์ใดได้บ้าง นอกจากนี้ชื่อแพ็กเกจใน code ใช้ `pro` ขณะที่ PDF ใช้ `Growth`

สถานะที่ใช้ในเอกสารนี้:

- **ยืนยันได้**: มี implementation ที่ใช้งานได้ตามสาระของคำกล่าวอ้าง
- **บางส่วน**: มีแกนฟังก์ชัน แต่ขอบเขตยังไม่ครบหรือถ้อยคำแรงกว่าความจริง
- **กำลัง implement**: กำลังทำใน change set นี้ แต่ยังต้องผ่าน type-check, build และ functional verification
- **ยังไม่มี/ต้องถอด**: ไม่พบ implementation ที่รองรับคำกล่าวอ้าง
- **บริการภายนอกระบบ**: เป็นคำมั่นเชิงพาณิชย์ ต้องมี SLA หรือขอบเขตบริการยืนยันแยกจาก code

## หน้า 1: Subscription Plans

| Claim ใน PDF | สถานะปัจจุบัน | หลักฐานย่อ | Recommended wording ก่อนเสนอขาย |
|---|---|---|---|
| Annual Fee | ยังไม่พร้อม | ทั้งสามแพ็กเกจยังเป็น `[Insert Price] THB` | ใส่ราคาจริง พร้อม VAT, ระยะสัญญา, เงื่อนไขต่ออายุ และวันเริ่มคิดค่าบริการ |
| Starter: Up to 20 employees; Growth: Up to 50; Enterprise: Up to 100 | บางส่วน | มี `seat_limit` และ registration gate ใน `src/lib/data.ts`; tier ใน `src/lib/types.ts` และ `supabase/migrations/v3_saas_multitenant.sql` ใช้ `pro` ไม่ใช่ `Growth` | `Seat limit: 20 / 50 / 100 users` หลังทำ mapping tier-to-seat และทดสอบการอัปเกรดแล้ว |
| Starter: Basic Check-in/out | ยืนยันได้ แต่ยังไม่ถูก gate ตามแพ็กเกจ | LIFF check-in action และ `recordAttendance()` บันทึก in/out จริงใน `src/app/liff/checkin/actions.ts` และ `src/lib/data.ts` | `LINE LIFF check-in/out with attendance history` |
| Growth/Enterprise: GPS, IP, 3-Layer Photo | บางส่วน + geofence กำลัง implement | GPS ถูกอ่านและบันทึกแล้ว แต่ live flow เดิมบันทึก `ip_address` และ `photo_url` เป็น `null`; settings เดิมเป็น UI-only | `GPS-tagged check-in/out` เท่านั้นในตอนนี้ ส่วน geofence กำลังถูก implement ใน change set นี้ ต้องผ่าน verification ก่อนเปลี่ยนเป็นพร้อมขาย; ถอด `IP, 3-Layer Photo` จนมี implementation และคำจำกัดความชัดเจน |
| E-Payslip ทุกแพ็กเกจ | กำลัง implement | มี payroll summary ใน LIFF และ schema รองรับ `payslip_pdf_url` แต่ปุ่ม View/Download เดิมยังไม่มี action | `Payroll summary in LINE LIFF` ในระหว่างนี้; payroll กำลังถูก implement ใน change set นี้ ต้องผ่าน verification ก่อนเปลี่ยนเป็นพร้อมขาย และต้องทดสอบ PDF/download จริงก่อนใช้คำว่า E-Payslip |
| Data Analytics (Intermediate) ทุกแพ็กเกจ | กำลัง implement | dashboard เดิมมีกราฟ แต่ helper หลักระบุว่า demo-only และอิง in-memory arrays | Analytics กำลังถูก implement ใน change set นี้ ต้องผ่าน verification ก่อนเปลี่ยนเป็นพร้อมขาย; หลังผ่านแล้วควรระบุชื่อ dashboard และ KPI ที่ส่งมอบอย่างเจาะจง |
| Data Analytics (Advanced) Growth/Enterprise | กำลัง implement แต่ยังไม่มีนิยามแพ็กเกจ | reports เดิมมี OT/KPI/AI summary บางส่วนเป็น hardcode และไม่มี tier gate | Analytics กำลังถูก implement ใน change set นี้ ต้องผ่าน verification ก่อนเปลี่ยนเป็นพร้อมขาย; ต้องนิยาม Advanced เช่น drill-down, comparison period, downloadable report และสิทธิ์ผู้ใช้ก่อนใส่เครื่องหมายถูก |
| Leave Management: Real-time quota tracking | บางส่วน | คำนวณ used/remaining จาก approved requests จริง แต่ total entitlement เดิม hardcode 10/30/3 วัน และ submit ยังไม่บล็อกการยื่นเกินคงเหลือ | `Live used/remaining leave view based on approved requests` หรือทำ leave policy ต่อองค์กรและ quota enforcement ให้ครบก่อนใช้ `real-time quota management` |
| Starter: Standard History & Schedule | ยืนยันได้ | มี attendance history และ weekly employee schedule ที่อ่าน/แก้ไขข้อมูลผ่าน server action | `Attendance history and weekly work schedule` |
| Growth/Enterprise: Drag & Drop Weekly Setup | ยังไม่มี/ต้องถอด | LIFF ใช้การแตะ cell และ dialog; dashboard เดิมแสดงข้อความ Drag แต่ไม่มี drag handlers | `Interactive weekly schedule and supervisor team assignment` |
| OT Request: Automated Calculation | บางส่วน | request และ LINE notification ทำงานจริง แต่ estimate เดิมใช้อัตราคงที่ 86 บาท/ชั่วโมง และมองเฉพาะวันอาทิตย์เป็นวันหยุด | `OT request with estimated pay preview` จนกว่าจะคำนวณจากเงินเดือน, ประเภทวัน, กะ, วันหยุดองค์กร และกฎที่ตรวจสอบแล้ว |
| Enterprise: Manager Contact & AI Chat | ยืนยันฟังก์ชันได้ แต่ยังไม่ถูก gate ตามแพ็กเกจ | manager contact ส่ง LINE approval flow จริง; AI chat ใช้ได้สำหรับ supervisor/HR/executive และมี deterministic fallback | `Manager contact request for employees; AI chat for supervisors, HR and executives` หลังเพิ่ม Enterprise entitlement แล้วจึงระบุว่า Enterprise-only |
| Training: 1 Online Session | บริการภายนอกระบบ | ตรวจยืนยันจาก code ไม่ได้ | `One online onboarding session, up to [N] users, [duration], [language]` พร้อมเงื่อนไข recording/reschedule |
| Technical Support: Email / Email & LINE Group | บริการภายนอกระบบ | ตรวจยืนยันจาก code ไม่ได้ | ระบุเวลาทำการ, first-response target, severity, ช่องทาง และสิ่งที่ไม่รวมใน support |
| Enterprise: Customization | ยังไม่มีเป็น product feature | มี `metadata JSONB` สำหรับข้อมูลเสริม แต่ไม่มี customization console หรือ workflow builder | `Custom implementation available by quotation` และแยก Statement of Work |
| Enterprise: API Access | ยังไม่มี/ต้องถอด | route ปัจจุบันเป็น internal agent endpoint, LINE webhook และ invite QR; ไม่มี customer API key/OAuth, versioning, tenant-scoped public API, rate limit หรือ API docs | ถอดเครื่องหมายถูก หรือใช้ `Custom integration assessment available` จน public API ผ่าน security review |

## หน้า 2: Optional Add-ons & Scalability

| Claim ใน PDF | สถานะปัจจุบัน | หลักฐานย่อ | Recommended wording ก่อนเสนอขาย |
|---|---|---|---|
| Additional Employees: price per employee/month | บางส่วน | `seat_limit` รองรับการเพิ่มที่นั่งเชิงเทคนิค และมี SQL helper สำหรับ promote tier แต่ยังไม่มี billing/metering/checkout | `Additional seat allocation by contract` พร้อมราคาและกระบวนการเพิ่มที่นั่งที่ชัดเจน |
| Additional Training Session | บริการภายนอกระบบและราคาไม่พร้อม | ราคาเป็น `X0,000 THB / session` | ใส่ราคาจริงและขอบเขต session เช่น duration, attendee limit, language และเนื้อหา |
| Enterprise Plan (101+ Employees) | บางส่วน | สามารถตั้ง `seat_limit` เกิน 100 ได้ แต่ยังไม่มีหลักฐาน load test หรือ SLA สำหรับ higher volume | `Custom seat allocation for organizations with 101+ employees` หลังผ่าน performance/load verification |
| Complex workflows / customized quote | ยังพิสูจน์ไม่ได้ | มี fixed HR workflows แต่ไม่มี workflow builder หรือขอบเขต custom workflow ที่นิยามไว้ | `Custom workflow implementation subject to discovery and quotation` |

## จุดขายที่ยืนยันได้จากระบบปัจจุบัน

- LINE-first employee and supervisor registration พร้อม invite link/QR และ approval flow
- LIFF check-in/out พร้อม GPS log และ attendance history
- Leave request, OT request และ manager contact ที่ส่ง approval card ผ่าน LINE
- Single-use approval token, approve/reject flow และ rejection reason ผ่าน LINE webhook
- Weekly employee schedule และ supervisor team assignment แบบ interactive พร้อม schedule-change notification
- Payroll data model และ payroll summary สำหรับพนักงานใน LIFF โดยสถานะ payroll automation/download ยังอยู่ระหว่าง implement และ verification
- AI Assistant ผ่าน dashboard/LIFF/LINE พร้อม tool-based HR lookup และ deterministic fallback เมื่อไม่มี model key
- Multi-tenant organization metadata, free-trial window และ seat-limit gate
- Thai/English/Chinese cookie-based localization
- Thai SSO configuration แบบ effective-dated ในฐานข้อมูล โดยการนำไปคำนวณ payroll แบบพร้อมขายยังต้องผ่าน legal/data verification

## ข้อความที่ต้องถอดหรือแก้ก่อนเสนอขาย

- ถอดคำว่า `Sample`, `[Insert Price]` และ `X0,000 THB`
- ถอด `GPS, IP, 3-Layer Photo` และใช้ `GPS-tagged check-in/out` จน IP/photo ทำงานจริง
- ห้ามระบุว่า geofence พร้อมขายจน implementation ใน change set นี้ผ่าน verification
- ห้ามระบุว่า Data Analytics Intermediate/Advanced พร้อมขายจน dashboard ใช้ production data, tenant scope และ export ผ่าน verification
- ห้ามระบุว่า Export Excel/PDF ใช้งานได้จนไฟล์ถูกสร้าง ดาวน์โหลด เปิดอ่าน และตรวจตัวเลขเทียบกับหน้าจอแล้ว
- เปลี่ยน `Drag & Drop Weekly Setup` เป็น `Interactive Weekly Schedule & Team Assignment`
- เปลี่ยน `Automated Calculation` ของ OT เป็น `Estimated Pay Preview` จนคำนวณจากข้อมูลพนักงานและ calendar จริง
- ห้ามใช้ `E-Payslip` ในความหมาย downloadable document จน payroll/PDF/download ผ่าน verification
- ถอด `API Access` หรือเปลี่ยนเป็น custom integration assessment
- เปลี่ยน `Customization` เป็นบริการตาม Statement of Work
- เปลี่ยนชื่อแพ็กเกจใน code จาก `pro` ให้ตรงกับ `Growth` หรือเปลี่ยน PDF ให้ตรงกับ code
- หลีกเลี่ยงคำว่า `Thai labor law compliant` จนสูตร, effective dates, test cases และ legal review ผ่านครบ

## Sales Readiness Checklist

### Package and entitlement

- [ ] ตัดสินใจชื่อแพ็กเกจ `Growth` หรือ `Pro` และใช้ชื่อเดียวกันทั้ง PDF, code และฐานข้อมูล
- [ ] สร้าง feature entitlement matrix สำหรับ Starter/Growth/Enterprise
- [ ] บังคับ entitlement ที่ server-side ไม่ใช่ซ่อนเฉพาะเมนู
- [ ] map tier ไปยัง seat limit 20/50/100 และทดสอบ upgrade/downgrade
- [ ] ทดสอบ 101+ seats และกำหนดเงื่อนไข enterprise capacity

### Attendance and geofence

- [x] Check-in/out และ in-to-out pairing ทำงาน
- [x] Attendance history ต่อพนักงานทำงาน
- [x] GPS capture/log มี implementation
- [ ] Geofence on/off, configurable radius และ server-side distance rejection ผ่าน verification ของ change set นี้
- [ ] ทดสอบกรณีไม่อนุญาต location, GPS accuracy ต่ำ, spoofing และพิกัดองค์กรไม่ครบ
- [ ] IP capture/restriction มี implementation จริงก่อนนำกลับเข้า PDF
- [ ] Photo capture/liveness/watermark มี specification และ implementation จริงก่อนใช้คำว่า 3-Layer Photo

### Analytics and export

- [ ] Dashboard analytics อ่านข้อมูล Supabase จริงและกรอง `org_id` ครบทุก query
- [ ] นิยาม Intermediate และ Advanced เป็นรายการ KPI/report ที่วัดผลได้
- [ ] Dashboard web app และ LIFF report ผ่าน functional/visual verification
- [ ] Excel export ทุกจุดสร้างไฟล์จริง เปิดใน Excel ได้ และตัวเลขตรงกับ filter บนหน้าจอ
- [ ] Date range, department/team filter, timezone และ empty/error state ผ่าน verification
- [ ] ไม่มี demo arrays, hardcoded KPI หรือ frozen sales copy ปะปนกับ production result

### Payroll and legal calculation

- [ ] Payroll change set ผ่าน type-check, build และ route-level verification
- [ ] SSO 2026 effective date, wage floor, wage ceiling และ maximum contribution มี source และ test cases
- [ ] Personal income tax calculation ครอบคลุม progressive rates, allowances, annualization และ rounding ที่ตกลงใช้
- [ ] OT pay ใช้เงินเดือน, working-day divisor, weekday/holiday rate และ organization calendar จริง
- [ ] Payslip PDF generation, storage authorization, view และ download ผ่าน verification
- [ ] มี legal/accounting review และ disclaimer สำหรับค่าประมาณก่อนเปิดขาย

### Security and tenancy

- [ ] Dashboard มี authentication และ role authorization
- [ ] ทุก dashboard/report/payroll query ถูก scope ด้วย `org_id`
- [ ] ห้าม client ส่ง employee/org id แล้วอ่านข้อมูลข้าม tenant ได้
- [ ] Export และ payslip download ตรวจสิทธิ์ server-side
- [ ] Customer API มี auth, tenant scope, versioning, rate limit, audit log และ documentation ก่อนใส่ใน Enterprise

### Commercial and service readiness

- [ ] ใส่ราคา, VAT, billing cycle, contract term และ renewal terms จริง
- [ ] นิยาม training session และ additional training scope
- [ ] นิยาม support SLA สำหรับ Email และ LINE Group
- [ ] ระบุ implementation/onboarding timeline
- [ ] ระบุ data migration, customization และ API ว่าอะไร included หรือ charged separately
- [ ] เพิ่ม company logo, sales contact และ quotation validity
- [ ] ตรวจภาษา `Number of Employees` แทน `No. Of Employees`

### Final verification before changing a claim to “ready to sell”

- [ ] `npm run type-check` ผ่าน
- [ ] `npm run build` ผ่าน
- [ ] ทดสอบ LIFF ด้วย LINE user จริงทั้ง employee, supervisor และ admin/HR
- [ ] ทดสอบ Supabase mode ด้วย `DEMO_MODE=false`
- [ ] ตรวจตัวเลข dashboard/report/export เทียบ SQL source-of-truth
- [ ] เปิดไฟล์ Excel/PDF ที่ดาวน์โหลดได้จริงและตรวจภาษาไทย/อังกฤษ/จีน
- [ ] ทดสอบ tenant isolation และ authorization negative cases
- [ ] เก็บ screenshot/evidence ของทุกฟีเจอร์ที่มีเครื่องหมายถูกใน PDF
- [ ] ให้ product owner และผู้รับผิดชอบกฎหมาย/บัญชี sign off เวอร์ชันสุดท้าย

## ผลตรวจเลย์เอาต์ PDF

- ทั้ง 2 หน้าเรนเดอร์ชัด ไม่มีข้อความถูกตัดหรือ glyph เสีย
- หน้า 1 ข้อมูลแน่นแต่ยังอ่านได้ ส่วนหน้า 2 มีพื้นที่ว่างมาก สามารถใช้เพิ่ม SLA, implementation timeline, add-on conditions หรือ footnotes
- ควรนำคำว่า `Sample` สีแดงออก เพิ่มโลโก้/ข้อมูลติดต่อ และแทน placeholder ทั้งหมดก่อนส่งลูกค้า
- คำว่า `3-Layer Photo`, `Intermediate Analytics` และ `Advanced Analytics` ต้องมีคำจำกัดความที่ลูกค้าและทีมพัฒนาตีความตรงกัน

เอกสารนี้เป็น audit snapshot ไม่ใช่การรับรองว่าฟีเจอร์ที่กำลัง implement พร้อมใช้งาน สถานะ Analytics, Excel export, geofence และ payroll เปลี่ยนเป็น “พร้อมขาย” ได้ต่อเมื่อ checklist ที่เกี่ยวข้องผ่านและมีหลักฐาน verification แล้วเท่านั้น
