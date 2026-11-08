/** Branch Manager ('admin') accounts are scoped to `branch_id`; CEO sees all. */

export type AdminAccount = {
  role: string
  branch_id: string | null
}

export function isBranchScopedAdmin(admin: AdminAccount): boolean {
  // Branch managers and accountants that carry a branch_id only see that branch (an accountant without one sees all).
  return (admin.role === 'admin' || admin.role === 'accountant') && admin.branch_id != null
}

export function requireBranchId(admin: AdminAccount): string {
  if (!admin.branch_id) {
    throw new Error('Branch Manager account missing branch_id')
  }
  return admin.branch_id
}
