-- ── Loans ─────────────────────────────────────────────────────────────────────
CREATE TABLE loans (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id            UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  total_amount           NUMERIC(12,2) NOT NULL,
  currency               TEXT        NOT NULL DEFAULT 'USD',
  number_of_installments INT         NOT NULL,
  monthly_deduction      NUMERIC(12,2) NOT NULL,
  start_date             DATE        NOT NULL,
  status                 TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'paid', 'cancelled')),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_employee_id ON loans(employee_id);
CREATE INDEX idx_loans_status ON loans(status);

-- ── Loan Installments ─────────────────────────────────────────────────────────
CREATE TABLE loan_installments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id             UUID        NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_number  INT         NOT NULL,
  due_date            DATE        NOT NULL,
  amount              NUMERIC(12,2) NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid')),
  payroll_run_id      UUID        NULL,
  paid_at             TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_installments_loan_id ON loan_installments(loan_id);
