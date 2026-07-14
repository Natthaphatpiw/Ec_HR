-- =============================================================================
-- EC AIHR comprehensive demo tenant: บริษัท สยามออโรร่า ฟู้ดส์ จำกัด
-- =============================================================================
-- PURPOSE
--   Adds a deterministic, presentation-ready data set around a REAL LINE-bound
--   company owner. It never creates or claims the owner account itself.
--
-- REQUIRED RUN ORDER
--   1. Apply supabase/schema.sql.
--   2. Apply migrations in order: v2, v3, v4, v5.
--   3. Deploy with DEMO_MODE=false and register the company owner through
--      /liff/register-supervisor using this exact business name:
--        บริษัท สยามออโรร่า ฟู้ดส์ จำกัด
--   4. Confirm that registration is active and organizations.owner_employee_id
--      points to that LINE-bound supervisor.
--   5. Run this file in the Supabase SQL Editor.
--
-- SAFETY / IDEMPOTENCY
--   - The script aborts before writes when the real active LINE-bound owner is
--     missing, or when the reserved demo UUID/code namespace collides.
--   - It uses deterministic UUIDs and ON CONFLICT for every seeded entity.
--   - It never truncates tables and never changes any employees.line_user_id.
--   - Re-running preserves existing request decisions, payroll rows, attendance
--     corrections, and notifications by using ON CONFLICT DO NOTHING there.
--   - All clearly synthetic employee identifiers are marked DEMO-* and every
--     mock employee has metadata.demo_seed=true.
--
-- DATE FRAME
--   The fixed anchor date is 2026-07-13. Keeping it fixed makes IDs, metrics,
--   payroll, and dashboard stories reproducible. Change it only before the
--   first run if a later demo frame is intentionally required.
-- =============================================================================

-- Preflight visibility query. This is informational; the transaction below
-- performs the authoritative checks and raises a descriptive exception.
SELECT
  o.id AS organization_id,
  COALESCE(o.business_name, o.name) AS business_name,
  o.owner_employee_id,
  owner.employee_code AS owner_employee_code,
  owner.account_status AS owner_status,
  owner.is_supervisor,
  owner.role AS owner_role,
  (owner.line_user_id IS NOT NULL AND owner.line_user_id <> '') AS owner_line_bound
FROM organizations o
LEFT JOIN employees owner ON owner.id = o.owner_employee_id
WHERE COALESCE(NULLIF(o.business_name, ''), o.name) = 'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด';

BEGIN;

SET LOCAL TIME ZONE 'Asia/Bangkok';

DO $$
DECLARE
  v_org_id UUID;
  v_owner_id UUID;
  v_missing_tables TEXT[];
BEGIN
  SELECT ARRAY_REMOVE(ARRAY[
    CASE WHEN to_regclass('public.contact_requests') IS NULL THEN 'contact_requests' END,
    CASE WHEN to_regclass('public.schedule_assignments') IS NULL THEN 'schedule_assignments' END,
    CASE WHEN to_regclass('public.schedule_entries') IS NULL THEN 'schedule_entries' END,
    CASE WHEN to_regclass('public.schedule_changes') IS NULL THEN 'schedule_changes' END,
    CASE WHEN to_regclass('public.org_invites') IS NULL THEN 'org_invites' END
  ], NULL)
  INTO v_missing_tables;

  IF COALESCE(array_length(v_missing_tables, 1), 0) > 0 THEN
    RAISE EXCEPTION
      'Missing required migrated tables: %. Apply v2-v5 before this demo seed.',
      array_to_string(v_missing_tables, ', ');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'geofence_enabled'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payrolls'
      AND column_name = 'calculation_details'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payrolls'
      AND column_name = 'calculation_status'
  ) THEN
    RAISE EXCEPTION
      'Migration v5 is incomplete. Expected geofence and payroll audit columns.';
  END IF;

  SELECT o.id, o.owner_employee_id
  INTO v_org_id, v_owner_id
  FROM organizations o
  WHERE COALESCE(NULLIF(o.business_name, ''), o.name) =
        'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด'
  ORDER BY o.created_at
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION
      'Company not found. Register the owner through LINE first using the exact name: บริษัท สยามออโรร่า ฟู้ดส์ จำกัด';
  END IF;

  IF v_owner_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.id = v_owner_id
      AND e.org_id = v_org_id
      AND e.account_status = 'active'
      AND NULLIF(e.line_user_id, '') IS NOT NULL
      AND (e.is_supervisor = TRUE OR e.role IN ('supervisor', 'executive'))
  ) THEN
    RAISE EXCEPTION
      'The company must have an active LINE-bound owner/supervisor before seeding. Complete /liff/register-supervisor first.';
  END IF;
END
$$;

CREATE TEMP TABLE _saf_context ON COMMIT DROP AS
SELECT
  o.id AS org_id,
  o.owner_employee_id AS owner_id,
  DATE '2026-07-13' AS anchor_date,
  13.740198598326677::NUMERIC(10,8) AS site_lat,
  100.56227944249513::NUMERIC(11,8) AS site_lng
FROM organizations o
JOIN employees owner
  ON owner.id = o.owner_employee_id
 AND owner.org_id = o.id
 AND owner.account_status = 'active'
 AND NULLIF(owner.line_user_id, '') IS NOT NULL
WHERE COALESCE(NULLIF(o.business_name, ''), o.name) =
      'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด'
ORDER BY o.created_at
LIMIT 1;

-- The tenant is intentionally made presentation-ready, while its real owner
-- identity and LINE binding remain untouched.
UPDATE organizations o
SET
  name = 'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด',
  business_name = 'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด',
  business_name_norm = LOWER(TRIM('บริษัท สยามออโรร่า ฟู้ดส์ จำกัด')),
  business_type = 'factory',
  timezone = 'Asia/Bangkok',
  geofence_lat = c.site_lat,
  geofence_lng = c.site_lng,
  geofence_radius = 180,
  geofence_enabled = TRUE,
  tier = 'enterprise',
  seat_limit = GREATEST(COALESCE(o.seat_limit, 0), 100),
  trial_ends_at = GREATEST(
    COALESCE(o.trial_ends_at, TIMESTAMPTZ '2030-12-31 23:59:59+07'),
    TIMESTAMPTZ '2030-12-31 23:59:59+07'
  ),
  is_active = TRUE
FROM _saf_context c
WHERE o.id = c.org_id;

-- Give the real owner enough accounting context for their own LIFF payslip,
-- but never replace values they entered during registration.
UPDATE employees owner
SET
  base_salary = COALESCE(owner.base_salary, 95000),
  department = COALESCE(owner.department, 'บริหาร'),
  position = COALESCE(owner.position, 'กรรมการผู้จัดการ'),
  job_title = COALESCE(owner.job_title, 'Managing Director'),
  hire_date = COALESCE(owner.hire_date, DATE '2020-01-02'),
  employment_type = COALESCE(owner.employment_type, 'full_time'),
  tax_profile = CASE
    WHEN owner.tax_profile IS NULL OR owner.tax_profile = '{}'::JSONB THEN
      '{
        "personal_allowance": 60000,
        "spouse_allowance": 60000,
        "child_allowance": 60000,
        "parent_allowance": 0,
        "insurance_deduction": 25000,
        "provident_fund_deduction": 60000,
        "other_deductions": 0
      }'::JSONB
    ELSE owner.tax_profile
  END
FROM _saf_context c
WHERE owner.id = c.owner_id;

-- -----------------------------------------------------------------------------
-- 36 synthetic employees across 10 departments.
-- Reserved UUID namespace: a2000000-0000-4000-8000-000000000001..036
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _saf_people (
  id UUID PRIMARY KEY,
  idx INTEGER NOT NULL UNIQUE,
  employee_code TEXT NOT NULL UNIQUE,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  gender TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  shift_group TEXT NOT NULL,
  base_salary NUMERIC NOT NULL
) ON COMMIT DROP;

INSERT INTO _saf_people
  (id, idx, employee_code, name_th, name_en, gender, role, department, position, shift_group, base_salary)
