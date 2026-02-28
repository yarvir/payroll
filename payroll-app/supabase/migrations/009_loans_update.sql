-- ── Add deduction_method and contract fields to loans ─────────────────────────
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS deduction_method   TEXT NOT NULL DEFAULT 'salary'
    CHECK (deduction_method IN ('salary', 'bonus', 'flexible')),
  ADD COLUMN IF NOT EXISTS contract_url       TEXT NULL,
  ADD COLUMN IF NOT EXISTS contract_file_path TEXT NULL;

-- ── Add payment_source to loan_installments ───────────────────────────────────
ALTER TABLE loan_installments
  ADD COLUMN IF NOT EXISTS payment_source TEXT NULL
    CHECK (payment_source IN ('salary', 'kpi_bonus', 'end_of_contract_bonus', 'manual'));

-- ── Storage bucket for loan contract PDFs ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-contracts', 'loan-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- HR and owners can upload
CREATE POLICY "loan_contracts_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'loan-contracts'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'hr')
  );

-- Owner, HR, and accountant can read
CREATE POLICY "loan_contracts_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'loan-contracts'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'hr', 'accountant')
  );

-- Owner and HR can delete/replace
CREATE POLICY "loan_contracts_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'loan-contracts'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'hr')
  );
