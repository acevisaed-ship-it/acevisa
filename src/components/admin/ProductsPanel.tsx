'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Plus, ChevronDown, ChevronUp, Edit2, Trash2, Check, X,
  GraduationCap, Plane, Briefcase, BookOpen, Package,
  DollarSign, Building2, Users,
} from 'lucide-react'
import { formatPkr } from '@/lib/admin/dealTypes'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'study_visa' | 'visit_visa' | 'work_abroad' | 'language_test' | 'other'

type PaymentStage = {
  id?: string
  stage_order: number
  stage_name: string
  amount_type: 'fixed' | 'percentage'
  amount: number
  percentage: number
  due_trigger: string
  notes: string
}

type Vendor = {
  id?: string
  vendor_name: string
  vendor_type: string
  amount_type: 'fixed' | 'percentage'
  amount: number
  percentage: number
  currency: string
  notes: string
}

type CommissionRule = {
  id?: string
  counselor_id: string | null
  role: string
  commission_type: 'percentage' | 'fixed'
  commission_value: number
  applies_to_stage: number | null
  notes: string
}

type Product = {
  id: string
  category: Category
  country: string | null
  name: string
  description: string | null
  base_price: number
  currency: string
  is_active: boolean
  sort_order: number
  product_payment_stages: PaymentStage[]
  product_vendors: Vendor[]
  product_commission_rules: CommissionRule[]
}

type CounselorOption = { id: string; name: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; icon: typeof Package }[] = [
  { id: 'study_visa', label: 'Study Visa', icon: GraduationCap },
  { id: 'visit_visa', label: 'Visit Visa', icon: Plane },
  { id: 'work_abroad', label: 'Work Abroad', icon: Briefcase },
  { id: 'language_test', label: 'Language Test', icon: BookOpen },
  { id: 'other', label: 'Other', icon: Package },
]

const CATEGORY_COLORS: Record<Category, string> = {
  study_visa: 'text-blue-400 bg-blue-400/10',
  visit_visa: 'text-purple-400 bg-purple-400/10',
  work_abroad: 'text-orange-400 bg-orange-400/10',
  language_test: 'text-green-400 bg-green-400/10',
  other: 'text-white/50 bg-white/5',
}

const DUE_TRIGGERS = [
  { value: 'on_signup', label: 'On Signup' },
  { value: 'on_application', label: 'On Application' },
  { value: 'on_approval', label: 'On Approval' },
  { value: 'on_visa', label: 'On Visa' },
  { value: 'on_completion', label: 'On Completion' },
  { value: 'manual', label: 'Manual' },
]