VALUES
  ('a2000000-0000-4000-8000-000000000001',  1, 'SAF001', 'กิตติพงศ์ สุวรรณ',       'Kittipong Suwan',       'male',   'executive',  'บริหาร',                       'รองกรรมการผู้จัดการ',         'A', 78000),
  ('a2000000-0000-4000-8000-000000000002',  2, 'SAF002', 'พิมพ์ชนก วัฒนศรี',       'Pimchanok Wattanasri',  'female', 'hr',         'ทรัพยากรบุคคล',                'ผู้จัดการฝ่ายบุคคล',           'A', 52000),
  ('a2000000-0000-4000-8000-000000000003',  3, 'SAF003', 'ธนกฤต แสงทอง',           'Thanakrit Saengthong',  'male',   'employee',   'การเงินและบัญชี',               'นักบัญชีอาวุโส',               'A', 46000),
  ('a2000000-0000-4000-8000-000000000004',  4, 'SAF004', 'ชนิกานต์ พูลผล',          'Chanikan Phunphon',     'female', 'supervisor', 'ผลิต',                         'ผู้จัดการฝ่ายผลิต',             'A', 56000),
  ('a2000000-0000-4000-8000-000000000005',  5, 'SAF005', 'สมชาย มั่นคง',            'Somchai Mankhong',      'male',   'employee',   'ผลิต',                         'หัวหน้าไลน์บรรจุ',              'A', 28500),
  ('a2000000-0000-4000-8000-000000000006',  6, 'SAF006', 'สุนิสา ใจดี',             'Sunisa Jaidee',         'female', 'employee',   'ผลิต',                         'พนักงานควบคุมเครื่องจักร',       'A', 21500),
  ('a2000000-0000-4000-8000-000000000007',  7, 'SAF007', 'ประเสริฐ พูนทรัพย์',       'Prasert Phunsap',       'male',   'employee',   'ผลิต',                         'พนักงานผสมวัตถุดิบ',             'B', 20500),
  ('a2000000-0000-4000-8000-000000000008',  8, 'SAF008', 'วรัญญา มีสุข',             'Waranya Meesuk',        'female', 'employee',   'ผลิต',                         'พนักงานบรรจุภัณฑ์',              'B', 18500),
  ('a2000000-0000-4000-8000-000000000009',  9, 'SAF009', 'อานนท์ เกษมศรี',           'Anon Kasemsri',         'male',   'employee',   'ผลิต',                         'พนักงานเตรียมวัตถุดิบ',           'C', 19500),
  ('a2000000-0000-4000-8000-000000000010', 10, 'SAF010', 'นิตยา พรหมมา',            'Nittaya Promma',        'female', 'employee',   'ผลิต',                         'พนักงานบรรจุภัณฑ์',              'C', 18000),
  ('a2000000-0000-4000-8000-000000000011', 11, 'SAF011', 'ชยพล ทองแท้',             'Chayaphon Thongthae',   'male',   'employee',   'ผลิต',                         'พนักงานผลิต',                    'A', 17000),
  ('a2000000-0000-4000-8000-000000000012', 12, 'SAF012', 'กมลวรรณ บุญช่วย',          'Kamonwan Bunchuai',     'female', 'employee',   'ผลิต',                         'พนักงานผลิต',                    'B', 16500),
  ('a2000000-0000-4000-8000-000000000013', 13, 'SAF013', 'ณัฐพงษ์ รุ่งเรือง',         'Nattapong Rungrueang',  'male',   'supervisor', 'ควบคุมคุณภาพ',                  'หัวหน้าควบคุมคุณภาพ',            'A', 44000),
  ('a2000000-0000-4000-8000-000000000014', 14, 'SAF014', 'ศิริพร แก้วใส',            'Siriporn Kaewsai',      'female', 'employee',   'ควบคุมคุณภาพ',                  'นักวิทยาศาสตร์อาหาร',             'A', 36000),
  ('a2000000-0000-4000-8000-000000000015', 15, 'SAF015', 'พีรวิชญ์ จันทร์เพ็ญ',       'Peerawit Chanphen',     'male',   'employee',   'ควบคุมคุณภาพ',                  'เจ้าหน้าที่ QA',                 'B', 31000),
  ('a2000000-0000-4000-8000-000000000016', 16, 'SAF016', 'ธัญชนก สมบูรณ์',           'Thanchanok Somboon',    'female', 'employee',   'ควบคุมคุณภาพ',                  'เจ้าหน้าที่ QC',                 'B', 28500),
  ('a2000000-0000-4000-8000-000000000017', 17, 'SAF017', 'อรทัย วงศ์ดี',             'Orathai Wongdee',       'female', 'employee',   'ควบคุมคุณภาพ',                  'เจ้าหน้าที่ห้องปฏิบัติการ',         'A', 29500),
  ('a2000000-0000-4000-8000-000000000018', 18, 'SAF018', 'จักรกฤษณ์ สิงห์โต',         'Jakkrit Singto',        'male',   'employee',   'ควบคุมคุณภาพ',                  'ผู้ตรวจสอบคุณภาพ',               'C', 27000),
  ('a2000000-0000-4000-8000-000000000019', 19, 'SAF019', 'เอกภพ ตั้งใจ',             'Ekkaphop Tangjai',      'male',   'supervisor', 'วิศวกรรมและซ่อมบำรุง',           'ผู้จัดการซ่อมบำรุง',              'B', 49000),
  ('a2000000-0000-4000-8000-000000000020', 20, 'SAF020', 'วิชัย พร้อมงาน',            'Wichai Phromngan',      'male',   'employee',   'วิศวกรรมและซ่อมบำรุง',           'ช่างไฟฟ้า',                      'A', 32000),
  ('a2000000-0000-4000-8000-000000000021', 21, 'SAF021', 'มนัสชัย กล้าหาญ',           'Manatchai Klahan',      'male',   'employee',   'วิศวกรรมและซ่อมบำรุง',           'ช่างเครื่องกล',                  'B', 31000),
  ('a2000000-0000-4000-8000-000000000022', 22, 'SAF022', 'สุภาวดี แสงจันทร์',         'Supawadee Saengchan',   'female', 'employee',   'วิศวกรรมและซ่อมบำรุง',           'วิศวกรกระบวนการ',                'A', 41000),
  ('a2000000-0000-4000-8000-000000000023', 23, 'SAF023', 'ไพศาล ชำนาญ',             'Paisan Chamnan',        'male',   'employee',   'วิศวกรรมและซ่อมบำรุง',           'ช่างเทคนิค',                     'C', 28000),
  ('a2000000-0000-4000-8000-000000000024', 24, 'SAF024', 'รัตนา เพียรดี',             'Rattana Phiandee',      'female', 'supervisor', 'คลังสินค้าและโลจิสติกส์',          'ผู้จัดการคลังสินค้า',             'A', 45000),
  ('a2000000-0000-4000-8000-000000000025', 25, 'SAF025', 'ธวัชชัย ขนส่ง',             'Thawatchai Khonsong',   'male',   'employee',   'คลังสินค้าและโลจิสติกส์',          'หัวหน้าจัดส่ง',                   'A', 33000),
  ('a2000000-0000-4000-8000-000000000026', 26, 'SAF026', 'สุดารัตน์ คงคลัง',          'Sudarat Khongkhlang',   'female', 'employee',   'คลังสินค้าและโลจิสติกส์',          'เจ้าหน้าที่คลังสินค้า',             'B', 24000),
  ('a2000000-0000-4000-8000-000000000027', 27, 'SAF027', 'เกรียงไกร รถดี',            'Kriangkrai Rotdee',     'male',   'employee',   'คลังสินค้าและโลจิสติกส์',          'พนักงานขับรถ',                   'A', 22500),
  ('a2000000-0000-4000-8000-000000000028', 28, 'SAF028', 'บุษบา แพ็กดี',              'Butsaba Paekdee',       'female', 'employee',   'คลังสินค้าและโลจิสติกส์',          'เจ้าหน้าที่วางแผนขนส่ง',            'A', 30000),
  ('a2000000-0000-4000-8000-000000000029', 29, 'SAF029', 'ดร.ปรีชา รสเลิศ',           'Preecha Rosloet',       'male',   'supervisor', 'วิจัยและพัฒนาผลิตภัณฑ์',          'ผู้จัดการวิจัยและพัฒนา',            'A', 58000),
  ('a2000000-0000-4000-8000-000000000030', 30, 'SAF030', 'ชุติมา หอมหวาน',            'Chutima Homwan',        'female', 'employee',   'วิจัยและพัฒนาผลิตภัณฑ์',          'นักพัฒนาผลิตภัณฑ์',               'A', 40000),
  ('a2000000-0000-4000-8000-000000000031', 31, 'SAF031', 'ภาคภูมิ สูตรดี',             'Phakphum Sutdee',       'male',   'employee',   'วิจัยและพัฒนาผลิตภัณฑ์',          'นักวิจัยอาหาร',                  'A', 38000),
  ('a2000000-0000-4000-8000-000000000032', 32, 'SAF032', 'เขมิกา ใหม่สด',             'Khemika Maisot',        'female', 'employee',   'วิจัยและพัฒนาผลิตภัณฑ์',          'ผู้ช่วยห้องทดลอง',                'A', 27000),
  ('a2000000-0000-4000-8000-000000000033', 33, 'SAF033', 'ภูวดล เลือกดี',             'Phuwadon Lueakdee',     'male',   'employee',   'จัดซื้อและวางแผน',                'เจ้าหน้าที่จัดซื้อ',                'A', 36000),
  ('a2000000-0000-4000-8000-000000000034', 34, 'SAF034', 'มณฑิรา แผนดี',              'Monthira Phaendee',     'female', 'employee',   'จัดซื้อและวางแผน',                'นักวางแผนการผลิต',                'A', 39000),
  ('a2000000-0000-4000-8000-000000000035', 35, 'SAF035', 'ทศพล ตลาดดี',               'Todsapon Taladdee',     'male',   'employee',   'ฝ่ายขาย',                       'เจ้าหน้าที่ลูกค้าองค์กร',            'A', 42000),
  ('a2000000-0000-4000-8000-000000000036', 36, 'SAF036', 'พรทิพย์ ปลอดภัย',            'Porntip Plodphai',      'female', 'employee',   'ความปลอดภัยและสิ่งแวดล้อม',        'เจ้าหน้าที่ความปลอดภัย',            'A', 40000);

