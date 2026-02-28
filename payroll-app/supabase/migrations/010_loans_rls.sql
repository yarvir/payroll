-- ── Row Level Security for loans ──────────────────────────────────────────────
--
-- The loans tables were created in 008_loans.sql without RLS.
-- Server actions use the admin (service-role) client which bypasses RLS,
-- so these policies provide defence-in-depth for direct API access.

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Owner and HR: full access to all loans
CREATE POLICY "owners_hr_all_loans"
  ON loans FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'hr')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'hr')
  );

-- Accountant: read-only access to all loans
CREATE POLICY "accountant_read_loans"
  ON loans FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'accountant'
  );

-- Employee: read-only access to their own loans
CREATE POLICY "employee_read_own_loans"
  ON loans FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- ── Row Level Security for loan_installments ──────────────────────────────────

ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;

-- Owner and HR: full access to all installments
CREATE POLICY "owners_hr_all_loan_installments"
  ON loan_installments FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'hr')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'hr')
  );

-- Accountant: read-only access to all installments
CREATE POLICY "accountant_read_loan_installments"
  ON loan_installments FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'accountant'
  );

-- Employee: read-only access to installments for their own loans
CREATE POLICY "employee_read_own_loan_installments"
  ON loan_installments FOR SELECT TO authenticated
  USING (
    loan_id IN (
      SELECT l.id
      FROM loans l
      JOIN employees e ON l.employee_id = e.id
      WHERE e.profile_id = auth.uid()
    )
  );
