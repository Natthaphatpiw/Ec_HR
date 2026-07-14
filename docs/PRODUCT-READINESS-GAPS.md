# EC AIHR Product Readiness Gaps

วันที่ประเมิน: 13 กรกฎาคม 2026

เอกสารนี้แยกสิ่งที่ระบบทำได้แล้วออกจากสิ่งที่ต้องปิดก่อนนำ EC AIHR ไปเป็นระบบหลักของฝ่าย HR ในองค์กรจริง โดยเน้นความเสี่ยงที่มีผลต่อข้อมูลบุคคล เงินเดือน และการตัดสินใจด้านแรงงาน

## สิ่งที่ change set นี้เพิ่มแล้ว

- Analytics ที่อ่านข้อมูล Supabase จริงแบบแยก organization/team พร้อม web dashboard และ LIFF dashboard
- Excel export แยก Employees, Attendance, Leave, Overtime, Payroll และ Performance พร้อมตัดข้อมูลอ่อนไหวหลักและพิกัดดิบ
- Geofence เปิด/ปิดได้ กำหนดพิกัดและรัศมีได้ พร้อมตรวจซ้ำฝั่ง server ก่อนบันทึกเวลา
- Payroll snapshot ที่เก็บ SSO ลูกจ้าง/นายจ้าง, ภาษีหัก ณ ที่จ่าย, rule version, calculation details และสถานะ estimate/reviewed/file-ready
- SQL demo tenant ที่ต้องผูกกับ owner LINE จริงก่อน seed และสร้างข้อมูลย้อนหลังที่ตรวจสอบซ้ำได้

## P0: ต้องปิดก่อนใช้งาน Production กับลูกค้าจริง

### 1. Verified authentication และ tenant isolation

ปัจจุบัน LIFF session ใช้ `liff_user_id` cookie ที่ browser เขียนได้ และ dashboard ยังไม่มีระบบ login ที่พิสูจน์ตัวตน ฝั่ง server ใช้ Supabase service-role จึง bypass RLS แม้ตารางเปิด RLS อยู่ สิ่งที่ต้องทำ:

- แลกและตรวจ LINE ID token/access token ฝั่ง server แล้วออก signed, HttpOnly, Secure session
- เพิ่ม dashboard authentication สำหรับ admin/HR/executive และตรวจ role ทุก route/action/export
- ผูกทุก query กับ organization จาก session เท่านั้น ห้ามรับ `org_id` หรือ `employee_id` จาก client แล้วเชื่อโดยตรง
- เพิ่ม negative tenant-isolation tests สำหรับ employees, payroll, approvals, analytics, AI tools และไฟล์ดาวน์โหลด

### 2. Payroll governance ไม่ใช่เพียงสูตรคำนวณ

เครื่องคำนวณใน change set นี้เป็น estimate ที่ตรวจสอบย้อนกลับได้ แต่ยังไม่ใช่ระบบยื่นแบบหรือการรับรอง compliance ต้องมี:

- earnings-component rules ว่ารายการใดเป็นเงินได้ ม.40(1), ค่าจ้างประกันสังคม, recurring หรือ one-off
- year-to-date income/tax/SSO, พนักงานเริ่มหรือออกกลางปี, ลาไม่รับค่าจ้าง, หลายนายจ้าง, non-resident และ termination true-up
- workflow หลักฐานค่าลดหย่อน, reviewer, lock งวด, reopen พร้อมเหตุผล และ immutable audit trail
- decimal arithmetic และชุด golden test ที่ผู้ทำบัญชีรับรอง
- export/filing ภ.ง.ด.1, หนังสือรับรอง 50 ทวิ และไฟล์นำส่งประกันสังคม แยกจาก Excel analytics
- legal/accounting sign-off ทุก rule version และกระบวนการอัปเดตกฎหมายแบบ effective-dated

### 3. PDPA และข้อมูลเงินเดือน

- กำหนด retention, deletion, correction, consent/legal basis และ data-subject request
- encryption/key management, backup restore test และ access log สำหรับ payroll/export/profile documents
- export audit ที่บันทึกผู้ใช้ ขอบเขต dataset filter จำนวนแถว และเวลา
- จำกัด spreadsheet ด้วย role และ policy; ชื่อกับเงินเดือนยังเป็นข้อมูลอ่อนไหวแม้ตัดเลขบัตร/บัญชี/พิกัดแล้ว
- signed URL อายุสั้นสำหรับเอกสารและ payslip; ห้าม public object URL

### 4. Approval และ attendance integrity

- ทำ action-token consumption ให้ atomic และบังคับ intended approver ทุกกรณี
- ป้องกัน race ของ clock-in/out ด้วย transaction/advisory lock หรือ database function
- สร้าง attendance correction workflow ที่เก็บค่าเดิม ค่าใหม่ ผู้แก้ เหตุผล และผู้อนุมัติ
- นิยาม timezone/cut-off สำหรับกะข้ามวัน วันหยุด และ payroll period

## P1: ต้องมีเพื่อให้เป็น HR operating system ที่ครบขึ้น

### Package entitlement และ billing

- ใช้ชื่อแพ็กเกจให้ตรงกัน (`pro` กับ `Growth` ยังไม่ตรง)
- server-side feature entitlement สำหรับ Starter/Growth/Enterprise ไม่ใช่ซ่อนเมนูอย่างเดียว
- seat metering, upgrade/downgrade, invoice/billing, grace period และ audit ของการเปลี่ยนแพ็กเกจ

### Leave, OT และเวลาทำงาน

- leave policy ต่อองค์กร/อายุงาน/ประเภทการจ้าง พร้อม carry-over, accrual และ quota enforcement
- holiday calendar, shift premiums, rest day และ OT rate ตามประเภทวัน/กะ แทน preview อัตราคงที่
- missed punch, overnight shift, break, flexible schedule และ approval escalation
- geofence policy สำหรับ GPS accuracy, spoofing risk, multi-site และ temporary worksite

### Employee lifecycle

- onboarding checklist, document expiry, probation, transfer, promotion, resignation และ offboarding
- organization chart และ effective-dated position/supervisor history
- asset/access handover และ exit clearance

### Reporting controls

- filter ตาม department/site/employment type, comparison period และ saved report
- data freshness timestamp, source lineage, metric dictionary และ reconciliation totals
- scheduled delivery และ export audit
- risk/watch score ต้องคงเป็น diagnostic signal ห้ามใช้ลงโทษหรือเลิกจ้างอัตโนมัติ

## P2: จุดเพิ่มมูลค่าเชิงพาณิชย์

- recruiting/applicant tracking และ interview workflow
- competency, goal, review cycle, calibration และ development plan
- training/LMS records และ certificate expiry
- benefits/claims, employee letters และ HR service desk
- public API/webhooks ที่มี OAuth/API key, scopes, versioning, rate limit และ audit
- SSO/SCIM สำหรับลูกค้าองค์กร, multi-site และ delegated admin
- operational SLA, incident response, disaster recovery objective และ status page

## ข้อสรุปการวางตำแหน่ง

รุ่นปัจจุบันเหมาะกับการขายเป็น LINE-first HR operations platform สำหรับ attendance, request/approval, scheduling, payroll visibility และ management analytics โดยต้องระบุชัดว่า payroll เป็น calculation support และฟีเจอร์ production security/filing บางส่วนยังเป็น implementation scope ก่อน go-live ไม่ควรวางตำแหน่งเป็นระบบ payroll filing ที่ compliant ครบวงจรจน P0 ผ่านและมีผู้เชี่ยวชาญกฎหมาย/บัญชี sign off
