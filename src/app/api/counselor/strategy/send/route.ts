// This route has been removed.
// Counselor messages are now sent via /api/counselor/chat (sender: 'counselor')
// and AI objectives are stored via /api/counselor/objectives.
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Deprecated. Use /api/counselor/chat instead.' }, { status: 410 })
}
