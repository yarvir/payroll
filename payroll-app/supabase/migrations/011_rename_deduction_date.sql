-- Rename due_date to deduction_date in loan_installments.
-- "Deduction Date" is the payroll payment day on which the installment is
-- deducted, not a generic due date, so the new name is more accurate.

ALTER TABLE loan_installments
  RENAME COLUMN due_date TO deduction_date;
