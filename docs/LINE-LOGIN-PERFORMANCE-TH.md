# ลดเวลาเปิด LINE LIFF และใช้ Redis เก็บ Login Session

วันที่อัปเดต: 9 พฤศจิกายน 2026

คู่มือนี้อธิบายชุดแก้ไขใน working tree และขั้นตอนเชื่อม Redis ของโปรเจกต์ `ec-hr` เจ้าของโปรเจกต์เป็นผู้เพิ่ม credentials และรัน SQL เอง ยังต้องทดสอบด้วยบัญชี LINE และ Redis จริงหลังตั้งค่าและ deploy

## สาเหตุที่พบในโค้ดเดิม

ระบบมี signed HttpOnly cookie สำหรับ LIFF อยู่แล้ว หน้า server ที่มี cookie จึงไม่จำเป็นต้อง login กับ LINE ใหม่ทุกครั้ง แต่ฟอร์มลงเวลา ลา OT ติดต่อหัวหน้า และลงทะเบียน ยังเรียก `initLiff()` ของ client ซึ่งรอ LIFF SDK แล้วส่ง ID token ไปตรวจที่ LINE ซ้ำ การเข้าแต่ละหน้าอาจเสียเวลาเพิ่มทั้ง SDK, API ของแอป และ API ของ LINE

อีกจุดหนึ่งคือ `getOrgTrialStatus()` เคยโหลดข้อมูลบริษัทก่อน แล้วโหลดข้อมูลพนักงานทุกคอลัมน์ในบริษัทเพื่อนับจำนวนที่นั่ง ทั้งที่ต้องการเพียงจำนวนคนที่ active หรือ pending_review

ยังไม่มีข้อมูลวัด latency แยกทุกขั้นจากมือถือจริง จึงควรประเมินจากจำนวนคำขอที่ลดลงก่อน ไม่รับรองว่าเร็วขึ้นเป็นกี่เท่าหรือเปิดหน้าได้ทันทีทุกครั้ง

## การทำงานหลังปรับ

### LIFF และฟอร์มในแอป

1. ครั้งแรกยังให้ LIFF SDK ยืนยันตัวตน แล้วส่ง raw ID token ไปให้ server ตรวจสอบกับ LINE
2. เมื่อยืนยันสำเร็จ server สร้าง session ของแอปเอง เก็บข้อมูลยืนยันตัวตน/โปรไฟล์ที่จำเป็นใน Redis และส่ง signed HttpOnly cookie ให้ browser
3. ครั้งถัดไป client เริ่ม LIFF SDK และอ่าน session เดิมจาก `GET /api/liff/session` พร้อมกัน เมื่อ LINE identity ตรงกับ session ที่ server ยืนยันไว้ จะไม่ POST token ไปตรวจ LINE ซ้ำ
4. คำขอ bootstrap ที่เกิดพร้อมกันในหน้าเดียวกันถูกรวมระหว่างกำลังทำงาน ช่วยลดคำขอซ้ำจาก component หลายตัว
5. หากเปลี่ยนบัญชี LINE จะส่ง raw token ของบัญชีใหม่ไป verify ก่อนใช้ identity ใหม่ ไม่รับ user ID หรือ decoded token จาก client เป็นสิทธิ์ฝั่ง server
6. URL ที่มีขั้นตอน redirect ของ LIFF ยังต้องให้ `liff.init()` ประมวลผลให้จบ ไม่ตัด query/hash หรือ redirect เองก่อน SDK พร้อม

