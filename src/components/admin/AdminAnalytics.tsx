'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, UserCheck, AlertTriangle, CheckSquare, Calendar,
  TrendingUp, Handshake, MessageSquare, Smartphone, Copy, Check,
} from 'lucide-react'

const APP_INSTALL_URL = 'https://acevisa.vercel.app/install'

function ShareAppCard() {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(APP_INSTALL_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(APP_INSTALL_URL)}`

  return (
    <div className="col-span-2 md:col-span-3 xl:col-span-4 rounded-2xl border border-blue/20 bg-blue/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* QR code */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <img
            src={qrUrl}
            alt="QR code to install ACE Portal app"
            className="h-[120px] w-[120px] rounded-xl border border-blue/20 bg-white"
          />
          <p className="text-[10px] text-text/40">Scan to install</p>
        </div>

        {/* Text + actions */}
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue/10 p-2">
              <Smartphone className="h-5 w-5 text-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Share App with Clients</p>
              <p className="mt-0.5 text-xs text-text/60">
                Send this link or show the QR code to clients — they can install the ACE Portal directly on their phone without the App Store.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-white border border-text/10 px-3 py-2 text-xs text-text/70 select-all">
              {APP_INSTALL_URL}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg bg-blue px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={APP_INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-blue/30 px-3 py-2 text-xs font-semibold text-blue transition-colors hover:bg-blue/10"
            >
              Open Page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

type Analytics = {
  totalClients: number
  activeClients: number
  unassignedClients: number
  totalCounselors: number
  openComplaints: number
  openTasks: number
  overdueTasks: number
  meetingsThisMonth: number
  completedMeetings: number
  revenueThisMonth: number
  pipelineValue: number
}

function KPICard({
  label, value, sub, icon: Icon, href, warn,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  href?: string
  warn?: boolean
}) {
  const content = (
    <div className={`rounded-2xl border p-5 bg-white transition-shadow hover:shadow-md ${warn ? 'border-orange/40' : 'border-text/10'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text/60">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${warn ? 'text-orange' : 'text-text'}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-text/40">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${warn ? 'bg-orange/10' : 'bg-blue/10'}`}>
          <Icon className={`h-5 w-5 ${warn ? 'text-orange' : 'text-blue'}`} />
        </div>
      </div>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function formatPKR(amount: number) {
  if (amount >= 1000000) return `PKR ${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `PKR ${(amount / 1000).toFixed(0)}K`
  return `PKR ${amount.toLocaleString()}`
}

export function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-text/5" />
        ))}
      </div>
    )
  }

  if (!data) return <p className="text-sm text-text/50">Failed to load analytics.</p>

  const meetingCompletion = data.meetingsThisMonth > 0
    ? Math.round((data.completedMeetings / data.meetingsThisMonth) * 100)
    : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">Analytics Overview</h1>
        <p className="mt-1 text-sm text-text/60">Live snapshot of your business</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <KPICard
          label="Total Clients"
          value={data.totalClients}
          sub={`${data.activeClients} assigned`}
          icon={Users}
          href="/admin/clients"
        />
        <KPICard
          label="Unassigned"
          value={data.unassignedClients}
          sub="Need counselor"
          icon={UserCheck}
          href="/admin/unassigned"
          warn={data.unassignedClients > 0}
        />
        <KPICard
          label="Counselors"
          value={data.totalCounselors}
          sub="Active"
          icon={Users}
          href="/admin/counselors"
        />
        <KPICard
          label="Open Complaints"
          value={data.openComplaints}
          sub="Needs review"
          icon={MessageSquare}
          href="/admin/complaints"
          warn={data.openComplaints > 0}
        />
        <KPICard
          label="Open Tasks"
          value={data.openTasks}
          sub={`${data.overdueTasks} overdue`}
          icon={CheckSquare}
          warn={data.overdueTasks > 0}
        />
        <KPICard
          label="Meetings This Month"
          value={data.meetingsThisMonth}
          sub={`${meetingCompletion}% completed`}
          icon={Calendar}
          href="/admin/meetings"
        />
        <KPICard
          label="Revenue This Month"
          value={formatPKR(data.revenueThisMonth)}
          sub="Paid invoices"
          icon={TrendingUp}
          href="/admin/finance"
        />
        <KPICard
          label="Pipeline Value"
          value={formatPKR(data.pipelineValue)}
          sub="Active deals"
          icon={Handshake}
          href="/admin/crm"
        />

        {/* Share App card — spans full width */}
        <ShareAppCard />
      </div>

      {data.overdueTasks > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-orange/30 bg-orange/8 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange" />
          <p className="text-sm text-text">
            <span className="font-semibold">{data.overdueTasks} tasks flagged as overdue.</span>{' '}
            <Link href="/admin/counselors" className="text-orange underline">
              Review counselor tasks
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
