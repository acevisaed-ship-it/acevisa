import { isBranchScopedAdmin } from '@/lib/admin/branchScope'
import { parseClientJoin, parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { requireAdminApi } from '@/lib/admin/requireAdminApi'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { admin, error } = await requireAdminApi()
  if (error) return error

  const branchScoped = isBranchScopedAdmin(admin)
  const supabase = createAdminClient()

  let negligenceQuery = supabase
    .from('tasks')
    .select(
      branchScoped
        ? 'id, task_text, created_at, negligence_flagged, counselors!inner(name, branch_id), clients!inner(name, id, branch_id)'
        : 'id, task_text, created_at, negligence_flagged, counselors(name), clients(name, id)'
    )
    .eq('negligence_flagged', true)
    .order('created_at', { ascending: false })

  let slowResponseQuery = supabase
    .from('response_tracking')
    .select(
      branchScoped
        ? 'id, student_message_at, response_at, response_time_seconds, counselors!inner(name, branch_id), clients!inner(name, id, branch_id)'
        : 'id, student_message_at, response_at, response_time_seconds, counselors(name), clients(name, id)'
    )
    .gt('response_time_seconds', 86400)
    .order('response_at', { ascending: false })

  let complaintsQuery = supabase
    .from('complaints')
    .select('id, client_id, client_name, subject, body, created_at, status')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (branchScoped) {
    negligenceQuery = negligenceQuery.eq('clients.branch_id', admin.branch_id)
    slowResponseQuery = slowResponseQuery.eq('clients.branch_id', admin.branch_id)
  }

  const [{ data: negligenceTasks }, { data: slowResponses }, { data: complaints }] =
    await Promise.all([negligenceQuery, slowResponseQuery, complaintsQuery])

  const clientIds = [
    ...new Set(
      (complaints ?? [])
        .map((c) => c.client_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const clientCounselorMap = new Map<string, { name: string }>()
  if (clientIds.length > 0) {
    let clientsQuery = supabase
      .from('clients')
      .select('id, branch_id, counselors!clients_counselor_id_fkey(name)')
      .in('id', clientIds)

    if (branchScoped) {
      clientsQuery = clientsQuery.eq('branch_id', admin.branch_id)
    }

    const { data: clients } = await clientsQuery

    for (const client of clients ?? []) {
      const counselorName = parseCounselorName(
        client.counselors as { name: string } | { name: string }[] | null
      )
      if (counselorName) clientCounselorMap.set(client.id, { name: counselorName })
    }
  }

  const negligenceFlags = (negligenceTasks ?? []).map((task) => {
    const counselorName = parseCounselorName(
      task.counselors as { name: string } | { name: string }[] | null
    )
    const client = parseClientJoin(
      task.clients as { name: string; id: string } | { name: string; id: string }[] | null
    )
    return {
      taskId: task.id,
      counselorName: counselorName ?? 'Unassigned',
      clientName: client?.name ?? 'Unknown',
      clientId: client?.id ?? null,
      taskTitle: task.task_text,
      flaggedDate: task.created_at,
    }
  })

  const slowResponseRows = (slowResponses ?? []).map((row) => {
    const counselorName = parseCounselorName(
      row.counselors as { name: string } | { name: string }[] | null
    )
    const client = parseClientJoin(
      row.clients as { name: string; id: string } | { name: string; id: string }[] | null
    )
    const hours = row.response_time_seconds
      ? Math.round((row.response_time_seconds / 3600) * 10) / 10
      : null
    return {
      id: row.id,
      counselorName: counselorName ?? 'Unassigned',
      clientName: client?.name ?? 'Unknown',
      clientId: client?.id ?? null,
      studentMessageTime: row.student_message_at,
      responseTimeHours: hours,
      responseDate: row.response_at,
    }
  })

  const openComplaints = (complaints ?? [])
    .filter((complaint) => {
      if (!branchScoped) return true
      if (!complaint.client_id) return false
      return clientCounselorMap.has(complaint.client_id)
    })
    .map((complaint) => {
    const counselor = complaint.client_id
      ? clientCounselorMap.get(complaint.client_id)
      : null
    return {
      id: complaint.id,
      clientId: complaint.client_id,
      clientName: complaint.client_name,
      subject: complaint.subject,
      body: complaint.body,
      submittedDate: complaint.created_at,
      counselorName: counselor?.name ?? 'Unassigned',
    }
    })

  return NextResponse.json({
    negligenceFlags,
    slowResponses: slowResponseRows,
    openComplaints,
  })
}
