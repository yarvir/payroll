'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPermission } from '@/lib/permissions'
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

/**
 * Returns the admin client if the current user has loan management permission
 * (owner always; hr and any custom role with manage_employees = true).
 * Returns null if unauthenticated or permission is denied.
 */
async function requireLoanManage() {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const allowed = await checkPermission(profile.role, 'manage_employees')
  if (!allowed) return null
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

// ── Contract URL ──────────────────────────────────────────────────────────────

export async function getLoanContractUrl(filePath: string): Promise<{ url?: string; error?: string }> {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated.' }
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('loan-contracts')
    .createSignedUrl(filePath, 60 * 60) // 1-hour signed URL
  if (error) return { error: error.message }
  return { url: data.signedUrl }
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
  const installment_mode = (formData.get('installment_mode') as string) || 'equal'
  const deduction_method = (formData.get('deduction_method') as string) || 'salary'
  const contract_url = (formData.get('contract_url') as string | null)?.trim() || null
  const contractFile = formData.get('contract_file') as File | null

  if (!employee_id || !total_amount_raw || !currency || !installments_raw || !start_date) {
    return { error: 'All required fields must be filled in.' }
  }

  const total_amount = parseFloat(total_amount_raw)
  const number_of_installments = parseInt(installments_raw, 10)

  if (isNaN(total_amount) || total_amount <= 0) return { error: 'Total amount must be a positive number.' }
  if (isNaN(number_of_installments) || number_of_installments < 1) return { error: 'Number of installments must be at least 1.' }
  if (isNaN(already_paid) || already_paid < 0) return { error: 'Installments already paid cannot be negative.' }
  if (already_paid > number_of_installments) return { error: 'Installments already paid cannot exceed total installments.' }
  if (!['salary', 'bonus', 'flexible'].includes(deduction_method)) return { error: 'Invalid deduction method.' }

  // Determine installment amounts
  let installmentAmounts: number[]
  if (installment_mode === 'custom') {
    const customAmountsRaw = formData.getAll('custom_amounts') as string[]
    if (customAmountsRaw.length !== number_of_installments) {
      return { error: 'Number of custom amounts does not match number of installments.' }
    }
    installmentAmounts = customAmountsRaw.map(v => parseFloat(v))
    if (installmentAmounts.some(a => isNaN(a) || a < 0)) {
      return { error: 'All installment amounts must be valid non-negative numbers.' }
    }
    const sum = parseFloat(installmentAmounts.reduce((s, a) => s + a, 0).toFixed(2))
    if (Math.abs(sum - total_amount) > 0.01) {
      return { error: `Custom installment amounts sum to ${sum} but must equal the total loan amount of ${total_amount}.` }
    }
  } else {
    // Equal: all same amount, last installment adjusted to absorb rounding
    const regularAmount = parseFloat((total_amount / number_of_installments).toFixed(2))
    const lastAmount = parseFloat((total_amount - regularAmount * (number_of_installments - 1)).toFixed(2))
    installmentAmounts = Array.from({ length: number_of_installments }, (_, i) =>
      i === number_of_installments - 1 ? lastAmount : regularAmount
    )
  }

  // monthly_deduction stores the average amount for display in the loans list
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
      deduction_method: deduction_method as 'salary' | 'bonus' | 'flexible',
      contract_url,
    })
    .select('id')
    .single()

  if (loanError) return { error: loanError.message }

  // Generate installment rows.
  // Deduction dates: 10th of the month AFTER the loan start date, then 10th
  // of each subsequent month. Hardcoded to day 10 until a Payroll Settings
  // page exposes a configurable payment day.
  const PAYMENT_DAY = 10
  const startDateObj = new Date(start_date + 'T00:00:00')
  const installments = installmentAmounts.map((amount, i) => {
    // new Date(year, month, day) handles month overflow automatically.
    const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1 + i, PAYMENT_DAY)
    const deduction_date = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
    const isPaid = i < already_paid
    return {
      loan_id: loan.id,
      installment_number: i + 1,
      deduction_date,
      amount,
      status: isPaid ? ('paid' as const) : ('pending' as const),
      paid_at: isPaid ? new Date().toISOString() : null,
      payment_source: isPaid ? ('manual' as const) : null,
    }
  })

  const { error: installError } = await admin.from('loan_installments').insert(installments)
  if (installError) {
    await admin.from('loans').delete().eq('id', loan.id)
    return { error: installError.message }
  }

  // Handle contract file upload (after loan ID is known)
  if (contractFile && contractFile.size > 0) {
    const ext = contractFile.name.split('.').pop() ?? 'pdf'
    const storagePath = `${employee_id}/${loan.id}/contract.${ext}`
    const arrayBuffer = await contractFile.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from('loan-contracts')
      .upload(storagePath, arrayBuffer, {
        contentType: contractFile.type || 'application/pdf',
        upsert: true,
      })
    if (uploadError) {
      // Roll back the loan (cascades to installments)
      await admin.from('loans').delete().eq('id', loan.id)
      return { error: `Contract upload failed: ${uploadError.message}` }
    }
    await admin.from('loans').update({ contract_file_path: storagePath }).eq('id', loan.id)
  }

  // Auto-close if all installments were already paid
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
  paymentSource: string,
): Promise<{ error?: string }> {
  const admin = await requireLoanManage()
  if (!admin) return { error: 'You do not have permission to update installments.' }

  const validSources = ['salary', 'kpi_bonus', 'end_of_contract_bonus', 'manual']
  if (!validSources.includes(paymentSource)) return { error: 'Invalid payment source.' }

  const { error } = await admin
    .from('loan_installments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_source: paymentSource as 'salary' | 'kpi_bonus' | 'end_of_contract_bonus' | 'manual',
    })
    .eq('id', installmentId)

  if (error) return { error: error.message }

  // Auto-close the loan if all installments are now paid
  const { data: allInstallments } = await admin
    .from('loan_installments')
    .select('status')
    .eq('loan_id', loanId)

  if (allInstallments?.every(i => i.status === 'paid')) {
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
