'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, Loan, LoanInstallment } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoanWithInstallments = Loan & {
  loan_installments: LoanInstallment[]
}

export type LoanWithEmployee = Loan & {
  loan_installments: LoanInstallment[]
  employees: {
    id: string
    full_name: string
    group_id: string | null
    employee_groups: { name: string } | null
  } | null
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('*').eq('id', user.id).single()
  return data as Profile | null
}

/** Returns the admin client if the current user is owner or hr, null otherwise. */
async function requireLoanManage() {
  const profile = await getCurrentProfile()
  if (!profile) return null
  if (!['owner', 'hr'].includes(profile.role)) return null
  return createAdminClient()
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getEmployeeLoans(employeeId: string): Promise<LoanWithInstallments[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('loans')
    .select('*, loan_installments(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) throw error
  type RawLoan = Loan & { loan_installments: LoanInstallment[] }
  const rows = (data ?? []) as unknown as RawLoan[]
  return rows.map(r => ({
    ...r,
    loan_installments: [...r.loan_installments].sort(
      (a, b) => a.installment_number - b.installment_number
    ),
  }))
}

export async function getAllLoans(): Promise<LoanWithEmployee[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('loans')
    .select('*, loan_installments(*), employees(id, full_name, group_id, employee_groups(name))')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as LoanWithEmployee[]
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createLoan(formData: FormData): Promise<{ error?: string }> {
  const admin = await requireLoanManage()
  if (!admin) return { error: 'You do not have permission to create loans.' }

  const employee_id = (formData.get('employee_id') as string | null)?.trim()
  const total_amount_raw = formData.get('total_amount') as string | null
  const currency = (formData.get('currency') as string | null)?.trim()
  const installments_raw = formData.get('number_of_installments') as string | null
  const start_date = (formData.get('start_date') as string | null)?.trim()
  const notes = (formData.get('notes') as string | null)?.trim() || null
  const already_paid = parseInt((formData.get('already_paid') as string) || '0', 10)

  if (!employee_id || !total_amount_raw || !currency || !installments_raw || !start_date) {
    return { error: 'All required fields must be filled in.' }
  }

  const total_amount = parseFloat(total_amount_raw)
  const number_of_installments = parseInt(installments_raw, 10)

  if (isNaN(total_amount) || total_amount <= 0) return { error: 'Total amount must be a positive number.' }
  if (isNaN(number_of_installments) || number_of_installments < 1) return { error: 'Number of installments must be at least 1.' }
  if (isNaN(already_paid) || already_paid < 0) return { error: 'Installments already paid cannot be negative.' }
  if (already_paid > number_of_installments) return { error: 'Installments already paid cannot exceed total installments.' }

  const monthly_deduction = parseFloat((total_amount / number_of_installments).toFixed(2))

  // Create the loan record
  const { data: loan, error: loanError } = await admin
    .from('loans')
    .insert({
      employee_id,
      total_amount,
      currency,
      number_of_installments,
      monthly_deduction,
      start_date,
      status: 'active',
      notes,
    })
    .select('id')
    .single()

  if (loanError) return { error: loanError.message }

  // Generate all installment rows
  const startDateObj = new Date(start_date + 'T00:00:00')
  const installments = Array.from({ length: number_of_installments }, (_, i) => {
    const dueDate = new Date(startDateObj)
    dueDate.setMonth(dueDate.getMonth() + i)
    const isPaid = i < already_paid
    return {
      loan_id: loan.id,
      installment_number: i + 1,
      due_date: dueDate.toISOString().split('T')[0],
      amount: monthly_deduction,
      status: isPaid ? ('paid' as const) : ('pending' as const),
      paid_at: isPaid ? new Date().toISOString() : null,
    }
  })

  const { error: installError } = await admin.from('loan_installments').insert(installments)
  if (installError) {
    await admin.from('loans').delete().eq('id', loan.id)
    return { error: installError.message }
  }

  // If all installments were already paid, mark the loan as paid immediately
  if (already_paid >= number_of_installments) {
    await admin.from('loans').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', loan.id)
  }

  revalidatePath('/loans')
  revalidatePath('/employees')
  return {}
}

// ── Mark installment paid ─────────────────────────────────────────────────────

export async function markInstallmentPaid(
  installmentId: string,
  loanId: string,
): Promise<{ error?: string }> {
  const admin = await requireLoanManage()
  if (!admin) return { error: 'You do not have permission to update installments.' }

  const { error } = await admin
    .from('loan_installments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', installmentId)

  if (error) return { error: error.message }

  // Auto-close the loan if all installments are now paid
  const { data: installments } = await admin
    .from('loan_installments')
    .select('status')
    .eq('loan_id', loanId)

  if (installments?.every(i => i.status === 'paid')) {
    await admin
      .from('loans')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', loanId)
  }

  revalidatePath('/loans')
  revalidatePath('/employees')
  return {}
}

// ── Cancel loan ───────────────────────────────────────────────────────────────

export async function cancelLoan(loanId: string): Promise<{ error?: string }> {
  const admin = await requireLoanManage()
  if (!admin) return { error: 'You do not have permission to cancel loans.' }

  const { error } = await admin
    .from('loans')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', loanId)

  if (error) return { error: error.message }

  revalidatePath('/loans')
  revalidatePath('/employees')
  return {}
}