const VENDOR_TYPES = [
  { value: 'embassy', label: 'Embassy' },
  { value: 'courier', label: 'Courier' },
  { value: 'institute', label: 'Institute' },
  { value: 'test_center', label: 'Test Center' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
]

const ROLES = [
  { value: 'closer', label: 'Closer' },
  { value: 'referrer', label: 'Referrer' },
  { value: 'support', label: 'Support' },
  { value: 'manager', label: 'Manager' },
]

const inputClass = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25'
const selectClass = 'w-full rounded-lg border border-white/10 bg-[#0f1f1a] px-3 py-2 text-sm text-white outline-none focus:border-white/25'

// ─── Empty form defaults ──────────────────────────────────────────────────────

const emptyProduct = (): Omit<Product, 'id' | 'product_payment_stages' | 'product_vendors' | 'product_commission_rules'> => ({
  category: 'study_visa',
  country: '',
  name: '',
  description: '',
  base_price: 0,
  currency: 'PKR',
  is_active: true,
  sort_order: 0,
})

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductsPanel({ counselors }: { counselors: CounselorOption[] }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'stages' | 'vendors' | 'commissions'>('stages')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      setProducts(data.products ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category === cat.id),
  })).filter((g) => g.products.length > 0 || g.id === 'study_visa')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          Define your service products, payment stages, vendor costs, and commission splits.
        </p>
        <button
          type="button"
          onClick={() => { setShowAddForm(true); setEditingId(null) }}
          className="flex items-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {showAddForm && (
        <AddProductForm
          counselors={counselors}
          onSave={async () => { await load(); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-white/40">Loading products…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map((group) => {
            const Icon = group.icon
            return (
              <div key={group.id}>
                <div className={cn('mb-3 flex items-center gap-2 rounded-xl px-3 py-2 w-fit', CATEGORY_COLORS[group.id])}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-bold">{group.label}</span>
                  <span className="text-xs opacity-60">({group.products.length})</span>
                </div>

                {group.products.length === 0 ? (
                  <p className="text-sm text-white/30 pl-2">No products yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {group.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        counselors={counselors}
                        expanded={expandedId === product.id}
                        activeSection={activeSection}
                        onToggle={() => setExpandedId(expandedId === product.id ? null : product.id)}
                        onSectionChange={setActiveSection}
                        onRefresh={load}
                        editingId={editingId}
                        setEditingId={setEditingId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product, counselors, expanded, activeSection,
  onToggle, onSectionChange, onRefresh, editingId, setEditingId,
}: {
  product: Product
  counselors: CounselorOption[]
  expanded: boolean
  activeSection: 'stages' | 'vendors' | 'commissions'
  onToggle: () => void
  onSectionChange: (s: 'stages' | 'vendors' | 'commissions') => void
  onRefresh: () => Promise<void>
  editingId: string | null
  setEditingId: (id: string | null) => void
}) {
  const [editingBasic, setEditingBasic] = useState(false)
  const [form, setForm] = useState({ ...product, country: product.country ?? '', description: product.description ?? '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Stage / vendor / commission drafts
  const [stages, setStages] = useState<PaymentStage[]>(product.product_payment_stages)
  const [vendors, setVendors] = useState<Vendor[]>(product.product_vendors)
  const [commRules, setCommRules] = useState<CommissionRule[]>(product.product_commission_rules)
  const [subSaving, setSubSaving] = useState(false)

  // Recalc totals
  const totalVendorFixed = vendors.filter(v => v.amount_type === 'fixed').reduce((s, v) => s + Number(v.amount), 0)
  const totalCommPct = commRules.filter(r => r.commission_type === 'percentage').reduce((s, r) => s + Number(r.commission_value), 0)

  async function saveBasic() {
    setSaving(true)
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      await onRefresh()
      setEditingBasic(false)
    } finally { setSaving(false) }
  }

  async function deleteProduct() {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
      await onRefresh()
    } finally { setDeleting(false) }
  }

  async function saveStages() {
    setSubSaving(true)
    try {
      await fetch(`/api/admin/products/${product.id}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages }),
      })
      await onRefresh()
    } finally { setSubSaving(false) }
  }

  async function saveVendors() {
    setSubSaving(true)
    try {
      await fetch(`/api/admin/products/${product.id}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendors }),
      })
      await onRefresh()
    } finally { setSubSaving(false) }
  }

  async function saveCommissions() {
    setSubSaving(true)
    try {
      await fetch(`/api/admin/products/${product.id}/commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: commRules }),
      })
      await onRefresh()
    } finally { setSubSaving(false) }
  }

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      product.is_active ? 'border-white/10 glass-card crisp-on-dark' : 'border-white/5 opacity-60'
    )}>
      {/* ── Header ── */}
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          {editingBasic ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className={cn(inputClass, 'flex-1')}
                placeholder="Product name"
              />
              <input
                value={form.country ?? ''}
                onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                className={cn(inputClass, 'w-36')}
                placeholder="Country"
              />
              <input
                type="number"
                value={form.base_price}
                onChange={(e) => setForm(f => ({ ...f, base_price: Number(e.target.value) }))}
                className={cn(inputClass, 'w-32')}
                placeholder="Base price"
              />
              <button onClick={saveBasic} disabled={saving} className="rounded-full bg-grad-blue crisp-on-dark p-2 text-white disabled:opacity-50">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setEditingBasic(false)} className="rounded-full border border-white/15 p-2 text-white/50">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="font-semibold text-white/80">{product.name}</p>
              <p className="text-xs text-white/40 mt-0.5">
                Base: {formatPkr(product.base_price)}
                {product.description && <> · {product.description}</>}
                {!product.is_active && <span className="ml-2 text-yellow-400/70">Inactive</span>}
              </p>
            </>
          )}
        </div>
        {!editingBasic && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingBasic(true) }}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1.5 text-xs text-white/50 hover:text-white"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); deleteProduct() }}
              disabled={deleting}
              className="rounded-full border border-white/10 p-1.5 text-white/30 hover:border-red-400/40 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            {expanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
          </div>
        )}
      </div>

      {/* ── Expanded sections ── */}
      {expanded && (
        <div className="border-t border-white/5">
          {/* Section tabs */}
          <div className="flex gap-1 px-5 pt-4 pb-0">
            {([
              { id: 'stages', label: 'Payment Stages', icon: DollarSign, count: stages.length },
              { id: 'vendors', label: 'Vendor Costs', icon: Building2, count: vendors.length },
              { id: 'commissions', label: 'Commission Split', icon: Users, count: commRules.length },
            ] as const).map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSectionChange(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors',
                    activeSection === s.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/70'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                  <span className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{s.count}</span>
                </button>
              )
            })}
          </div>

          <div className="bg-white/[0.03] px-5 py-5">
            {/* ── Payment Stages ── */}
            {activeSection === 'stages' && (
              <StagesEditor
                stages={stages}
                setStages={setStages}
                basePrice={product.base_price}
                onSave={saveStages}
                saving={subSaving}
              />
            )}

            {/* ── Vendors ── */}
            {activeSection === 'vendors' && (
              <VendorsEditor
                vendors={vendors}
                setVendors={setVendors}
                basePrice={product.base_price}
                totalVendorFixed={totalVendorFixed}
                onSave={saveVendors}
                saving={subSaving}
              />
            )}

            {/* ── Commission Split ── */}
            {activeSection === 'commissions' && (
              <CommissionsEditor
                rules={commRules}
                setRules={setCommRules}
                counselors={counselors}
                stages={stages}
                totalCommPct={totalCommPct}
                onSave={saveCommissions}
                saving={subSaving}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stages Editor ────────────────────────────────────────────────────────────

function StagesEditor({ stages, setStages, basePrice, onSave, saving }: {
  stages: PaymentStage[]
  setStages: (s: PaymentStage[]) => void
  basePrice: number
  onSave: () => void
  saving: boolean
}) {
  function addStage() {
    setStages([...stages, {
      stage_order: stages.length + 1,
      stage_name: '',
      amount_type: 'fixed',
      amount: 0,
      percentage: 0,
      due_trigger: 'manual',
      notes: '',
    }])
  }

  function update(i: number, key: keyof PaymentStage, val: string | number) {
    const updated = [...stages]
    ;(updated[i] as Record<string, unknown>)[key] = val
    setStages(updated)
  }

  function remove(i: number) {
    setStages(stages.filter((_, idx) => idx !== i))
  }

  const totalPct = stages.filter(s => s.amount_type === 'percentage').reduce((acc, s) => acc + Number(s.percentage), 0)
  const totalFixed = stages.filter(s => s.amount_type === 'fixed').reduce((acc, s) => acc + Number(s.amount), 0)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Payment Stages</p>
        <div className="flex items-center gap-2 text-xs text-white/40">
          {totalPct > 0 && <span className={totalPct === 100 ? 'text-green-400' : 'text-yellow-400'}>{totalPct}% total</span>}
          {totalFixed > 0 && <span>{formatPkr(totalFixed)} total</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {stages.length === 0 && (
          <p className="text-xs text-white/30">No payment stages yet. Add stages to define when the client pays.</p>
        )}
        {stages.map((stage, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/50">
              {i + 1}
            </span>
            <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                value={stage.stage_name}
                onChange={(e) => update(i, 'stage_name', e.target.value)}
                placeholder="Stage name (e.g. Booking Fee)"
                className={cn(inputClass, 'col-span-2 sm:col-span-1')}
              />
              <select
                value={stage.amount_type}
                onChange={(e) => update(i, 'amount_type', e.target.value)}
                className={selectClass}
              >
                <option value="fixed">Fixed (PKR)</option>
                <option value="percentage">% of total</option>
              </select>
              {stage.amount_type === 'fixed' ? (
                <input
                  type="number"
                  value={stage.amount}
                  onChange={(e) => update(i, 'amount', Number(e.target.value))}
                  placeholder="Amount"
                  className={inputClass}
                />
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={stage.percentage}
                    onChange={(e) => update(i, 'percentage', Number(e.target.value))}
                    placeholder="%"
                    min="0" max="100"
                    className={inputClass}
                  />
                  <span className="text-xs text-white/40 shrink-0">
                    ≈ {formatPkr(basePrice * Number(stage.percentage) / 100)}
                  </span>
                </div>
              )}
              <select
                value={stage.due_trigger}
                onChange={(e) => update(i, 'due_trigger', e.target.value)}
                className={selectClass}
              >
                {DUE_TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => remove(i)} className="mt-2 text-white/25 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={addStage} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Add Stage
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="ml-auto flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Stages'}
        </button>
      </div>
    </div>
  )
}

// ─── Vendors Editor ───────────────────────────────────────────────────────────

function VendorsEditor({ vendors, setVendors, basePrice, totalVendorFixed, onSave, saving }: {
  vendors: Vendor[]
  setVendors: (v: Vendor[]) => void
  basePrice: number
  totalVendorFixed: number
  onSave: () => void
  saving: boolean
}) {
  function add() {
    setVendors([...vendors, { vendor_name: '', vendor_type: 'other', amount_type: 'fixed', amount: 0, percentage: 0, currency: 'PKR', notes: '' }])
  }

  function update(i: number, key: keyof Vendor, val: string | number) {
    const updated = [...vendors]
    ;(updated[i] as Record<string, unknown>)[key] = val
    setVendors(updated)
  }

  function remove(i: number) { setVendors(vendors.filter((_, idx) => idx !== i)) }

  const profit = basePrice - totalVendorFixed

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Vendor / Expense Breakdown</p>
        {totalVendorFixed > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/40">Total costs: <span className="text-red-400">{formatPkr(totalVendorFixed)}</span></span>
            <span className="text-white/40">Net profit: <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>{formatPkr(profit)}</span></span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {vendors.length === 0 && (
          <p className="text-xs text-white/30">No vendor costs yet. Add embassy fees, courier charges, etc.</p>
        )}
        {vendors.map((v, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                value={v.vendor_name}
                onChange={(e) => update(i, 'vendor_name', e.target.value)}
                placeholder="Vendor name (e.g. Embassy Fee)"
                className={cn(inputClass, 'col-span-2 sm:col-span-1')}
              />
              <select value={v.vendor_type} onChange={(e) => update(i, 'vendor_type', e.target.value)} className={selectClass}>
                {VENDOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={v.amount_type} onChange={(e) => update(i, 'amount_type', e.target.value)} className={selectClass}>
                <option value="fixed">Fixed (PKR)</option>
                <option value="percentage">% of total</option>
              </select>
              {v.amount_type === 'fixed' ? (
                <input type="number" value={v.amount} onChange={(e) => update(i, 'amount', Number(e.target.value))} placeholder="Amount (PKR)" className={inputClass} />
              ) : (
                <div className="flex items-center gap-1">
                  <input type="number" value={v.percentage} onChange={(e) => update(i, 'percentage', Number(e.target.value))} placeholder="%" min="0" max="100" className={inputClass} />
                  <span className="text-xs text-white/40 shrink-0">≈ {formatPkr(basePrice * Number(v.percentage) / 100)}</span>
                </div>
              )}
            </div>
            <button type="button" onClick={() => remove(i)} className="mt-2 text-white/25 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Add Vendor
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="ml-auto flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Vendors'}
        </button>
      </div>
    </div>
  )
}

// ─── Commissions Editor ───────────────────────────────────────────────────────

function CommissionsEditor({ rules, setRules, counselors, stages, totalCommPct, onSave, saving }: {
  rules: CommissionRule[]
  setRules: (r: CommissionRule[]) => void
  counselors: CounselorOption[]
  stages: PaymentStage[]
  totalCommPct: number
  onSave: () => void
  saving: boolean
}) {
  function add() {
    setRules([...rules, { counselor_id: null, role: 'closer', commission_type: 'percentage', commission_value: 0, applies_to_stage: null, notes: '' }])
  }

  function update(i: number, key: keyof CommissionRule, val: string | number | null) {
    const updated = [...rules]
    ;(updated[i] as Record<string, unknown>)[key] = val
    setRules(updated)
  }

  function remove(i: number) { setRules(rules.filter((_, idx) => idx !== i)) }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Commission Split</p>
        {totalCommPct > 0 && (
          <span className={cn('text-xs', totalCommPct > 100 ? 'text-red-400' : totalCommPct === 100 ? 'text-green-400' : 'text-yellow-400')}>
            {totalCommPct}% allocated
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {rules.length === 0 && (
          <p className="text-xs text-white/30">No commission rules yet. Add who gets what % when this product closes.</p>
        )}
        {rules.map((r, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {/* Counselor */}
              <select
                value={r.counselor_id ?? ''}
                onChange={(e) => update(i, 'counselor_id', e.target.value || null)}
                className={selectClass}
              >
                <option value="">Anyone (whoever closes)</option>
                {counselors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {/* Role */}
              <select value={r.role} onChange={(e) => update(i, 'role', e.target.value)} className={selectClass}>
                {ROLES.map((ro) => <option key={ro.value} value={ro.value}>{ro.label}</option>)}
              </select>

              {/* Type */}
              <select value={r.commission_type} onChange={(e) => update(i, 'commission_type', e.target.value)} className={selectClass}>
                <option value="percentage">% of deal</option>
                <option value="fixed">Fixed (PKR)</option>
              </select>

              {/* Value */}
              <input
                type="number"
                value={r.commission_value}
                onChange={(e) => update(i, 'commission_value', Number(e.target.value))}
                placeholder={r.commission_type === 'percentage' ? '%' : 'PKR'}
                min="0"
                className={inputClass}
              />

              {/* Applies to stage */}
              <select
                value={r.applies_to_stage ?? ''}
                onChange={(e) => update(i, 'applies_to_stage', e.target.value ? Number(e.target.value) : null)}
                className={selectClass}
              >
                <option value="">All stages</option>
                {stages.map((s, si) => <option key={si} value={s.stage_order}>Stage {s.stage_order}: {s.stage_name}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => remove(i)} className="mt-2 text-white/25 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="ml-auto flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Commission Rules'}
        </button>
      </div>
    </div>
  )
}

// ─── Add Product Form ─────────────────────────────────────────────────────────

function AddProductForm({ counselors, onSave, onCancel }: {
  counselors: CounselorOption[]
  onSave: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(emptyProduct())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim()) { setError('Product name is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      await onSave()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#B7C733]/30 bg-[#B7C733]/5 p-5">
      <h3 className="mb-4 text-sm font-bold text-white/80">New Product</h3>
      {error && <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-white/50">Category</label>
          <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value as Category }))} className={selectClass}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Country (if applicable)</label>
          <input value={form.country ?? ''} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. Sweden" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Product Name</label>
          <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Study Visa – Sweden" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Base Price (PKR)</label>
          <input type="number" value={form.base_price} onChange={(e) => setForm(f => ({ ...f, base_price: Number(e.target.value) }))} placeholder="120000" className={inputClass} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="mb-1 block text-xs text-white/50">Description (optional)</label>
          <input value={form.description ?? ''} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this product" className={inputClass} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Create Product'}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/50">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  )
}