-- Refuse to take over a real employee code or a reserved UUID belonging to a
-- different tenant. This check occurs before any mock employee write.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM employees e
    JOIN _saf_people p ON p.employee_code = e.employee_code
    CROSS JOIN _saf_context c
    WHERE e.id <> p.id OR e.org_id <> c.org_id
  ) THEN
    RAISE EXCEPTION
      'Reserved SAF employee code collision detected. No employee data was changed.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM employees e
    JOIN _saf_people p ON p.id = e.id
    CROSS JOIN _saf_context c
    WHERE e.org_id <> c.org_id
  ) THEN
    RAISE EXCEPTION
      'Reserved Siam Aurora UUID collision detected. No employee data was changed.';
  END IF;
END
$$;

INSERT INTO employees (
  id,
  org_id,
  employee_code,
  name_th,
  name_en,
  role,
  department,
  position,
  job_title,
  shift_group,
  base_salary,
  bank_account,
  sso_number,
  account_status,
  phone,
  national_id,
  date_of_birth,
  gender,
  nationality,
  marital_status,
  hire_date,
  employment_type,
  address,
  emergency_contact,
  home_lat,
  home_lng,
  home_location_label,
  home_location_source,
  submitted_at,
  approved_at,
  approved_by_id,
  leave_supervisor_id,
  ot_supervisor_id,
  contact_supervisor_id,
  is_supervisor,
  subordinate_ids,
  pdpa_consent_at,
  tax_profile,
  metadata,
  notes,
  created_at
)
SELECT
  p.id,
  c.org_id,
  p.employee_code,
  p.name_th,
  p.name_en,
  p.role,
  p.department,
  p.position,
  p.position,
  p.shift_group,
  p.base_salary,
  'DEMO-BANK-' || LPAD(p.idx::TEXT, 3, '0'),
  'DEMO-SSO-' || LPAD(p.idx::TEXT, 3, '0'),
  'active',
  '000-000-' || LPAD(p.idx::TEXT, 4, '0'),
  'DEMO-NID-' || LPAD(p.idx::TEXT, 3, '0'),
  DATE '1980-01-01' + ((p.idx * 173) % 6200),
  p.gender,
  'TH',
  CASE WHEN p.idx % 4 = 0 THEN 'married' ELSE 'single' END,
  c.anchor_date - (500 + p.idx * 23),
  'full_time',
  'ข้อมูลสังเคราะห์สำหรับสาธิต เขตคลองเตย กรุงเทพมหานคร',
  'ผู้ติดต่อสังเคราะห์ ' || LPAD(p.idx::TEXT, 3, '0') || ' / 000-100-' || LPAD(p.idx::TEXT, 4, '0'),
  c.site_lat + (((p.idx % 7) - 3) * 0.002)::NUMERIC,
  c.site_lng + (((p.idx % 5) - 2) * 0.002)::NUMERIC,
  'ที่อยู่สังเคราะห์สำหรับสาธิต',
  'manual',
  (c.anchor_date - (500 + p.idx * 23) + TIME '09:00') AT TIME ZONE 'Asia/Bangkok',
  (c.anchor_date - (499 + p.idx * 23) + TIME '10:00') AT TIME ZONE 'Asia/Bangkok',
  c.owner_id,
  c.owner_id,
  c.owner_id,
  c.owner_id,
  p.role = 'supervisor',
  '{}'::UUID[],
  (c.anchor_date - (500 + p.idx * 23) + TIME '09:05') AT TIME ZONE 'Asia/Bangkok',
  JSONB_BUILD_OBJECT(
    'personal_allowance', 60000,
    'spouse_allowance', CASE WHEN p.idx % 4 = 0 THEN 60000 ELSE 0 END,
    'child_allowance', CASE WHEN p.idx % 6 = 0 THEN 60000 WHEN p.idx % 5 = 0 THEN 30000 ELSE 0 END,
    'parent_allowance', CASE WHEN p.idx % 9 = 0 THEN 30000 ELSE 0 END,
    'insurance_deduction', CASE WHEN p.idx % 3 = 0 THEN 18000 ELSE 0 END,
    'provident_fund_deduction', ROUND(p.base_salary * 0.03 * 12, 2),
    'other_deductions', 0
  ),
  JSONB_BUILD_OBJECT(
    'demo_seed', TRUE,
    'demo_company', 'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด',
    'mock_index', p.idx,
    'synthetic_identity', TRUE
  ),
  'ข้อมูลสังเคราะห์สำหรับสาธิตระบบ EC AIHR เท่านั้น',
  (c.anchor_date - (500 + p.idx * 23) + TIME '08:00') AT TIME ZONE 'Asia/Bangkok'
FROM _saf_people p
CROSS JOIN _saf_context c
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  employee_code = EXCLUDED.employee_code,
  name_th = EXCLUDED.name_th,
  name_en = EXCLUDED.name_en,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  job_title = EXCLUDED.job_title,
  shift_group = EXCLUDED.shift_group,
  base_salary = EXCLUDED.base_salary,
  bank_account = EXCLUDED.bank_account,
  sso_number = EXCLUDED.sso_number,
  account_status = EXCLUDED.account_status,
  phone = EXCLUDED.phone,
  national_id = EXCLUDED.national_id,
  date_of_birth = EXCLUDED.date_of_birth,
  gender = EXCLUDED.gender,
  nationality = EXCLUDED.nationality,
  marital_status = EXCLUDED.marital_status,
  hire_date = EXCLUDED.hire_date,
  employment_type = EXCLUDED.employment_type,
  address = EXCLUDED.address,
  emergency_contact = EXCLUDED.emergency_contact,
  home_lat = EXCLUDED.home_lat,
  home_lng = EXCLUDED.home_lng,
  home_location_label = EXCLUDED.home_location_label,
  home_location_source = EXCLUDED.home_location_source,
  approved_by_id = EXCLUDED.approved_by_id,
  leave_supervisor_id = EXCLUDED.leave_supervisor_id,
  ot_supervisor_id = EXCLUDED.ot_supervisor_id,
  contact_supervisor_id = EXCLUDED.contact_supervisor_id,
  is_supervisor = EXCLUDED.is_supervisor,
  pdpa_consent_at = EXCLUDED.pdpa_consent_at,
  tax_profile = EXCLUDED.tax_profile,
  metadata = COALESCE(employees.metadata, '{}'::JSONB) || EXCLUDED.metadata,
  notes = EXCLUDED.notes;
-- Intentionally omitted from the UPDATE list: line_user_id and all LINE profile
-- columns. A real binding made after the first seed therefore survives reruns.

-- Preserve every existing real subordinate while adding all 36 mock employees
-- to the real owner's authoritative roster.
UPDATE employees owner
SET
  is_supervisor = TRUE,
  subordinate_ids = ARRAY(
    SELECT DISTINCT employee_id
    FROM UNNEST(COALESCE(owner.subordinate_ids, '{}'::UUID[]) ||
      ARRAY(SELECT p.id FROM _saf_people p ORDER BY p.idx)) AS employee_id
    ORDER BY employee_id
  )
FROM _saf_context c
WHERE owner.id = c.owner_id;

-- Department supervisors retain realistic local rosters. Approval pointers on
-- every mock employee still target the real owner so LINE approvals reach the
-- account that is actually bound during the demo.
UPDATE employees supervisor
SET subordinate_ids = CASE supervisor.employee_code
  WHEN 'SAF004' THEN ARRAY(SELECT id FROM _saf_people WHERE idx BETWEEN 5 AND 12 ORDER BY idx)
  WHEN 'SAF013' THEN ARRAY(SELECT id FROM _saf_people WHERE idx BETWEEN 14 AND 18 ORDER BY idx)
  WHEN 'SAF019' THEN ARRAY(SELECT id FROM _saf_people WHERE idx BETWEEN 20 AND 23 ORDER BY idx)
  WHEN 'SAF024' THEN ARRAY(SELECT id FROM _saf_people WHERE idx BETWEEN 25 AND 28 ORDER BY idx)
  WHEN 'SAF029' THEN ARRAY(SELECT id FROM _saf_people WHERE idx BETWEEN 30 AND 32 ORDER BY idx)
  ELSE supervisor.subordinate_ids
END
WHERE supervisor.id IN (SELECT id FROM _saf_people WHERE role = 'supervisor');

