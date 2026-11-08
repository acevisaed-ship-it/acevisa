/**
 * Server-side allow-list for the universal query API and exports.
 * Only columns listed here can ever be selected, filtered, grouped or exported.
 * Never add salary/password/ID columns. Money columns are listed in `numeric` for sum().
 */
export type ViewDef = { label: string; columns: string[]; numeric: string[] }

export const QUERY_VIEWS: Record<string, ViewDef> = {
  v_clients_wide: {
    label: 'Clients',
    columns: ['client_id', 'client_code', 'name', 'phone', 'email', 'city', 'language', 'target_country', 'status', 'pipeline_stage',
      'registration_date', 'ad_source', 'counselor_id', 'counselor_name', 'branch_id', 'branch_name'],
    numeric: [],
  },
  v_cases_wide: {
    label: 'Cases',
    columns: ['deal_id', 'client_id', 'client_name', 'city', 'branch_id', 'counselor_id', 'counselor_name', 'visa_category', 'service_type',
      'product_name', 'country', 'program_level', 'university', 'intake', 'case_status', 'current_stage', 'withdraw_reason', 'withdraw_stage',
      'received', 'refunded', 'expenses', 'gross', 'incentives_pending', 'incentives_active', 'incentives_held', 'incentives_paid',
      'clearance_status', 'created_at'],
    numeric: ['received', 'refunded', 'expenses', 'gross', 'incentives_pending', 'incentives_active', 'incentives_held', 'incentives_paid'],
  },
  v_incentives_wide: {
    label: 'Incentives',
    columns: ['incentive_id', 'deal_id', 'client_id', 'client_name', 'branch_id', 'counselor_id', 'counselor_name', 'product_name', 'milestone',
      'gross_base', 'milestone_pct', 'share_pct', 'rate_snapshot', 'amount', 'status', 'hold_reason', 'payable_period', 'pay_date', 'created_at'],
    numeric: ['gross_base', 'amount'],
  },
  v_vouchers_wide: {
    label: 'Vouchers',
    columns: ['voucher_id', 'client_id', 'client_name', 'branch_id', 'deal_id', 'serial_no', 'face_value', 'status', 'issued_at', 'valid_until',
      'used_at', 'receipt_no', 'price_paid', 'product_name', 'days_to_expiry'],
    numeric: ['face_value', 'price_paid'],
  },
  v_refunds_wide: {
    label: 'Refunds',
    columns: ['refund_id', 'client_id', 'client_name', 'branch_id', 'deal_id', 'payment_id', 'receipt_no', 'amount', 'method', 'reason', 'status',
      'vendor_refund_received', 'voucher_id', 'requested_at', 'approved_at', 'paid_at'],
    numeric: ['amount'],
  },
  v_language_wide: {
    label: 'Language tests',
    columns: ['test_id', 'client_id', 'client_name', 'branch_id', 'exam_org', 'test_type', 'received_amount', 'test_date', 'status', 'result',
      'session_type', 'scheduled_at', 'room', 'session_status', 'instructor_id', 'instructor_name'],
    numeric: ['received_amount'],
  },
  v_payroll_wide: {
    label: 'Payroll',
    columns: ['item_id', 'run_id', 'period', 'pay_date', 'run_status', 'branch_id', 'counselor_id', 'counselor_name', 'basic', 'allowances',
      'deductions', 'incentives_earned', 'incentives_held', 'adjustments', 'carried_in', 'carried_out', 'net', 'item_status'],
    numeric: ['basic', 'allowances', 'deductions', 'incentives_earned', 'incentives_held', 'adjustments', 'carried_in', 'carried_out', 'net'],
  },
  v_payroll_lines_wide: {
    label: 'Payslip lines',
    columns: ['line_id', 'item_id', 'run_id', 'branch_id', 'counselor_name', 'label', 'line_type', 'amount', 'note', 'order_no'],
    numeric: ['amount'],
  },
  v_cases_report: {
    label: 'Cases (full report)',
    columns: ['deal_id', 'client_id', 'client_name', 'city', 'branch_id', 'counselor_id', 'counselor_name', 'visa_category', 'service_type',
      'product_name', 'country', 'program_level', 'university', 'institution_code', 'is_partner', 'institution_other', 'agent_name', 'source_type',
      'intake', 'applied_at', 'case_status', 'current_stage', 'withdraw_reason', 'clearance_status', 'payment_status',
      'invoiced', 'received', 'refunded', 'remaining', 'expenses_total', 'instructor_commission', 'incentives_pending', 'incentives_committed',
      'profit_before_incentives', 'profit_after_incentives', 'profit_expected', 'created_at'],
    numeric: ['invoiced', 'received', 'refunded', 'remaining', 'expenses_total', 'instructor_commission', 'incentives_pending',
      'incentives_committed', 'profit_before_incentives', 'profit_after_incentives', 'profit_expected'],
  },
  v_payments_wide: {
    label: 'Payments',
    columns: ['payment_id', 'receipt_no', 'paid_at', 'amount', 'payment_kind', 'method', 'status', 'client_id', 'client_name', 'branch_id',
      'counselor_id', 'counselor_name', 'deal_id', 'country', 'university', 'agent_name', 'product_name', 'service_type', 'case_status'],
    numeric: ['amount'],
  },
  v_services_wide: {
    label: 'All services',
    columns: ['service_key', 'service_type', 'sub_type', 'client_id', 'client_name', 'branch_id', 'counselor_id', 'counselor_name', 'deal_id',
      'country', 'institution', 'agent_name', 'stage', 'status', 'service_date', 'amount'],
    numeric: ['amount'],
  },
  v_stage_history: {
    label: 'Stage history',
    columns: ['deal_id', 'client_id', 'client_name', 'branch_id', 'counselor_id', 'counselor_name', 'stage', 'order_no', 'stage_status',
      'started_at', 'done_at', 'entered_at'],
    numeric: [],
  },
  v_ledger: {
    label: 'Ledger',
    columns: ['entry_id', 'entry_type', 'occurred_at', 'signed_amount', 'client_id', 'deal_id', 'counselor_id', 'product_id', 'branch_id', 'ref', 'method'],
    numeric: ['signed_amount'],
  },
}

export const FILTER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'in'] as const
export type FilterOp = (typeof FILTER_OPS)[number]
