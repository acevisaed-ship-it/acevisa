import { AttendancePanel } from '@/components/dashboard/AttendancePanel'

export default function AttendancePage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">Attendance</h1>
      <p className="mt-1 text-sm text-white/60">
        Daily check-in and leave / late / absence applications
      </p>
      <div className="mt-6">
        <AttendancePanel />
      </div>
    </main>
  )
}