-- -----------------------------------------------------------------------------
-- Shifts and 120-day employee-shift assignments.
-- -----------------------------------------------------------------------------
INSERT INTO shifts (id, org_id, name, start_time, end_time, break_minutes)
SELECT 'a3000000-0000-4000-8000-000000000001'::UUID, c.org_id, 'Morning Shift', TIME '08:00', TIME '17:00', 60 FROM _saf_context c
UNION ALL
SELECT 'a3000000-0000-4000-8000-000000000002'::UUID, c.org_id, 'Evening Shift', TIME '16:00', TIME '01:00', 60 FROM _saf_context c
UNION ALL
SELECT 'a3000000-0000-4000-8000-000000000003'::UUID, c.org_id, 'Night Shift', TIME '00:00', TIME '08:00', 45 FROM _saf_context c
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  name = EXCLUDED.name,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  break_minutes = EXCLUDED.break_minutes;

WITH assignment_days AS (
  SELECT
    p.id AS employee_id,
    p.idx,
    p.shift_group,
    c.anchor_date - day_offset AS work_date,
    day_offset
  FROM _saf_people p
  CROSS JOIN _saf_context c
  CROSS JOIN GENERATE_SERIES(0, 119) AS day_offset
)
INSERT INTO employee_shifts (
  id,
  employee_id,
  date,
  shift_id,
  overtime_hours_calculated
)
SELECT
  MD5('saf-employee-shift|' || d.employee_id || '|' || d.work_date)::UUID,
  d.employee_id,
  d.work_date,
  CASE d.shift_group
    WHEN 'B' THEN 'a3000000-0000-4000-8000-000000000002'::UUID
    WHEN 'C' THEN 'a3000000-0000-4000-8000-000000000003'::UUID
    ELSE          'a3000000-0000-4000-8000-000000000001'::UUID
  END,
  CASE WHEN (d.idx * 3 + d.day_offset) % 17 = 0 THEN 2 ELSE 0 END
FROM assignment_days d
WHERE EXTRACT(ISODOW FROM d.work_date) BETWEEN 1 AND 5
ON CONFLICT (id) DO UPDATE SET
  shift_id = EXCLUDED.shift_id,
  overtime_hours_calculated = EXCLUDED.overtime_hours_calculated;

-- -----------------------------------------------------------------------------
-- Deterministic paired attendance covering 120 calendar days.
-- Missing workdays are intentional absences; every included day has one IN and
-- one OUT. A small number of admin-corrected outside/missing-GPS records make
-- geofence analytics demonstrable without using randomness.
-- -----------------------------------------------------------------------------
WITH base_days AS (
  SELECT
    p.id AS employee_id,
    p.idx,
    p.shift_group,
    c.anchor_date - day_offset AS work_date,
    day_offset,
    c.site_lat,
    c.site_lng
  FROM _saf_people p
  CROSS JOIN _saf_context c
  CROSS JOIN GENERATE_SERIES(0, 119) AS day_offset
),
worked_days AS (
  SELECT *
  FROM base_days
  WHERE EXTRACT(ISODOW FROM work_date) BETWEEN 1 AND 5
    AND (idx * 7 + day_offset) % 31 <> 0
),
events AS (
  SELECT
    d.*,
    'in'::TEXT AS event_type,
    CASE d.shift_group
      WHEN 'B' THEN (
        d.work_date + CASE
          WHEN (d.idx + d.day_offset) % 11 = 0
            THEN TIME '16:08' + (((d.idx + d.day_offset) % 17) * INTERVAL '1 minute')
          ELSE TIME '15:42' + (((d.idx + d.day_offset) % 13) * INTERVAL '1 minute')
        END
      ) AT TIME ZONE 'Asia/Bangkok'
      WHEN 'C' THEN (
        d.work_date + CASE
          WHEN (d.idx + d.day_offset) % 11 = 0
            THEN TIME '00:08' + (((d.idx + d.day_offset) % 17) * INTERVAL '1 minute')
          ELSE TIME '00:00'
        END
      ) AT TIME ZONE 'Asia/Bangkok'
      ELSE (
        d.work_date + CASE
          WHEN (d.idx + d.day_offset) % 11 = 0
            THEN TIME '08:08' + (((d.idx + d.day_offset) % 17) * INTERVAL '1 minute')
          ELSE TIME '07:42' + (((d.idx + d.day_offset) % 13) * INTERVAL '1 minute')
        END
      ) AT TIME ZONE 'Asia/Bangkok'
    END AS event_ts,
    CASE WHEN (d.idx + d.day_offset) % 11 = 0 THEN 'late' ELSE 'ontime' END AS attendance_status
  FROM worked_days d

  UNION ALL

  SELECT
    d.*,
    'out'::TEXT AS event_type,
    CASE d.shift_group
      WHEN 'B' THEN (
        d.work_date + 1 + TIME '01:04' + (((d.idx + d.day_offset) % 19) * INTERVAL '1 minute')
      ) AT TIME ZONE 'Asia/Bangkok'
      WHEN 'C' THEN (
        d.work_date + TIME '08:03' + (((d.idx + d.day_offset) % 16) * INTERVAL '1 minute')
      ) AT TIME ZONE 'Asia/Bangkok'
      ELSE (
        d.work_date + CASE
          WHEN (d.idx * 2 + d.day_offset) % 29 = 0 THEN TIME '16:42'
          ELSE TIME '17:04' + (((d.idx + d.day_offset) % 21) * INTERVAL '1 minute')
        END
      ) AT TIME ZONE 'Asia/Bangkok'
    END AS event_ts,
    CASE WHEN (d.idx * 2 + d.day_offset) % 29 = 0 THEN 'early' ELSE 'ontime' END AS attendance_status
  FROM worked_days d
),
geo AS (
  SELECT
    e.*,
    (e.idx * 31 + e.day_offset * 7 + CASE WHEN e.event_type = 'in' THEN 1 ELSE 2 END) AS geo_key,
    CASE
      WHEN (e.idx * 31 + e.day_offset * 7) % 67 = 0 THEN NULL
      WHEN (e.idx * 31 + e.day_offset * 7) % 41 = 0 THEN e.site_lat + 0.00260000
      ELSE e.site_lat + ((((e.idx + e.day_offset) % 7) - 3) * 0.00007000)
    END AS event_lat,
    CASE
      WHEN (e.idx * 31 + e.day_offset * 7) % 67 = 0 THEN NULL
      WHEN (e.idx * 31 + e.day_offset * 7) % 41 = 0 THEN e.site_lng + 0.00030000
      ELSE e.site_lng + ((((e.idx * 2 + e.day_offset) % 7) - 3) * 0.00006000)
    END AS event_lng,
    CASE
      WHEN (e.idx * 31 + e.day_offset * 7) % 67 = 0 THEN NULL
      WHEN (e.idx * 31 + e.day_offset * 7) % 41 = 0 THEN 291.00
      ELSE (18 + ((e.idx * 7 + e.day_offset) % 91))::NUMERIC
    END AS distance_m,
    CASE
      WHEN (e.idx * 31 + e.day_offset * 7) % 67 = 0 THEN 'missing_location'
      WHEN (e.idx * 31 + e.day_offset * 7) % 41 = 0 THEN 'outside'
      ELSE 'inside'
    END AS geo_result
  FROM events e
)
INSERT INTO attendance_logs (
  id,
  employee_id,
  timestamp,
  type,
  latitude,
  longitude,
  ip_address,
  status,
  photo_url,
  reason,
  source,
  device_label,
  maps_url,
  geofence_distance_m,
  geofence_result
)
SELECT
  MD5('saf-attendance|' || g.employee_id || '|' || g.work_date || '|' || g.event_type)::UUID,
  g.employee_id,
  g.event_ts,
  g.event_type,
  g.event_lat,
  g.event_lng,
  '192.0.2.' || (10 + (g.geo_key % 190)),
  g.attendance_status,
  NULL,
  CASE g.geo_result
    WHEN 'outside' THEN 'รายการสาธิต: HR อนุมัติบันทึกย้อนหลังนอกพื้นที่'
    WHEN 'missing_location' THEN 'รายการสาธิต: อุปกรณ์ไม่ส่งพิกัดและ HR ตรวจสอบแล้ว'
    ELSE NULL
  END,
  CASE WHEN g.geo_result = 'inside' THEN 'liff' ELSE 'admin_correction' END,
  CASE WHEN g.event_type = 'in' THEN 'LINE LIFF demo device / check-in' ELSE 'LINE LIFF demo device / check-out' END,
  CASE
    WHEN g.event_lat IS NULL THEN NULL
    ELSE 'https://maps.google.com/?q=' || g.event_lat || ',' || g.event_lng
  END,
  g.distance_m,
  g.geo_result