การเก็บ session ของแอปเป็นแนวทางที่ LINE รองรับ ควรเก็บ session ของบริการเองหลัง verify token ไม่ใช้ LINE access token เป็น session ระยะยาว ดู [คำแนะนำเรื่อง token และ service session ของ LINE](https://developers.line.biz/en/tips/2026/08/13/send-token-to-server/)

### อายุของ Login Session

| การตั้งค่า | ค่าตั้งต้น |
|---|---|
| อายุสูงสุดนับจากสร้าง session | 7 วัน |
| หมดอายุหากไม่ใช้งาน | 24 ชั่วโมง |
| ไม่มี Redis configuration | ใช้ signed cookie แบบเดิม อายุไม่เกิน 8 ชั่วโมง |

Cookie เดิมก่อน deploy ยังคงใช้งานได้ตามอายุเดิมไม่เกิน 8 ชั่วโมง และเปิดหน้าได้โดยลดการตรวจ LINE ซ้ำ หากต้องการเริ่มใช้ Redis session ใหม่ทันที ให้ออกจากระบบแล้วเข้าสู่ระบบอีกครั้งหนึ่ง เมื่อ cookie เดิมหมดอายุ ระบบจะใช้ Redis session ในการ login ครั้งถัดไปโดยอัตโนมัติ

การใช้งานต่อเนื่องขยับเวลา idle ได้ แต่อายุสูงสุด 7 วันไม่ถูกยืดออกไปเรื่อย ๆ อายุ Login Session เป็นคนละเรื่องกับ session ความจำของ AI ซึ่งมี configuration ของตัวเอง

หาก Redis ถูกตั้งค่าไว้แล้วแต่ติดต่อไม่ได้ ระบบไม่ถือว่า session นั้นผ่านการยืนยันโดยอัตโนมัติ ให้ตรวจการเชื่อมต่อ Redis แล้วลองใหม่ การลบ/หมดอายุ/evict session ใน Redis ทำให้ต้องยืนยัน session ใหม่

### ขอบเขต release นี้

ชุดที่ส่งเข้า main นี้ปรับ login/session ของ LINE LIFF และการเปิดฟอร์มผ่าน LINE OA รวมถึง query ตรวจ trial โดยคงระบบ owner dashboard เดิมไว้ ชุด Web SSO และ Dashboard ที่แยกสิทธิ์ตามบริษัท/ทีมยังเป็นงานแยกใน working tree และไม่ได้ถูกนำมาปล่อยเพียงบางส่วน

เมื่อใช้ LIFF ใน browser ภายนอก session ของแอปที่ยัง valid สามารถใช้งานต่อได้แม้ token ภายใน SDK หมดอายุ ส่วนการเปิดใน LINE ยังตรวจ identity ที่ SDK ได้ก่อนใช้ session เดิม

### ข้อมูลที่ตรวจใหม่

Redis เก็บเฉพาะข้อมูล login ที่จำเป็น ไม่เก็บสิทธิ์ HR เงินเดือน ทีมที่ดูแล หรือสถานะบริษัทเป็นสิทธิ์ถาวรใน cache การเข้าใช้งานยังตรวจสถานะพนักงาน บริษัท trial และขอบเขตทีมจากข้อมูลล่าสุด การลบบัญชีหรือปิดใช้งานจึงไม่ควรได้รับสิทธิ์เดิมจาก Redis

การตรวจ trial เปลี่ยนเป็น query แบบ `count/head` โดยกรองบริษัทและสถานะ active/pending_review และโหลดพร้อมข้อมูลบริษัท ไม่โหลดรายชื่อพร้อมข้อมูลส่วนบุคคลทั้งบริษัทเพียงเพื่อนับจำนวน

## เชื่อม Redis ที่มีอยู่กับ Vercel

ใช้ Redis เดิมได้ ไม่จำเป็นต้องสร้าง database ซ้ำ

1. เปิด [Vercel โปรเจกต์ ec-hr](https://vercel.com/natthaphats-projects/ec-hr)
2. เข้า **Storage** หรือ **Infrastructure → Storage** แล้วเลือก Redis ที่มีอยู่ ชื่อเมนูอาจต่างกันตามหน้า dashboard
3. เลือก **Connect to Project** และเชื่อมกับ `ec-hr`
4. เลือก environment ที่ต้องการให้ชัด เช่น Production; Preview ควรมี namespace หรือ resource ของตัวเอง
5. ตรวจ Environment Variables ที่ integration เติมให้ เลือกชุด credentials ตามชนิด Redis ด้านล่าง ไม่ต้องคัดลอก secrets ลงใน source code
6. เพิ่มหรือยืนยันค่าตั้งต้น session แล้ว deploy/redeploy source ชุดนี้ การเชื่อม env อย่างเดียวไม่เปลี่ยนค่าของ deployment ที่สร้างไปแล้ว

หาก Redis เป็นของ Upstash ให้ใช้ REST URL/token ที่มีสิทธิ์เขียน เพราะการสร้าง ต่ออายุ และลบ session ต้องเขียนข้อมูล ไม่ใช้ read-only token หากเป็น Redis Cloud หรือ Redis ที่ให้ connection string แบบ TCP ให้ใช้ `REDIS_URL`

Vercel เชื่อม Redis ผ่าน Marketplace และสามารถเติม env ให้โปรเจกต์อัตโนมัติได้ ดู [Redis on Vercel](https://vercel.com/docs/redis) และ [Marketplace Storage](https://vercel.com/docs/marketplace-storage)

## Environment Variables

เลือก credentials **หนึ่งชุดที่ตรงกับ resource** ของคุณ:

```dotenv
# Upstash REST
UPSTASH_REDIS_REST_URL=<HTTPS REST URL>
UPSTASH_REDIS_REST_TOKEN=<write-capable server-only token>
```

หรือชื่อ env ที่ integration ของ Vercel KV/Upstash เดิมเติมให้:

```dotenv
KV_REST_API_URL=<HTTPS REST URL>
KV_REST_API_TOKEN=<write-capable server-only token>
```

หรือ Redis connection string:

```dotenv
REDIS_URL=<redis://... หรือ rediss://... ตาม provider>
```

แล้วเพิ่ม/ตรวจ configuration ของแอป:

```dotenv
NEXT_PUBLIC_APP_URL=https://hr.ecloudtec.com
LINE_LOGIN_CHANNEL_ID=<LINE Login channel ที่เป็นเจ้าของ LIFF>
LIFF_SESSION_SECRET=<random server-only secret อย่างน้อย 32 ตัวอักษร>

LIFF_LOGIN_MAX_AGE_SECONDS=604800
LIFF_LOGIN_IDLE_TTL_SECONDS=86400
SESSION_REDIS_TIMEOUT_MS=2000
SESSION_REDIS_NAMESPACE=hr-saas-prod
```

`LIFF_LOGIN_*` และ timeout มีค่า default ตามตัวอย่าง ส่วน namespace แนะนำให้กำหนดคงที่และแยก environment เช่น `hr-saas-prod` กับ `hr-saas-preview` เพื่อลดการชนกันเมื่อใช้ Redis resource เดียวกัน อย่าเปลี่ยน namespace โดยไม่ตั้งใจ เพราะ session เดิมจะอยู่คนละ key space และผู้ใช้ต้องยืนยันใหม่

`LIFF_SESSION_SECRET` ต้องเป็น secret สุ่มอย่างน้อย 32 ตัวอักษร ระบบ Dashboard แบบ owner เดิมใช้ configuration เดิม Redis credentials และ signing secrets ทุกตัวต้องเป็น server-only ห้ามตั้งชื่อขึ้นต้น `NEXT_PUBLIC_`

เครื่อง dev ให้เพิ่ม credentials ใน `.env.local` หรือไฟล์ local ที่ตั้งใจใช้ ตรวจ `.env.development.local` ด้วย เพราะ Next.js ให้อ่านไฟล์นี้ก่อน `.env.local` เมื่อรัน dev ค่าที่อยู่ใน process environment มี priority สูงสุด อย่า commit secrets ขึ้น Git

โค้ดอ่าน credentials ที่ resource integration เติมให้ใน Vercel ได้โดยตรง ใช้ Redis resource ที่เชื่อมกับ `ec-hr` อยู่แล้ว ไม่ต้องสร้างฐานข้อมูลซ้ำ การตั้งค่าและ secrets ของ resource จัดการผ่าน dashboard ของเจ้าของโปรเจกต์

## ใช้ hostname เดียวกัน

แนะนำให้ตั้ง Endpoint URL ของ LIFF, Rich Menu links, App URL ให้ใช้ `https://hr.ecloudtec.com` อย่างสอดคล้องกัน

Cookie ของ `hr.ecloudtec.com` กับ `ec-hr-one.vercel.app` เป็นคนละชุด แม้เป็น deployment เดียวกัน การเปิดสลับ host จึงอาจต้องสร้าง session ใหม่ ข้อมูลใน Redis ร่วมกันไม่ได้ทำให้ cookie ข้าม domain ได้เอง

อย่าแก้ด้วย server redirect ของหน้า LIFF ก่อน `liff.init()` ทำงานเสร็จ เพราะอาจรบกวน primary/secondary redirect และข้อมูลที่ LINE ส่งมา ให้แก้ Endpoint URL/ลิงก์ใน LINE Console ให้ตรง host แทน ดู [ข้อกำหนดการอ่าน URL หลัง LIFF init](https://developers.line.biz/en/tips/2026/07/16/liff-url-additional-info/) และ [การ initialize LIFF](https://developers.line.biz/en/docs/liff/developing-liff-apps)

## SQL ที่เกี่ยวข้อง

Login Session เก็บใน Redis จึงไม่ต้องสร้างตาราง session ใหม่ใน Supabase

มี SQL ทางเลือกที่ `supabase/migrations/v10_login_performance_indexes.sql` สำหรับตรวจให้มี index `(org_id, account_status)` รองรับการนับที่นั่ง หากรัน migration v3 ครบแล้ว index ชื่อ `idx_employees_org_status` มีอยู่แล้ว ไม่จำเป็นต้องเพิ่ม index ใหม่ Script ใช้ `IF NOT EXISTS` และไม่มีการแก้ข้อมูล

`employees.line_user_id` มี unique index จาก schema เดิม และ `organizations.id` เป็น primary key อยู่แล้ว จึงไม่เพิ่ม index ซ้ำสำหรับสองคอลัมน์นี้ รอบพัฒนานี้ไม่ได้รัน SQL บนฐานข้อมูลจริง

## Region และ latency ที่ยังต้องตรวจ

deployment ที่เคยตรวจในรอบก่อนใช้ Functions ที่ `iad1` ขณะที่ผู้ใช้ส่วนใหญ่อยู่ไทย ควรตรวจ region ของ deployment ปัจจุบัน รวมถึง region ของ Supabase และ Redis ก่อนเลือกย้าย

Functions ควรอยู่ใกล้ฐานข้อมูลที่ต้องเรียกบ่อย การเปลี่ยนเป็น Singapore โดยดูเฉพาะตำแหน่งผู้ใช้อาจทำให้ query ช้าลงถ้าฐานข้อมูลอยู่ไกลกว่าเดิม จึงยังไม่เปลี่ยน region อัตโนมัติ ดู [การตั้ง region ของ Vercel Functions](https://vercel.com/docs/functions/configuring-functions/region)

สิ่งที่ Redis ไม่ทำให้หายไปทั้งหมด ได้แก่ consent/login ครั้งแรก การเริ่ม LIFF SDK เครือข่ายบนมือถือ การค้น GPS และการโหลดข้อมูลจริงจากฐานข้อมูล ส่วนความช้าของข้อความใน LINE OA ผ่าน webhook เป็นอีกเส้นทางหนึ่ง เช่นการ query หรือรอ AI ตอบ ไม่ได้เกิดจาก browser login session นี้

## ตรวจหลังตั้งค่าและ deploy

1. เปิด LIFF ด้วย LINE จริงครั้งแรก ให้ login/consent จนสำเร็จ
2. เข้าเมนูลงเวลา ลา OT และย้อนกลับ ตรวจว่า resume session ได้ และไม่มี POST ไป verify LINE ซ้ำเมื่อเป็น identity เดิม
3. ปิดแล้วเปิด LIFF ใหม่ ทดสอบการใช้ session เดิมภายในอายุที่ตั้งไว้
4. ลอง sign out และเปลี่ยนบัญชี LINE ต้องไม่ใช้ profile/identity ของบัญชีเดิมต่อโดยไม่ตรวจใหม่
5. ทดลอง inactive/delete บัญชีทดสอบแล้วตรวจว่ายังถูกปฏิเสธตามสถานะล่าสุด แม้ cookie ยังไม่หมดอายุ
6. ตรวจพฤติกรรมเมื่อ Redis ไม่พร้อมใน environment ทดสอบ ระบบต้องแสดงปัญหาหรือให้ยืนยันใหม่ตาม session ที่รองรับ ไม่ผ่านสิทธิ์เพราะอ่าน Redis ไม่ได้
7. เปรียบเทียบระยะเวลาและจำนวนคำขอก่อน/หลังจากเครื่องและเครือข่ายเดียวกัน แยกเวลา SDK, API ของแอป, LINE verify และ query ฐานข้อมูล

การใช้ mock/local Redis ตรวจ logic ได้ แต่ไม่ยืนยัน latency ของ Redis resource จริงหรือพฤติกรรม browser ของ LINE บนมือถือ ต้องทดสอบสองส่วนนี้ก่อนรับรองผลให้ลูกค้า

## ผลตรวจในรอบพัฒนา

- `npm run check:liff-login` ผ่าน: ตรวจ token/nonce, session resume, account switch, คำขอซ้อน, logout และ Redis error ด้วยข้อมูลจำลอง
- `npm run check:login-redis` ผ่านกับ Redis จำลองภายใน: เชื่อมทั้ง REST และ TCP ด้วย node-redis จริง และรัน Lua จริงเพื่อตรวจ expiry/touch, rotation, revocation และ namespace โดยไม่ใช้ credentials จริง
- ตรวจ HTTP ของแอปจริงกับ Redis จำลองแล้ว: cookie อายุสูงสุด 7 วัน, GET ซ้ำใช้ session เดิม, หน้า LIFF เปิดได้, cross-origin logout ถูกปฏิเสธ และ cookie เก่าใช้ไม่ได้หลัง revoke
- ตรวจใน browser แล้ว: เปิดหน้า LIFF → เปลี่ยนหน้าขอลา → ออกจากระบบได้ และไม่กลับไป auto-login บนหน้า signed-out
- TypeScript และ production build ผ่านจาก isolated checkout ที่มีเฉพาะไฟล์ release นี้ ขั้นตอนทดสอบไม่ได้แก้ `.env` จริงหรือรัน SQL บนฐานข้อมูลจริง

คำสั่ง `check:login-redis` ต้องมี test Redis บน localhost ตามค่าของ script (TCP 6397 และ REST bridge 6398) หรือกำหนด `LOGIN_TEST_REDIS_*` ให้ชี้ localhost เท่านั้น ห้ามใช้ฐานข้อมูล production เป็น test fixture

## ตรวจ runtime หลัง deploy

`/api/liff/session` ส่ง header `X-Login-Session-Store: redis` เมื่อมี Redis configuration โดยไม่เปิดเผย credentials คำขอ token ที่ตั้งใจให้ผิดต้องยังได้ `401 invalid_id_token` และไม่สร้าง session; หากได้ `503 session_store_unavailable` ให้ตรวจการเชื่อมต่อ/สิทธิ์อ่านเขียนของ Redis การตรวจ SET/EVAL ต้องใช้ login ที่สำเร็จจริง
