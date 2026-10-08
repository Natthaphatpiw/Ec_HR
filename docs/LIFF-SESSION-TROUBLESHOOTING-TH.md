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
npm run type-check
npm run build
```

Script ทดสอบ route/client จริงด้วย LINE responses จำลอง รวมถึง invalid claims, missing configuration, session expiry, demo rejection และกรณี 503 ต้องไม่ตามด้วย demo POST
