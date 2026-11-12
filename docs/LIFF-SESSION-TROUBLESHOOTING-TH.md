# แก้ LIFF session 503 ตามด้วย 401

วันที่ 8 ตุลาคม 2026: ตรวจ endpoint production แล้วได้ `503 {"error":"line_login_not_configured"}` ก่อนเรียก LINE API จึงยืนยันว่า deployment ที่เกิดปัญหายังไม่มี `LINE_LOGIN_CHANNEL_ID` ไม่ใช่ firewall หรือ LINE ปฏิเสธ token

401 ที่ตามมาเกิดจาก client รุ่นเดิมลอง `{demo:true}` หลัง server session ล้มเหลว แต่ production ไม่อนุญาต demo การแก้ครั้งนี้หยุด fallback หลัง server error และให้หน้าสมัคร supervisor/employee แสดงข้อความพร้อมปุ่มลองใหม่ แทน loading ค้าง

## ค่าที่ต้องตรวจบน Vercel Production

```dotenv
LINE_LOGIN_CHANNEL_ID=<Channel ID ของ LINE Login ที่เป็นเจ้าของ LIFF>
LIFF_SESSION_SECRET=<secret สุ่มอย่างน้อย 32 ตัวอักษร>
DEMO_MODE=false
```

`LINE_LOGIN_CHANNEL_SECRET` ใช้สำหรับ web LINE Login; การ verify LIFF ID token ที่ endpoint นี้ใช้ Channel ID โดยไม่ต้องใช้ channel secret อย่าสับสนกับ `LINE_CHANNEL_SECRET` ของ Messaging API

หลังเพิ่ม env ต้อง deploy/redeploy ใหม่ ตัว deployment เดิมไม่รับค่าใหม่เอง ช่อง LIFF ใน LINE Developers ต้องเปิด `openid` และ Endpoint URL ต้องครอบคลุมหน้าที่เปิด ตัวอย่าง `/liff/register-supervisor` ต้องใช้ LIFF ของหน้านี้ หรือ LIFF REGISTER ที่ตั้ง Endpoint URL ให้รองรับเส้นทางนี้แล้ว

## ตรวจหลัง deployment ใหม่

1. เปิด LIFF จากบัญชี LINE จริง ดูว่าฟอร์มสมัครหรือสถานะบัญชีแสดงได้
2. คำขอ `/api/liff/session` ที่มี valid LINE ID token ต้องได้ 200 และ signed HttpOnly cookie
3. ถ้าได้ 503 ให้ดู response/log: `line_login_not_configured` คือ Channel ID ไม่มี; `liff_session_not_configured` คือ signing secret ไม่มีหรือสั้นเกินไป
4. ถ้าได้ 401 `invalid_id_token` หลังมี outgoing request ไป LINE ให้ตรวจว่า Channel ID เป็นของ LIFF เดียวกันและ token ยังไม่หมดอายุ
5. ถ้าได้ 502 `line_verification_unavailable` ให้ลองใหม่และตรวจการเชื่อมต่อ LINE; verify มี timeout 10 วินาที

ไม่ปิด token verification ไม่ใช้ LINE user ID จาก browser เป็น session และไม่เปิด demo เพื่อแก้ production login

การทดสอบ local โดยไม่ใช้บัญชี/credentials จริง:

```bash
node scripts/check-liff-session.mjs
node scripts/check-liff-registration.mjs
npm run type-check
npm run build
```

Script ทดสอบ route/client จริงด้วย LINE responses จำลอง รวมถึง invalid claims, missing configuration, session expiry, demo rejection และกรณี 503 ต้องไม่ตามด้วย demo POST

## หน้าสมัครเชื่อม LINE ได้ แต่โหลดข้อมูลไม่ได้

ถ้า log ของ `POST /liff/register` แสดง `getOrgInviteByToken: TypeError: fetch failed` หรือหน้า LIFF อื่นแสดง `getEmployeeByLineId: TypeError: fetch failed` ให้ตรวจ Data API ของ Supabase ก่อนเปลี่ยนการตั้งค่า LINE หรือ Redis เหตุการณ์ 12 พฤศจิกายน 2026 พบว่าชื่อโดเมนของโปรเจกต์ Supabase เดิมตอบ `NXDOMAIN` จากทั้ง Cloudflare และ Google DNS ต่อมา DNS กลับมาตอบและ Data API ของ `org_invites` และ `employees` คืน HTTP 200

เปิดโปรเจกต์ที่ใช้จริงใน Supabase Dashboard หากสถานะเป็น Paused ให้ใช้ **Resume project** ตาม [คู่มือ Supabase](https://supabase.com/docs/guides/platform/free-project-pausing) หากเป็น Active ให้ตรวจ Project URL เทียบกับ `NEXT_PUBLIC_SUPABASE_URL` ใน Vercel Production โดยไม่ส่ง API key ในแชท การอ่านสถานะหรือคำเชิญล้มเหลวจะแจ้งให้ลองใหม่ โดยไม่ถือว่าคำเชิญไม่ถูกต้องหรืออนุญาตให้สมัครข้ามการตรวจสิทธิ์

## Dashboard แจ้งชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง

หน้า `/login` ตรวจบัญชีผู้ดูแลจาก `DASHBOARD_AUTH_USERNAME` และ `DASHBOARD_AUTH_PASSWORD` ของ deployment ปัจจุบัน ชื่อผู้ใช้ตัดช่องว่างหัวท้าย รหัสผ่านต้องตรงทุกตัวอักษร หากต้องการใช้บัญชีอื่น ให้แก้ตัวแปรทั้งสองใน Vercel Production แล้ว redeploy ไม่ต้องแก้ SQL หรือตั้งค่า LINE Login ใหม่