FROM geo g
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Current/future schedule, supervisor assignments, and notified change audit.
-- -----------------------------------------------------------------------------
INSERT INTO schedule_assignments (id, supervisor_id, date, entry_type, hours, notes, created_at)
SELECT 'a4000000-0000-4000-8000-000000000001'::UUID, c.owner_id, c.anchor_date + 4,  'overtime', 2, 'คำสั่ง OT สาธิต: เตรียมคำสั่งซื้อเร่งด่วน', (c.anchor_date - 3 + TIME '10:00') AT TIME ZONE 'Asia/Bangkok' FROM _saf_context c
UNION ALL
SELECT 'a4000000-0000-4000-8000-000000000002'::UUID, c.owner_id, c.anchor_date + 11, 'overtime', 3, 'คำสั่ง OT สาธิต: ตรวจนับสินค้ารอบเดือน', (c.anchor_date - 2 + TIME '11:00') AT TIME ZONE 'Asia/Bangkok' FROM _saf_context c
UNION ALL
SELECT 'a4000000-0000-4000-8000-000000000003'::UUID, c.owner_id, c.anchor_date + 18, 'overtime', 2, 'คำสั่ง OT สาธิต: ปิดแผนผลิตประจำสัปดาห์', (c.anchor_date - 1 + TIME '13:00') AT TIME ZONE 'Asia/Bangkok' FROM _saf_context c
ON CONFLICT (id) DO UPDATE SET
  supervisor_id = EXCLUDED.supervisor_id,
  date = EXCLUDED.date,
  entry_type = EXCLUDED.entry_type,
  hours = EXCLUDED.hours,
  notes = EXCLUDED.notes;

WITH schedule_days AS (
  SELECT
    p.id AS employee_id,
    c.owner_id,
    c.anchor_date + day_offset AS schedule_date
  FROM _saf_people p
  CROSS JOIN _saf_context c
  CROSS JOIN GENERATE_SERIES(-14, 35) AS day_offset
)
INSERT INTO schedule_entries (
  id,
  employee_id,
  date,
  entry_type,
  hours,
  notes,
  created_by_id,
  is_supervisor_override,
  supervisor_assignment_id,
  created_at,
  updated_at
)
SELECT
  MD5('saf-schedule-work|' || s.employee_id || '|' || s.schedule_date)::UUID,
  s.employee_id,
  s.schedule_date,
  'work',
  8,
  'ตารางงานมาตรฐานจากชุดข้อมูลสาธิต',
  s.owner_id,
  FALSE,
  NULL,
  (s.schedule_date - 21 + TIME '09:00') AT TIME ZONE 'Asia/Bangkok',
  (s.schedule_date - 21 + TIME '09:00') AT TIME ZONE 'Asia/Bangkok'
FROM schedule_days s
WHERE EXTRACT(ISODOW FROM s.schedule_date) BETWEEN 1 AND 5
ON CONFLICT (employee_id, date, entry_type) DO NOTHING;

INSERT INTO schedule_entries (
  id,
  employee_id,
  date,
  entry_type,
  hours,
  notes,
  created_by_id,
  is_supervisor_override,
  supervisor_assignment_id,
  created_at,
  updated_at
)
SELECT
  MD5('saf-schedule-ot|' || p.id || '|' || a.date)::UUID,
  p.id,
  a.date,
  'overtime',
  a.hours,
  a.notes,
  c.owner_id,
  FALSE,
  a.id,
  a.created_at,
  a.created_at
FROM _saf_people p
CROSS JOIN _saf_context c
JOIN schedule_assignments a
  ON a.supervisor_id = c.owner_id
 AND a.id IN (
   'a4000000-0000-4000-8000-000000000001',
   'a4000000-0000-4000-8000-000000000002',
   'a4000000-0000-4000-8000-000000000003'
 )
WHERE p.department IN ('ผลิต', 'คลังสินค้าและโลจิสติกส์')
  AND (p.idx + EXTRACT(DAY FROM a.date)::INTEGER) % 2 = 0
ON CONFLICT (employee_id, date, entry_type) DO NOTHING;

INSERT INTO schedule_changes (
  id, employee_id, date, entry_type, previous_hours, new_hours,
  changed_by_id, notified_at, created_at
)
SELECT 'a4100000-0000-4000-8000-000000000001'::UUID, p.id, c.anchor_date - 10, 'work', 8, 6, c.owner_id,
       (c.anchor_date - 12 + TIME '10:05') AT TIME ZONE 'Asia/Bangkok',
       (c.anchor_date - 12 + TIME '10:00') AT TIME ZONE 'Asia/Bangkok'
FROM _saf_people p CROSS JOIN _saf_context c WHERE p.idx = 5
UNION ALL
SELECT 'a4100000-0000-4000-8000-000000000002'::UUID, p.id, c.anchor_date - 6, 'overtime', NULL, 2, c.owner_id,
       (c.anchor_date - 8 + TIME '14:05') AT TIME ZONE 'Asia/Bangkok',
       (c.anchor_date - 8 + TIME '14:00') AT TIME ZONE 'Asia/Bangkok'
FROM _saf_people p CROSS JOIN _saf_context c WHERE p.idx = 14
UNION ALL
SELECT 'a4100000-0000-4000-8000-000000000003'::UUID, p.id, c.anchor_date - 3, 'work', 8, 4, c.owner_id,
       (c.anchor_date - 5 + TIME '09:05') AT TIME ZONE 'Asia/Bangkok',
       (c.anchor_date - 5 + TIME '09:00') AT TIME ZONE 'Asia/Bangkok'
FROM _saf_people p CROSS JOIN _saf_context c WHERE p.idx = 25
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Leave, overtime, and contact requests in approved/pending/rejected states.
-- Existing decisions are preserved on rerun.
-- -----------------------------------------------------------------------------
WITH request_rows (
  id, employee_idx, leave_type, start_offset, end_offset, days,
  status, reason, decision_reason, created_offset, decided_offset
) AS (VALUES
  ('a5000000-0000-4000-8000-000000000001'::UUID,  5, 'annual',    -72, -70,  3::NUMERIC, 'approved', 'พักผ่อนกับครอบครัว',       NULL,                         -90, -88),
  ('a5000000-0000-4000-8000-000000000002'::UUID, 10, 'sick',      -58, -58,  1::NUMERIC, 'approved', 'ไข้หวัด',                    NULL,                         -59, -58),
  ('a5000000-0000-4000-8000-000000000003'::UUID, 15, 'personal',  -46, -46,  1::NUMERIC, 'rejected', 'ติดต่อราชการ',               'เอกสารประกอบไม่ครบ',          -50, -48),
  ('a5000000-0000-4000-8000-000000000004'::UUID, 22, 'annual',     10,  11,  2::NUMERIC, 'pending',  'เดินทางต่างจังหวัด',           NULL,                          -2, NULL),
  ('a5000000-0000-4000-8000-000000000005'::UUID, 17, 'maternity', -40,  49, 90::NUMERIC, 'approved', 'ลาคลอดตามสิทธิ์',             NULL,                         -55, -53),
  ('a5000000-0000-4000-8000-000000000006'::UUID, 30, 'sick',        2,   2,  1::NUMERIC, 'pending',  'นัดตรวจสุขภาพ',               NULL,                          -1, NULL),
  ('a5000000-0000-4000-8000-000000000007'::UUID, 35, 'annual',    -22, -19,  4::NUMERIC, 'approved', 'พักร้อนประจำปี',               NULL,                         -35, -33),
  ('a5000000-0000-4000-8000-000000000008'::UUID,  7, 'personal',  -36, -36,  1::NUMERIC, 'approved', 'ธุระครอบครัว',                NULL,                         -40, -39),
  ('a5000000-0000-4000-8000-000000000009'::UUID, 25, 'sick',      -13, -12,  2::NUMERIC, 'rejected', 'พักฟื้น',                     'กรุณาแนบใบรับรองแพทย์',        -16, -15),
  ('a5000000-0000-4000-8000-000000000010'::UUID, 14, 'annual',     20,  24,  5::NUMERIC, 'pending',  'ท่องเที่ยวประจำปี',             NULL,                          -3, NULL),
  ('a5000000-0000-4000-8000-000000000011'::UUID, 33, 'personal',    5,   5,  1::NUMERIC, 'pending',  'ติดต่อธนาคาร',                 NULL,                           0, NULL),
  ('a5000000-0000-4000-8000-000000000012'::UUID, 28, 'sick',       -8,  -8,  1::NUMERIC, 'approved', 'ไมเกรน',                      NULL,                         -10,  -9)
)
INSERT INTO leave_requests (
  id, employee_id, leave_type, start_date, end_date, days, status,
  approver_id, supervisor_id, reason, decision_reason, decided_at,
  line_card_message_id, created_at
)
SELECT
  r.id,
  p.id,
  r.leave_type,
  c.anchor_date + r.start_offset,
  c.anchor_date + r.end_offset,
  r.days,
  r.status,
  CASE WHEN r.status = 'pending' THEN NULL ELSE c.owner_id END,
  c.owner_id,
  r.reason,
  r.decision_reason,
  CASE WHEN r.decided_offset IS NULL THEN NULL
       ELSE (c.anchor_date + r.decided_offset + TIME '10:00') AT TIME ZONE 'Asia/Bangkok' END,
  NULL,
  (c.anchor_date + r.created_offset + TIME '09:00') AT TIME ZONE 'Asia/Bangkok'
FROM request_rows r
JOIN _saf_people p ON p.idx = r.employee_idx
CROSS JOIN _saf_context c
ON CONFLICT (id) DO NOTHING;

