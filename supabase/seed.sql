-- LinForge HR — Seed / Mock Data
-- Run after schema.sql. Safe to re-run after TRUNCATE.

-- Organization
INSERT INTO organizations (id, name, thai_tax_id, geofence_lat, geofence_lng, geofence_radius)
VALUES ('11111111-1111-1111-1111-111111111111', 'ThaiAuto Factory', '1234567890123', 13.740198598326677, 100.56227944249513, 150)
ON CONFLICT (id) DO NOTHING;

-- Shifts
INSERT INTO shifts (id, org_id, name, start_time, end_time, break_minutes) VALUES
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Morning Shift', '08:00:00', '17:00:00', 60),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Evening Shift', '16:00:00', '01:00:00', 60),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Night Shift', '00:00:00', '08:00:00', 60)
ON CONFLICT (id) DO NOTHING;

-- 10 Employees
INSERT INTO employees (id, org_id, line_user_id, employee_code, name_th, name_en, name_zh, role, department, position, base_salary, bank_account, sso_number) VALUES
('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'U1234567890abcdef1234567890abcdef', 'EMP001', 'สมชาย ใจดี', 'Somchai Jaidee', '宋猜·哉迪', 'employee', 'Production', 'Operator', 15000, '123-4-56789-0', 'SSO-001'),
('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'U2345678901abcdef2345678901abcdef', 'EMP002', 'สมหญิง รักงาน', 'Somying Rakngan', '宋盈·拉甘', 'supervisor', 'Production', 'Line Leader', 25000, '123-4-56789-1', 'SSO-002'),
('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'U3456789012abcdef3456789012abcdef', 'EMP003', 'วิชัย เก่งกล้า', 'Wichai Kengkla', '维猜·肯卡拉', 'employee', 'Production', 'Operator', 15000, '123-4-56789-2', 'SSO-003'),
('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', NULL, 'EMP004', 'นันทนา สุขใจ', 'Nantana Sukjai', '南塔娜·苏哉', 'hr', 'HR', 'HR Manager', 35000, '123-4-56789-3', 'SSO-004'),
('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', 'U4567890123abcdef4567890123abcdef', 'EMP005', 'กฤษณ์ ฉลาด', 'Krit Chalat', '克里·查拉', 'employee', 'Maintenance', 'Technician', 18000, '123-4-56789-4', 'SSO-005'),
('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111111', 'U5678901234abcdef5678901234abcdef', 'EMP006', 'อรทัย สดใส', 'Orathai Sodsai', '奥拉泰·索赛', 'supervisor', 'Production', 'Supervisor', 28000, '123-4-56789-5', 'SSO-006'),
('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111111', NULL, 'EMP007', 'ธนพล แข็งแรง', 'Thanapol Khaengraeng', '塔那蓬·肯让', 'employee', 'Production', 'Operator', 15000, '123-4-56789-6', 'SSO-007'),
('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111111', 'U6789012345abcdef6789012345abcdef', 'EMP008', 'ปริยา ฉลาด', 'Pariya Chalat', '帕莉雅·查拉', 'executive', 'Management', 'Factory Owner', 80000, '123-4-56789-7', 'SSO-008'),
('33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111111', 'U7890123456abcdef7890123456abcdef', 'EMP009', 'เอกชัย มั่นคง', 'Ekachai Mankong', '艾卡猜·曼孔', 'employee', 'Warehouse', 'Staff', 14000, '123-4-56789-8', 'SSO-009'),
('33333333-3333-3333-3333-333333333310', '11111111-1111-1111-1111-111111111111', NULL, 'EMP010', 'ลลิตา เก่ง', 'Lalita Keng', '拉莉塔·肯', 'employee', 'Production', 'Operator', 15000, '123-4-56789-9', 'SSO-010')
ON CONFLICT (id) DO NOTHING;

-- Employee shifts (last 14 days, morning shift default)
INSERT INTO employee_shifts (employee_id, date, shift_id)
SELECT e.id, CURRENT_DATE - i, '22222222-2222-2222-2222-222222222201'
FROM employees e, generate_series(0, 13) i
WHERE e.employee_code LIKE 'EMP%';

-- Attendance logs (last 30 days, mix of statuses)
INSERT INTO attendance_logs (employee_id, timestamp, type, latitude, longitude, status)
SELECT
  e.id,
  CURRENT_TIMESTAMP - (i * INTERVAL '1 day') - (RANDOM() * INTERVAL '8 hours'),
  CASE WHEN RANDOM() > 0.5 THEN 'in' ELSE 'out' END,
  13.740198598326677 + (RANDOM() * 0.001),
  100.56227944249513 + (RANDOM() * 0.001),
  CASE WHEN RANDOM() > 0.85 THEN 'late' ELSE 'ontime' END
FROM employees e, generate_series(1, 30) i
WHERE e.role IN ('employee','supervisor');

-- Leave & OT
INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, status, reason) VALUES
('33333333-3333-3333-3333-333333333301', 'annual', CURRENT_DATE + 5, CURRENT_DATE + 7, 3, 'approved', 'ไปต่างจังหวัด'),
('33333333-3333-3333-3333-333333333303', 'sick', CURRENT_DATE - 3, CURRENT_DATE - 3, 1, 'approved', 'Fever'),
('33333333-3333-3333-3333-333333333305', 'personal', CURRENT_DATE + 10, CURRENT_DATE + 10, 1, 'pending', 'Family event'),
('33333333-3333-3333-3333-333333333307', 'annual', CURRENT_DATE + 14, CURRENT_DATE + 16, 3, 'pending', 'Vacation');

INSERT INTO overtime_requests (employee_id, date, hours, reason, status) VALUES
('33333333-3333-3333-3333-333333333303', CURRENT_DATE - 2, 3, 'Production rush order', 'approved'),
('33333333-3333-3333-3333-333333333301', CURRENT_DATE - 1, 2, 'Extra delivery batch', 'approved'),
('33333333-3333-3333-3333-333333333305', CURRENT_DATE, 4, 'Equipment maintenance', 'pending'),
('33333333-3333-3333-3333-333333333309', CURRENT_DATE - 5, 2.5, 'Inventory count', 'approved');

-- Payroll for current and previous month
INSERT INTO payrolls (employee_id, month_year, base_pay, ot_pay, ssf_deduction, tax_deduction, net_pay)
SELECT id, '2026-04', base_salary, 4500, 750, 1200, base_salary + 4500 - 750 - 1200
FROM employees WHERE role IN ('employee','supervisor');

INSERT INTO payrolls (employee_id, month_year, base_pay, ot_pay, ssf_deduction, tax_deduction, net_pay)
SELECT id, '2026-05', base_salary, 3200, 750, 1100, base_salary + 3200 - 750 - 1100
FROM employees WHERE role IN ('employee','supervisor');

-- Performance reviews
INSERT INTO performance_reviews (employee_id, review_date, kpi_score, notes) VALUES
('33333333-3333-3333-3333-333333333301', CURRENT_DATE - 30, 92, 'Excellent performance on production line'),
('33333333-3333-3333-3333-333333333302', CURRENT_DATE - 28, 95, 'Strong leadership and team coordination'),
('33333333-3333-3333-3333-333333333303', CURRENT_DATE - 25, 88, 'Reliable, improving on quality metrics'),
('33333333-3333-3333-3333-333333333305', CURRENT_DATE - 60, 90, 'Solid technical work, mentors junior staff');