WITH request_rows (
  id, employee_idx, date_offset, hours, status, reason,
  decision_reason, created_offset, decided_offset
) AS (VALUES
  ('a6000000-0000-4000-8000-000000000001'::UUID,  6, -66, 2.0::NUMERIC, 'approved', 'เร่งปิดยอดผลิต',             NULL,                   -68, -67),
  ('a6000000-0000-4000-8000-000000000002'::UUID,  9, -52, 3.0::NUMERIC, 'approved', 'เปลี่ยนล็อตวัตถุดิบกลางคืน',  NULL,                   -54, -53),
  ('a6000000-0000-4000-8000-000000000003'::UUID, 20, -44, 2.5::NUMERIC, 'approved', 'ซ่อมบำรุงเชิงป้องกัน',        NULL,                   -47, -46),
  ('a6000000-0000-4000-8000-000000000004'::UUID, 26, -31, 4.0::NUMERIC, 'rejected', 'ตรวจนับคลังสินค้า',           'มีทีมกะถัดไปรับผิดชอบแล้ว',     -34, -33),
  ('a6000000-0000-4000-8000-000000000005'::UUID, 11, -18, 2.0::NUMERIC, 'approved', 'คำสั่งซื้อเร่งด่วน',           NULL,                   -21, -20),
  ('a6000000-0000-4000-8000-000000000006'::UUID, 16,  -9, 1.5::NUMERIC, 'approved', 'ตรวจปล่อยสินค้า',             NULL,                   -12, -11),
  ('a6000000-0000-4000-8000-000000000007'::UUID, 23,   1, 3.0::NUMERIC, 'pending',  'ซ่อมสายพานหลังเลิกงาน',       NULL,                    -1, NULL),
  ('a6000000-0000-4000-8000-000000000008'::UUID, 27,   3, 2.0::NUMERIC, 'pending',  'จัดส่งนอกรอบ',                NULL,                     0, NULL),
  ('a6000000-0000-4000-8000-000000000009'::UUID,  8,   4, 2.0::NUMERIC, 'pending',  'เตรียมบรรจุภัณฑ์ล็อตใหม่',       NULL,                     0, NULL),
  ('a6000000-0000-4000-8000-000000000010'::UUID, 31, -15, 2.0::NUMERIC, 'rejected', 'ทดลองสูตรนอกเวลา',            'เลื่อนไปทำในเวลางานปกติ',       -18, -17),
  ('a6000000-0000-4000-8000-000000000011'::UUID, 34, -25, 2.5::NUMERIC, 'approved', 'ปรับแผนผลิตรายเดือน',          NULL,                   -27, -26),
  ('a6000000-0000-4000-8000-000000000012'::UUID, 18,  -5, 3.0::NUMERIC, 'approved', 'สุ่มตรวจสินค้ากะกลางคืน',      NULL,                    -7,  -6)
)
INSERT INTO overtime_requests (
  id, employee_id, date, hours, reason, status, supervisor_id,
  approver_id, decision_reason, decided_at, line_card_message_id, created_at
)
SELECT
  r.id,
  p.id,
  c.anchor_date + r.date_offset,
  r.hours,
  r.reason,
  r.status,
  c.owner_id,
  CASE WHEN r.status = 'pending' THEN NULL ELSE c.owner_id END,
  r.decision_reason,
  CASE WHEN r.decided_offset IS NULL THEN NULL
       ELSE (c.anchor_date + r.decided_offset + TIME '11:00') AT TIME ZONE 'Asia/Bangkok' END,
  NULL,
  (c.anchor_date + r.created_offset + TIME '16:30') AT TIME ZONE 'Asia/Bangkok'
FROM request_rows r
JOIN _saf_people p ON p.idx = r.employee_idx
CROSS JOIN _saf_context c
ON CONFLICT (id) DO NOTHING;

WITH request_rows (
  id, employee_idx, date_offset, time_start, time_end, status,
  reason, decision_reason, created_offset, decided_offset
) AS (VALUES
  ('a7000000-0000-4000-8000-000000000001'::UUID,  5, -48, '10:00', '10:30', 'approved', 'ทบทวนเป้าหมายไลน์ผลิต',       NULL,                 -52, -51),
  ('a7000000-0000-4000-8000-000000000002'::UUID, 14, -32, '13:00', '13:45', 'approved', 'รายงานผลตรวจคุณภาพ',          NULL,                 -35, -34),
  ('a7000000-0000-4000-8000-000000000003'::UUID, 21, -20, '09:30', '10:00', 'rejected', 'ขออนุมัติเครื่องมือใหม่',       'ให้นำเสนอผ่านหัวหน้าฝ่ายก่อน',  -24, -23),
  ('a7000000-0000-4000-8000-000000000004'::UUID, 28, -11, '15:00', '15:30', 'approved', 'สรุปปัญหาการขนส่ง',           NULL,                 -14, -13),
  ('a7000000-0000-4000-8000-000000000005'::UUID, 30,  -4, '11:00', '11:45', 'approved', 'นำเสนอผลิตภัณฑ์ต้นแบบ',         NULL,                  -7,  -6),
  ('a7000000-0000-4000-8000-000000000006'::UUID, 33,   2, '14:00', '14:30', 'pending',  'ขออนุมัติผู้ขายรายใหม่',         NULL,                   0, NULL),
  ('a7000000-0000-4000-8000-000000000007'::UUID, 35,   3, '10:30', '11:00', 'pending',  'หารือข้อเสนอลูกค้าองค์กร',        NULL,                   0, NULL),
  ('a7000000-0000-4000-8000-000000000008'::UUID, 16,   5, '13:30', '14:00', 'pending',  'ขอปรับรอบตรวจสินค้า',             NULL,                   0, NULL),
  ('a7000000-0000-4000-8000-000000000009'::UUID, 36, -60, '09:00', '09:45', 'approved', 'รายงานการตรวจความปลอดภัย',      NULL,                 -64, -63)
)
INSERT INTO contact_requests (
  id, employee_id, supervisor_id, approver_id, requested_date,
  time_start, time_end, reason, status, decision_reason, decided_at,
  line_card_message_id, created_at
)
SELECT
  r.id,
  p.id,
  c.owner_id,
  CASE WHEN r.status = 'pending' THEN NULL ELSE c.owner_id END,
  c.anchor_date + r.date_offset,
  r.time_start::TIME,
  r.time_end::TIME,
  r.reason,
  r.status,
  r.decision_reason,
  CASE WHEN r.decided_offset IS NULL THEN NULL
       ELSE (c.anchor_date + r.decided_offset + TIME '09:30') AT TIME ZONE 'Asia/Bangkok' END,
  NULL,
  (c.anchor_date + r.created_offset + TIME '08:30') AT TIME ZONE 'Asia/Bangkok'
FROM request_rows r
JOIN _saf_people p ON p.idx = r.employee_idx
CROSS JOIN _saf_context c
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Seven payroll periods (Jan-Jul 2026), including the real owner.
--
-- SSO demo basis (Section 33, 2026 phase used by v3 config):
--   min(max(base pay, 1,650), 17,500) x 5%, capped at 875/month.
--
-- PIT demo method:
--   Annualize current monthly gross, deduct employment expense at 50% capped
--   at 100,000/year, employee SSO, and the employee tax_profile allowances;
--   apply progressive bands; divide annual tax by 12 for monthly withholding.
-- Every applied number and bracket is frozen in calculation_details.
-- -----------------------------------------------------------------------------
WITH month_offsets AS (
  SELECT
    c.*,
    month_offset,
    (DATE_TRUNC('month', c.anchor_date)::DATE - MAKE_INTERVAL(months => month_offset))::DATE AS month_start
  FROM _saf_context c
  CROSS JOIN GENERATE_SERIES(0, 6) AS month_offset
),
workers AS (
  SELECT e.id, e.employee_code, e.base_salary, e.tax_profile, p.idx
  FROM employees e
  JOIN _saf_people p ON p.id = e.id

  UNION ALL

  SELECT e.id, COALESCE(e.employee_code, 'OWNER'), COALESCE(e.base_salary, 95000), e.tax_profile, 0
  FROM employees e
  JOIN _saf_context c ON c.owner_id = e.id
),
components AS (
  SELECT
    w.*,
    m.org_id,
    m.owner_id,
    m.anchor_date,
    m.month_offset,
    m.month_start,
    ROUND(w.base_salary, 2) AS base_pay,
    CASE WHEN w.idx = 0 THEN 0 ELSE 6 + ((w.idx * 3 + m.month_offset * 5) % 15) END::NUMERIC AS ot_hours,
    CASE WHEN w.idx = 0 THEN 5000 ELSE 1200 + ((w.idx + m.month_offset) % 4) * 400 END::NUMERIC AS allowance_pay,
    CASE
      WHEN EXTRACT(MONTH FROM m.month_start) = 4 THEN ROUND(w.base_salary * 0.08, 2)
      WHEN EXTRACT(MONTH FROM m.month_start) = 7 AND w.idx % 5 = 0 THEN ROUND(w.base_salary * 0.03, 2)
      ELSE 0
    END AS bonus_pay,
    CASE WHEN EXTRACT(MONTH FROM m.month_start) = 6 AND w.idx % 6 = 0 THEN 1500 ELSE 0 END::NUMERIC AS other_income,
    CASE WHEN w.idx > 0 AND w.idx % 7 = 0 THEN 500 ELSE 0 END::NUMERIC AS other_deductions
  FROM workers w
  CROSS JOIN month_offsets m
),
income AS (
  SELECT
    c.*,
    ROUND((c.base_pay / 240.0) * 1.5 * c.ot_hours, 2) AS ot_pay
  FROM components c
),
grossed AS (
  SELECT
    i.*,
    ROUND(i.base_pay + i.ot_pay + i.allowance_pay + i.bonus_pay + i.other_income, 2) AS gross_pay,
    ROUND(LEAST(GREATEST(i.base_pay, 1650), 17500) * 0.05, 2) AS employee_sso
  FROM income i
),
annualized AS (
  SELECT
    g.*,
    ROUND(g.gross_pay * 12, 2) AS annual_gross,
    ROUND(LEAST(g.gross_pay * 12 * 0.50, 100000), 2) AS employment_expense,
    ROUND(g.employee_sso * 12, 2) AS annual_sso,
    COALESCE((g.tax_profile ->> 'personal_allowance')::NUMERIC, 60000) AS personal_allowance,
    COALESCE((g.tax_profile ->> 'spouse_allowance')::NUMERIC, 0) AS spouse_allowance,
    COALESCE((g.tax_profile ->> 'child_allowance')::NUMERIC, 0) AS child_allowance,
    COALESCE((g.tax_profile ->> 'parent_allowance')::NUMERIC, 0) AS parent_allowance,
    COALESCE((g.tax_profile ->> 'insurance_deduction')::NUMERIC, 0) AS insurance_deduction,
    COALESCE((g.tax_profile ->> 'provident_fund_deduction')::NUMERIC, 0) AS provident_fund_deduction,
    COALESCE((g.tax_profile ->> 'other_deductions')::NUMERIC, 0) AS annual_other_deductions
  FROM grossed g
),
taxable AS (
  SELECT
    a.*,
    ROUND(GREATEST(
      a.annual_gross
      - a.employment_expense
      - a.annual_sso
      - a.personal_allowance
      - a.spouse_allowance
      - a.child_allowance
      - a.parent_allowance
      - a.insurance_deduction
      - a.provident_fund_deduction
      - a.annual_other_deductions,
      0
    ), 2) AS annualized_taxable_income
  FROM annualized a
),
taxed AS (
  SELECT
    t.*,
    ROUND(
      GREATEST(LEAST(t.annualized_taxable_income,  300000) -  150000, 0) * 0.05
      + GREATEST(LEAST(t.annualized_taxable_income,  500000) -  300000, 0) * 0.10
      + GREATEST(LEAST(t.annualized_taxable_income,  750000) -  500000, 0) * 0.15
      + GREATEST(LEAST(t.annualized_taxable_income, 1000000) -  750000, 0) * 0.20
      + GREATEST(LEAST(t.annualized_taxable_income, 2000000) - 1000000, 0) * 0.25
      + GREATEST(LEAST(t.annualized_taxable_income, 5000000) - 2000000, 0) * 0.30
      + GREATEST(t.annualized_taxable_income - 5000000, 0) * 0.35,
      2
    ) AS annual_tax
  FROM taxable t
)
INSERT INTO payrolls (
  id,
  employee_id,
  month_year,
  base_pay,
  ot_pay,
  ssf_deduction,
  tax_deduction,
  allowance_pay,
  bonus_pay,
  other_income,
  other_deductions,
  gross_pay,
  employer_sso_contribution,
  taxable_income,
  annualized_taxable_income,
  annual_tax,
  tax_method,
  calculation_version,
  calculation_details,
  calculation_status,
  reviewed_by_id,
  reviewed_at,
  override_reason,
  calculated_at,
  net_pay,
  payslip_pdf_url,
  created_at
)
SELECT
  MD5('saf-payroll|' || t.id || '|' || TO_CHAR(t.month_start, 'YYYY-MM'))::UUID,
  t.id,
  TO_CHAR(t.month_start, 'YYYY-MM'),
  t.base_pay,
  t.ot_pay,
  t.employee_sso,
  ROUND(t.annual_tax / 12.0, 2),
  t.allowance_pay,
  t.bonus_pay,
  t.other_income,
  t.other_deductions,
  t.gross_pay,
  t.employee_sso,
  ROUND(t.annualized_taxable_income / 12.0, 2),
  t.annualized_taxable_income,
  t.annual_tax,
  'thai_pit_annualized',
  'TH-2026.1-DEMO',
  JSONB_BUILD_OBJECT(
    'demo_seed', TRUE,
    'currency', 'THB',
    'period', TO_CHAR(t.month_start, 'YYYY-MM'),
    'income', JSONB_BUILD_OBJECT(
      'base_pay', t.base_pay,
      'ot_hours', t.ot_hours,
      'ot_rate_multiplier', 1.5,
      'ot_pay', t.ot_pay,
      'allowance_pay', t.allowance_pay,
      'bonus_pay', t.bonus_pay,
      'other_income', t.other_income,
      'gross_pay', t.gross_pay
    ),
    'social_security', JSONB_BUILD_OBJECT(
      'scheme', 'Thailand Section 33 demo configuration',
      'rate_pct', 5,
      'wage_floor', 1650,
      'wage_ceiling', 17500,
      'max_contribution', 875,
      'employee_contribution', t.employee_sso,
      'employer_contribution', t.employee_sso,
      'formula', 'min(max(base_pay, 1650), 17500) x 5%'
    ),
    'personal_income_tax', JSONB_BUILD_OBJECT(
      'method', 'annualized monthly withholding estimate',
      'annual_gross', t.annual_gross,
      'employment_expense', t.employment_expense,
      'employment_expense_rule', '50% of annualized employment income, capped at 100000',
      'annual_employee_sso', t.annual_sso,
      'allowances', JSONB_BUILD_OBJECT(
        'personal', t.personal_allowance,
        'spouse', t.spouse_allowance,
        'child', t.child_allowance,
        'parent', t.parent_allowance,
        'insurance', t.insurance_deduction,
        'provident_fund', t.provident_fund_deduction,
        'other', t.annual_other_deductions
      ),
      'annualized_taxable_income', t.annualized_taxable_income,
      'annual_tax', t.annual_tax,
      'monthly_withholding', ROUND(t.annual_tax / 12.0, 2),
      'brackets', JSONB_BUILD_ARRAY(
        JSONB_BUILD_OBJECT('from', 0,       'to', 150000,  'rate_pct', 0),
        JSONB_BUILD_OBJECT('from', 150000,  'to', 300000,  'rate_pct', 5),
        JSONB_BUILD_OBJECT('from', 300000,  'to', 500000,  'rate_pct', 10),
        JSONB_BUILD_OBJECT('from', 500000,  'to', 750000,  'rate_pct', 15),
        JSONB_BUILD_OBJECT('from', 750000,  'to', 1000000, 'rate_pct', 20),
        JSONB_BUILD_OBJECT('from', 1000000, 'to', 2000000, 'rate_pct', 25),
        JSONB_BUILD_OBJECT('from', 2000000, 'to', 5000000, 'rate_pct', 30),
        JSONB_BUILD_OBJECT('from', 5000000, 'to', NULL,    'rate_pct', 35)
      )
    ),
    'other_deductions', t.other_deductions,
    'disclaimer', 'Synthetic demo calculation. Production payroll requires accountant review and current legal configuration.'
  ),
  CASE WHEN t.month_offset = 0 THEN 'estimate' ELSE 'reviewed' END,
  CASE WHEN t.month_offset = 0 THEN NULL ELSE t.owner_id END,
  CASE WHEN t.month_offset = 0 THEN NULL
       ELSE ((t.month_start + INTERVAL '1 month + 1 day')::DATE + TIME '10:00') AT TIME ZONE 'Asia/Bangkok' END,
  NULL,
  ((t.month_start + INTERVAL '1 month - 1 day')::DATE + TIME '18:00') AT TIME ZONE 'Asia/Bangkok',
  ROUND(
    t.gross_pay
    - t.employee_sso
    - ROUND(t.annual_tax / 12.0, 2)
    - t.other_deductions,
    2
  ),
  NULL,
  ((t.month_start + INTERVAL '1 month - 1 day')::DATE + TIME '18:00') AT TIME ZONE 'Asia/Bangkok'
FROM taxed t
ON CONFLICT (employee_id, month_year) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Two performance-review cycles for every mock employee.
-- -----------------------------------------------------------------------------
WITH review_cycles (cycle_no, review_offset) AS (
  VALUES (1, -180), (2, -30)
)
INSERT INTO performance_reviews (id, employee_id, review_date, kpi_score, notes)
SELECT
  MD5('saf-performance|' || p.id || '|' || cycle.cycle_no)::UUID,
  p.id,
  c.anchor_date + cycle.review_offset,
  78 + ((p.idx * 3 + cycle.cycle_no * 5) % 19),
  CASE cycle.cycle_no
    WHEN 1 THEN 'รอบประเมินต้นปี: รักษามาตรฐานงานและพัฒนาทักษะตามแผน'
    ELSE 'รอบประเมินกลางปี: ผลงานดีขึ้นจากการลดข้อผิดพลาดและทำงานร่วมกับทีม'
  END
FROM _saf_people p
CROSS JOIN review_cycles cycle
CROSS JOIN _saf_context c
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Notifications: owner action queue plus employee-facing historical messages.
-- -----------------------------------------------------------------------------
WITH notification_rows (
  id, recipient_idx, type, message, is_read, created_offset, created_hour
) AS (VALUES
  ('a8000000-0000-4000-8000-000000000001'::UUID, 0,  'approval_pending',   'มีคำขอลา 3 รายการรอการอนุมัติ',                         FALSE,  0,  8),
  ('a8000000-0000-4000-8000-000000000002'::UUID, 0,  'overtime_pending',  'มีคำขอ OT 3 รายการรอการอนุมัติ',                        FALSE,  0,  9),
  ('a8000000-0000-4000-8000-000000000003'::UUID, 0,  'contact_pending',   'มีคำขอเข้าพบ 3 รายการในสัปดาห์นี้',                       FALSE,  0, 10),
  ('a8000000-0000-4000-8000-000000000004'::UUID, 0,  'attendance_insight','อัตราเข้างานตรงเวลา 30 วันล่าสุดอยู่ในระดับดี',                 TRUE,  -1, 16),
  ('a8000000-0000-4000-8000-000000000005'::UUID, 0,  'payroll_ready',     'เงินเดือนเดือนมิถุนายนผ่านการตรวจทานแล้ว',                  TRUE, -10, 14),
  ('a8000000-0000-4000-8000-000000000006'::UUID, 5,  'leave_approved',    'คำขอลาพักผ่อนของคุณได้รับการอนุมัติแล้ว',                    TRUE, -88, 10),
  ('a8000000-0000-4000-8000-000000000007'::UUID, 10, 'leave_approved',    'คำขอลาป่วยของคุณได้รับการอนุมัติแล้ว',                       TRUE, -58, 11),
  ('a8000000-0000-4000-8000-000000000008'::UUID, 20, 'overtime_approved', 'คำขอ OT งานซ่อมบำรุงได้รับการอนุมัติแล้ว',                   TRUE, -46, 12),
  ('a8000000-0000-4000-8000-000000000009'::UUID, 25, 'schedule_changed',  'หัวหน้างานปรับตารางของคุณและส่งรายละเอียดแล้ว',                TRUE,  -5,  9),
  ('a8000000-0000-4000-8000-000000000010'::UUID, 30, 'contact_approved',  'คำขอนำเสนอผลิตภัณฑ์ต้นแบบได้รับการอนุมัติแล้ว',                 TRUE,  -6, 10),
  ('a8000000-0000-4000-8000-000000000011'::UUID, 22, 'leave_pending',     'คำขอลาของคุณถูกส่งให้หัวหน้างานตรวจสอบแล้ว',                   FALSE, -2, 15),
  ('a8000000-0000-4000-8000-000000000012'::UUID, 27, 'overtime_pending',  'คำขอ OT ของคุณอยู่ระหว่างการพิจารณา',                         FALSE,  0, 11),
  ('a8000000-0000-4000-8000-000000000013'::UUID, 14, 'payslip_ready',     'สลิปเงินเดือนเดือนมิถุนายนพร้อมให้ตรวจสอบ',                    TRUE, -10, 18),
  ('a8000000-0000-4000-8000-000000000014'::UUID, 35, 'performance_review','บันทึกผลประเมินกลางปีในโปรไฟล์เรียบร้อยแล้ว',                    TRUE, -30, 14)
)
INSERT INTO notifications (
  id, employee_id, line_message_id, type, message, read, created_at
)
SELECT
  n.id,
  CASE WHEN n.recipient_idx = 0 THEN c.owner_id ELSE p.id END,
  NULL,
  n.type,
  n.message,
  n.is_read,
  (c.anchor_date + n.created_offset + MAKE_TIME(n.created_hour, 0, 0)) AT TIME ZONE 'Asia/Bangkok'
FROM notification_rows n
CROSS JOIN _saf_context c
LEFT JOIN _saf_people p ON p.idx = n.recipient_idx
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- POSTFLIGHT VERIFICATION
-- Expected headline values:
--   mock_employees=36, departments>=10, payroll_periods=7,
--   attendance_span_days>=119, unpaired_attendance_days=0.
-- =============================================================================
WITH target_org AS (
  SELECT o.id, o.owner_employee_id
  FROM organizations o
  WHERE COALESCE(NULLIF(o.business_name, ''), o.name) =
        'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด'
  ORDER BY o.created_at
  LIMIT 1
),
mock_employees AS (
  SELECT e.*
  FROM employees e
  JOIN target_org o ON o.id = e.org_id
  WHERE COALESCE((e.metadata ->> 'demo_seed')::BOOLEAN, FALSE) = TRUE
),
mock_ids AS (
  SELECT id FROM mock_employees
),
attendance_summary AS (
  SELECT
    COUNT(*) AS attendance_events,
    MIN(a.timestamp)::DATE AS attendance_from,
    MAX(a.timestamp)::DATE AS attendance_to,
    (MAX(a.timestamp)::DATE - MIN(a.timestamp)::DATE) AS attendance_span_days,
    COUNT(*) FILTER (WHERE a.geofence_result = 'outside') AS outside_events,
    COUNT(*) FILTER (WHERE a.geofence_result = 'missing_location') AS missing_location_events
  FROM attendance_logs a
  WHERE a.employee_id IN (SELECT id FROM mock_ids)
),
unpaired AS (
  SELECT COUNT(*) AS unpaired_attendance_days
  FROM (
    SELECT
      employee_id,
      (timestamp AT TIME ZONE 'Asia/Bangkok')::DATE
        - CASE
            -- Evening Shift checks out after midnight; attribute that OUT to
            -- the shift date on which its matching IN occurred.
            WHEN type = 'out'
             AND (timestamp AT TIME ZONE 'Asia/Bangkok')::TIME < TIME '05:00'
              THEN 1
            ELSE 0
          END AS shift_date
    FROM attendance_logs
    WHERE employee_id IN (SELECT id FROM mock_ids)
    GROUP BY
      employee_id,
      (timestamp AT TIME ZONE 'Asia/Bangkok')::DATE
        - CASE
            WHEN type = 'out'
             AND (timestamp AT TIME ZONE 'Asia/Bangkok')::TIME < TIME '05:00'
              THEN 1
            ELSE 0
          END
    HAVING COUNT(*) FILTER (WHERE type = 'in') <> COUNT(*) FILTER (WHERE type = 'out')
  ) q
)
SELECT
  (SELECT COUNT(*) FROM mock_employees) AS mock_employees,
  (SELECT COUNT(DISTINCT department) FROM mock_employees) AS departments,
  (SELECT COUNT(*) FROM shifts s JOIN target_org o ON o.id = s.org_id) AS org_shifts,
  a.attendance_events,
  a.attendance_from,
  a.attendance_to,
  a.attendance_span_days,
  a.outside_events,
  a.missing_location_events,
  u.unpaired_attendance_days,
  (SELECT COUNT(*) FROM leave_requests WHERE employee_id IN (SELECT id FROM mock_ids)) AS leave_requests,
  (SELECT COUNT(*) FROM overtime_requests WHERE employee_id IN (SELECT id FROM mock_ids)) AS overtime_requests,
  (SELECT COUNT(*) FROM contact_requests WHERE employee_id IN (SELECT id FROM mock_ids)) AS contact_requests,
  (SELECT COUNT(DISTINCT month_year) FROM payrolls WHERE employee_id IN (SELECT id FROM mock_ids)) AS payroll_periods,
  (SELECT COUNT(*) FROM performance_reviews WHERE employee_id IN (SELECT id FROM mock_ids)) AS performance_reviews
FROM attendance_summary a
CROSS JOIN unpaired u;

-- Owner/team verification. The full LINE user ID is deliberately not printed.
SELECT
  owner.employee_code AS owner_employee_code,
  owner.account_status,
  owner.is_supervisor,
  CASE WHEN owner.line_user_id IS NULL THEN 'missing' ELSE LEFT(owner.line_user_id, 6) || '...' END AS line_binding,
  CARDINALITY(COALESCE(owner.subordinate_ids, '{}'::UUID[])) AS owner_team_size,
  o.geofence_enabled,
  o.geofence_radius,
  o.tier,
  o.seat_limit
FROM organizations o
JOIN employees owner ON owner.id = o.owner_employee_id
WHERE COALESCE(NULLIF(o.business_name, ''), o.name) =
      'บริษัท สยามออโรร่า ฟู้ดส์ จำกัด';
