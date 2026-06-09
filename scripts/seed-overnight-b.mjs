/**
 * OVERNIGHT B — Mock data seed (6 clients, 3 meetings, chat histories, profiles, tasks, docs)
 * Run: node scripts/seed-overnight-b.mjs
 * Idempotent: fixed UUIDs with upsert / delete-and-reinsert for conversations.
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envText = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const ADMIN_ID = '2365c12c-8ad8-4cff-a45d-98137019f1d2'
const ANEEQA_ID = '45f23418-fbb7-472c-b9e2-bddc7eac40ff'
const HASHAAM_ID = '55403943-35db-4c2b-94fe-02750ed04352'

const CLIENT_IDS = {
  zain: 'a1000001-0000-0000-0000-000000000001',
  fareeha: 'a1000001-0000-0000-0000-000000000002',
  hamza: 'a1000001-0000-0000-0000-000000000003',
  sobia: 'a1000001-0000-0000-0000-000000000004',
  bilal: 'a1000001-0000-0000-0000-000000000005',
  nadia: 'a1000001-0000-0000-0000-000000000006',
}

const MEETING_IDS = {
  zain: 'b2000001-0000-0000-0000-000000000001',
  hamza: 'b2000001-0000-0000-0000-000000000002',
  fareeha: 'b2000001-0000-0000-0000-000000000003',
}

const TASK_IDS = [
  'c3000001-0000-0000-0000-000000000001',
  'c3000001-0000-0000-0000-000000000002',
  'c3000001-0000-0000-0000-000000000003',
  'c3000001-0000-0000-0000-000000000004',
]

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString()
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3600000).toISOString()
}

function offsetFrom(baseDaysAgo, minutes) {
  return new Date(Date.now() - baseDaysAgo * 86400000 + minutes * 60000).toISOString()
}

const clients = [
  {
    id: CLIENT_IDS.zain,
    name: 'Zain Abbas',
    phone: '03001000001',
    city: 'Lahore',
    language: 'urdu',
    ad_source: 'meta_uk_2024',
    pipeline_stage: 2,
    qualification_score: 7,
    counselor_id: HASHAAM_ID,
    notes: 'Test client — zain.test@acetest.com',
    created_at: daysAgo(5),
  },
  {
    id: CLIENT_IDS.fareeha,
    name: 'Fareeha Malik',
    phone: '03001000002',
    city: 'Karachi',
    language: 'english',
    ad_source: 'direct',
    pipeline_stage: 1,
    qualification_score: 3,
    counselor_id: HASHAAM_ID,
    notes: 'Test client — fareeha.test@acetest.com',
    created_at: daysAgo(3),
  },
  {
    id: CLIENT_IDS.hamza,
    name: 'Hamza Riaz',
    phone: '03001000003',
    city: 'Islamabad',
    language: 'urdu',
    ad_source: 'meta_germany_2024',
    pipeline_stage: 2,
    qualification_score: 8,
    counselor_id: ANEEQA_ID,
    notes: 'Test client — hamza.test@acetest.com',
    created_at: daysAgo(7),
  },
  {
    id: CLIENT_IDS.sobia,
    name: 'Sobia Khan',
    phone: '03001000004',
    city: 'Peshawar',
    language: 'urdu',
    ad_source: 'direct',
    pipeline_stage: 1,
    qualification_score: 2,
    counselor_id: ANEEQA_ID,
    notes: 'Test client — sobia.test@acetest.com',
    created_at: daysAgo(2),
  },
  {
    id: CLIENT_IDS.bilal,
    name: 'Bilal Chaudhry',
    phone: '03001000005',
    city: 'Faisalabad',
    language: 'urdu',
    ad_source: 'meta_canada_2024',
    pipeline_stage: 1,
    qualification_score: 4,
    counselor_id: null,
    notes: 'Test client — bilal.test@acetest.com',
    created_at: daysAgo(1),
  },
  {
    id: CLIENT_IDS.nadia,
    name: 'Nadia Hussain',
    phone: '03001000006',
    city: 'Multan',
    language: 'urdu',
    ad_source: 'direct',
    pipeline_stage: 1,
    qualification_score: 1,
    counselor_id: null,
    notes: 'Test client — nadia.test@acetest.com',
    created_at: hoursAgo(12),
  },
]

const meetings = [
  {
    id: MEETING_IDS.zain,
    client_id: CLIENT_IDS.zain,
    counselor_id: HASHAAM_ID,
    scheduled_time: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'scheduled',
    pre_brief_sent: false,
    created_at: daysAgo(4),
  },
  {
    id: MEETING_IDS.hamza,
    client_id: CLIENT_IDS.hamza,
    counselor_id: ANEEQA_ID,
    scheduled_time: new Date(Date.now() + 1 * 86400000).toISOString(),
    status: 'scheduled',
    pre_brief_sent: false,
    created_at: daysAgo(6),
  },
  {
    id: MEETING_IDS.fareeha,
    client_id: CLIENT_IDS.fareeha,
    counselor_id: HASHAAM_ID,
    scheduled_time: daysAgo(1),
    status: 'completed',
    pre_brief_sent: true,
    created_at: daysAgo(3),
  },
]

const conversationsByClient = {
  [CLIENT_IDS.zain]: [
    ['Hello, I want to go UK', 'student', 'stage_1', 1],
    ['Lahore se hun, aap ki service ke baare mein sun-na chahta tha', 'ai', 'stage_1', 2],
    ['UK visa success rate kya hai aap ki? guarantee milti hai?', 'student', 'stage_2', 3],
    ['Success rate ka seedha jawab main baad mein dunga, pehle yeh batao ke UK mein kya karna chahte ho, padhna ya kaam karna?', 'ai', 'stage_2', 4],
    ['padhna hai. koi bhi university theek hai. budget bhi zyada nahi', 'student', 'stage_2', 5],
    ['Budget ki baat hai toh pehle yeh bata, aap ke dost ya family mein kisi ne UK apply kiya hua hai? unka roughly kitna laga tha?', 'ai', 'stage_2', 6],
    ['mere cousin ka kuch 25 lakh laga tha total', 'student', 'stage_3', 7],
    ['Theek hai. Agar 20-25 lakh ka range fit kare toh UK mein achi options hain. Ek cheez jo pehle bata deta hun, UK ke liye CAS letter ke baad 28 days ka bank statement bhi hota hai. Yeh plan mein fit karta hai?', 'ai', 'stage_3', 8],
    ['haan manage ho jata hai. PR ke chances kya hain UK mein?', 'student', 'stage_3', 9],
    ['UK mein post-study work visa 2 saal ka milta hai, uske baad skilled worker route se PR possible hai. Hamare counselor aap ka exact scenario dekh ke batayenge, free call hai koi commitment nahi. Kal subah ya dopahar?', 'ai', 'stage_4', 10],
    ['kal 11 baje theek hai', 'student', 'stage_4', 11],
    ['Theek hai, kal 11 baje ka slot book kar raha hun. Counselor confirm karenge. Koi documents pehle se tayyar rakh lain jaise degree certificate aur IELTS agar hai.', 'ai', 'auto_booking', 12],
  ],
  [CLIENT_IDS.fareeha]: [
    ['Hi I want information about studying abroad', 'student', 'stage_1', 1],
    ['Sure, which country are you interested in?', 'ai', 'stage_1', 2],
    ['I am not sure. I have heard a lot of consultancies are scams. How do I know you are real?', 'student', 'stage_2', 3],
    ['That is a completely fair thing to ask. ACE Altius has a physical office in Lahore and all our counselors are verifiable. What specifically would make you feel confident enough to have a conversation?', 'ai', 'stage_2', 4],
    ['My cousin got scammed last year. She paid 8 lakh and the consultancy disappeared. I am scared the same will happen.', 'student', 'stage_2', 5],
    ['That is a real fear and your cousin is not alone. Our service fee is paid in stages, never upfront in full. What country were you considering before all this?', 'ai', 'stage_2', 6],
    ['Canada maybe. I have a BBA and 2 years work experience', 'student', 'stage_3', 7],
    ['BBA with 2 years experience is actually a strong profile for Canada. Do you have an IELTS score or are you still preparing?', 'ai', 'stage_3', 8],
    ['No IELTS yet. I am worried I will fail', 'student', 'stage_3', 9],
    ['Most people worry about that and most people pass with the right prep. We can start with IELTS training before the visa step. What is your rough budget for the whole process?', 'ai', 'stage_3', 10],
    ['Maybe 15 lakh total but I am not sure', 'student', 'stage_3', 11],
    ['That is a workable range for Canada with IELTS prep included. A counselor can walk you through exactly what fits in that budget with no surprises. Free call, no pressure. Would morning or afternoon work?', 'ai', 'stage_4', 12],
  ],
  [CLIENT_IDS.hamza]: [
    ['Salam, Germany ke baare mein poochna tha', 'student', 'stage_1', 1],
    ['Walaikum salam. Germany ka kya plan hai, padhna hai ya kaam?', 'ai', 'stage_1', 2],
    ['Masters karna chahta hun Computer Science mein. IELTS 7.5 hai mera', 'student', 'stage_2', 3],
    ['IELTS 7.5 ke saath Germany ke top universities ke liye strong profile hai. Konsa field CS mein prefer karta hai, AI, software engineering ya aur kuch?', 'ai', 'stage_2', 4],
    ['AI aur data science. Budget ke baare mein bata do pehle', 'student', 'stage_2', 5],
    ['Depend karta hai university pe. Germany mein ek cheez hai jo pehle bata deta hun, blocked account 11,208 EUR ka hota hai jo visa ke liye bank mein show karna padta hai. Yeh aap ke budget mein fit karta hai?', 'ai', 'stage_2', 6],
    ['Han mujhe pata tha. Family ne arrange kiya hua hai. Total 30-35 lakh ka budget hai', 'student', 'stage_3', 7],
    ['30-35 lakh mein Germany ka complete package comfortable hai. TU Munich aur RWTH Aachen CS mein world class hain. Next intake June 2025 ka hai. Kitni jaldi start karna chahte hain?', 'ai', 'stage_3', 8],
    ['Jitni jaldi ho sake. Documents ready hain mere. When can I meet a counselor?', 'student', 'stage_4', 9],
    ['Kal ka slot available hai subah 10 baje. Book kar deta hun, counselor confirm kar lenge.', 'ai', 'auto_booking', 10],
  ],
  [CLIENT_IDS.sobia]: [
    ['السلام علیکم۔ بیرون ملک پڑھنے کے بارے میں معلومات چاہیے', 'student', 'stage_1', 1],
    ['وعلیکم السلام۔ کونسے ملک میں پڑھنا چاہتی ہیں؟', 'ai', 'stage_1', 2],
    ['ابھی پکا نہیں۔ والدین کو بھی منانا ہے۔ وہ فکرمند ہیں', 'student', 'stage_1', 3],
    ['یہ بہت عام بات ہے۔ والدین کی فکر سمجھ میں آتی ہے۔ ابھی کون سی پڑھائی کر رہی ہیں؟', 'ai', 'stage_1', 4],
    ['BA کر رہی ہوں انگریزی میں۔ IELTS نہیں ہے ابھی', 'student', 'stage_2', 5],
    ['IELTS کے بغیر بھی شروع ہو سکتا ہے، پہلے تیاری کرواتے ہیں۔ اگر والدین کو سمجھانا ہو تو میں مدد کر سکتا ہوں۔ گھر میں کون فیصلہ کرتے ہیں زیادہ تر؟', 'ai', 'stage_2', 6],
    ['ابو کرتے ہیں۔ وہ کہتے ہیں پہلے یہاں نوکری کرو', 'student', 'stage_2', 7],
    ['ابو کی بات بالکل سمجھ آتی ہے۔ آپ ان کو یہ بتا سکتی ہیں کہ ہمارے counselor ان سے بھی بات کر سکتے ہیں، سب کچھ سمجھائیں گے۔ کیا ابو کبھی فون پر بات کریں گے؟', 'ai', 'stage_3', 8],
  ],
  [CLIENT_IDS.bilal]: [
    ['bhai canada ka kharcha kitna hai', 'student', 'stage_1', 1],
    ['Depend karta hai goals pe. Tum roughly kya soch ke aaye ho?', 'ai', 'stage_1', 2],
    ['koi bhi university theek hai. mere dost ka 12 lakh mein ho gaya tha', 'student', 'stage_1', 3],
    ['Usne kya kya count kiya tha us mein? Aksar log pehle saal ka accommodation aur blocked account alg hota hai.', 'ai', 'stage_2', 4],
    ['nahi pata. tum kitna charge karte ho?', 'student', 'stage_2', 5],
    ['Service fee tab hoti hai jab seriously aage badhna ho. Pehle counselor se free mein baat karo. Pehle yeh bata ke Canada mein kya karna hai, padhna ya kaam?', 'ai', 'stage_2', 6],
    ['padhna hai. mechanical engineering', 'student', 'stage_2', 7],
    ['Mechanical Canada mein achi field hai post-study work ke liye. IELTS hai koi?', 'ai', 'stage_3', 8],
    ['nahi abhi tak', 'student', 'stage_3', 9],
    ['Theek hai IELTS pehla step hoga. Budget roughly kitna soch ke chal rahe ho, 15 lakh ke upar ya neeche?', 'ai', 'stage_3', 10],
  ],
  [CLIENT_IDS.nadia]: [
    ['hello', 'student', 'stage_1', 1],
    ['Salam, kaise madad kar sakta hun?', 'ai', 'stage_1', 2],
    ['sirf info chahiye thi', 'student', 'stage_1', 3],
    ['Bilkul. Kaunse mulk ke baare mein?', 'ai', 'stage_1', 4],
  ],
}

const aiProfiles = [
  {
    client_id: CLIENT_IDS.zain,
    profile_json: {
      client_summary:
        'Zain is a Lahore-based student interested in UK study but shows strong settlement intent signals. He asked about PR pathways early and accepted the blocked account disclosure without hesitation. Budget of 25 lakh confirmed.',
      qualification_score: 7,
      goal_country: 'UK',
      study_field: 'Undecided',
      budget_type: 'family',
      primary_fear: 'wrong_decision',
      behaviour_type: 'information_seeker',
      recommended_service_pathway: 'Study Visa — UK route with post-study work visa explanation',
      suggested_talking_points: [
        'Lead with post-study work visa 2-year option',
        'Mention Graduate Route visa explicitly',
        'Address settlement goal honestly — UK has a clear pathway',
      ],
      psychological_notes: [
        'Outcome-focused rather than education-focused',
        'Price-sensitive but budget confirmed at 25 lakh',
        'Settlement intent — address PR pathway honestly',
      ],
      what_to_avoid: 'Do not push specific universities too early.',
      closing_strategy: 'Assumption close works here. He agreed to the meeting time immediately.',
    },
    generated_at: daysAgo(5),
  },
  {
    client_id: CLIENT_IDS.hamza,
    profile_json: {
      client_summary:
        'Hamza is highly qualified — IELTS 7.5, CS background, Germany-specific, family funding confirmed, documents ready. This is a fast close. He asked to meet immediately.',
      qualification_score: 8,
      goal_country: 'Germany',
      study_field: 'AI/Data Science',
      budget_type: 'family',
      ielts_score: '7.5',
      primary_fear: 'timing_pressure',
      behaviour_type: 'trust_tester',
      recommended_service_pathway: 'Study Visa — Germany Masters route, TU Munich or RWTH Aachen',
      suggested_talking_points: [
        'Blocked account already known and accepted',
        'Focus on June 2025 intake timeline',
        'Mention APS certificate requirement for Pakistani students',
      ],
      psychological_notes: [
        'Ready to move — any hesitation will lose him',
        'Documents prepared — fast close candidate',
        'Timing pressure — emphasize intake deadlines',
      ],
      what_to_avoid: 'Do not slow him down. He is ready to move.',
      closing_strategy: 'He is already sold. Meeting is booked. Confirm documents checklist and timeline.',
    },
    generated_at: daysAgo(7),
  },
]

const tasks = [
  {
    id: TASK_IDS[0],
    client_id: CLIENT_IDS.zain,
    counselor_id: HASHAAM_ID,
    task_text: 'Prepare UK brief for Zain Abbas — Review AI profile and prepare talking points before meeting',
    status: 'pending',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString(),
    created_at: daysAgo(4),
  },
  {
    id: TASK_IDS[1],
    client_id: CLIENT_IDS.fareeha,
    counselor_id: HASHAAM_ID,
    task_text: 'Send IELTS resources to Fareeha — Student expressed IELTS fear. Send prep materials and book IELTS training call.',
    status: 'pending',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
    created_at: daysAgo(2),
  },
  {
    id: TASK_IDS[2],
    client_id: CLIENT_IDS.hamza,
    counselor_id: ANEEQA_ID,
    task_text: 'Verify Hamza documents before Germany meeting — Check APS certificate status. Confirm blocked account arrangement.',
    status: 'pending',
    due_date: new Date(Date.now() + 12 * 3600000).toISOString(),
    created_at: daysAgo(6),
  },
  {
    id: TASK_IDS[3],
    client_id: CLIENT_IDS.sobia,
    counselor_id: ANEEQA_ID,
    task_text: 'Follow up Sobia Khan family call — Student mentioned father is the decision maker. Offer a family consultation call.',
    status: 'pending',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    created_at: daysAgo(1),
  },
]

const documents = [
  { client_id: CLIENT_IDS.zain, document_name: 'Passport — zain_passport.pdf', status: 'verified', updated_at: daysAgo(4) },
  { client_id: CLIENT_IDS.zain, document_name: 'Degree — zain_degree.pdf', status: 'uploaded', updated_at: daysAgo(4) },
  { client_id: CLIENT_IDS.hamza, document_name: 'Passport — hamza_passport.pdf', status: 'verified', updated_at: daysAgo(6) },
  { client_id: CLIENT_IDS.hamza, document_name: 'Degree — hamza_degree.pdf', status: 'verified', updated_at: daysAgo(6) },
  { client_id: CLIENT_IDS.hamza, document_name: 'IELTS — hamza_ielts_75.pdf', status: 'verified', updated_at: daysAgo(6) },
  { client_id: CLIENT_IDS.hamza, document_name: 'Bank statement — hamza_bank.pdf', status: 'uploaded', updated_at: daysAgo(5) },
]

async function assertCounselors() {
  const { data, error } = await db
    .from('counselors')
    .select('id, name')
    .in('id', [ADMIN_ID, ANEEQA_ID, HASHAAM_ID])
  if (error) throw error
  const found = new Set(data.map((c) => c.id))
  for (const [label, id] of [
    ['Admin', ADMIN_ID],
    ['Aneeqa', ANEEQA_ID],
    ['Hashaam', HASHAAM_ID],
  ]) {
    if (!found.has(id)) throw new Error(`Missing counselor: ${label} (${id})`)
  }
  console.log('Counselors verified: Admin, Aneeqa, Hashaam')
}

async function seedClients() {
  const { error } = await db.from('clients').upsert(clients, { onConflict: 'id' })
  if (error) throw error
  console.log(`Clients: ${clients.length} upserted`)
}

async function seedMeetings() {
  const { error } = await db.from('meetings').upsert(meetings, { onConflict: 'id' })
  if (error) throw error
  console.log(`Meetings: ${meetings.length} upserted`)
}

async function seedConversations() {
  const clientIds = Object.keys(conversationsByClient)
  await db.from('conversations').delete().in('client_id', clientIds)

  const rows = []
  const baseDays = {
    [CLIENT_IDS.zain]: 5,
    [CLIENT_IDS.fareeha]: 3,
    [CLIENT_IDS.hamza]: 7,
    [CLIENT_IDS.sobia]: 2,
    [CLIENT_IDS.bilal]: 1,
    [CLIENT_IDS.nadia]: 0.5,
  }

  for (const [clientId, msgs] of Object.entries(conversationsByClient)) {
    const days = baseDays[clientId] ?? 1
    const baseMs = days * 86400000
    for (const [text, sender, stage, minute] of msgs) {
      rows.push({
        client_id: clientId,
        message_text: text,
        sender,
        stage_tag: stage,
        timestamp: new Date(Date.now() - baseMs + minute * 60000).toISOString(),
      })
    }
  }

  const { error } = await db.from('conversations').insert(rows)
  if (error) throw error
  console.log(`Conversations: ${rows.length} messages inserted`)
}

async function seedAiProfiles() {
  const { error } = await db.from('ai_profiles').upsert(aiProfiles, { onConflict: 'client_id' })
  if (error) throw error
  console.log(`AI profiles: ${aiProfiles.length} upserted`)
}

async function seedTasks() {
  const { error } = await db.from('tasks').upsert(tasks, { onConflict: 'id' })
  if (error) throw error
  console.log(`Tasks: ${tasks.length} upserted`)
}

async function seedDocuments() {
  const clientIds = [CLIENT_IDS.zain, CLIENT_IDS.hamza]
  await db.from('documents').delete().in('client_id', clientIds)
  const { error } = await db.from('documents').insert(documents)
  if (error) throw error
  console.log(`Documents: ${documents.length} inserted`)
}

async function seedNotifications() {
  const titles = [
    'Meeting tomorrow — Zain Abbas',
    'New message — Fareeha Malik',
    'Meeting tomorrow — Hamza Riaz',
    'New unassigned leads',
  ]
  await db.from('notifications').delete().in('title', titles)

  const { error } = await db.from('notifications').insert([
    {
      counselor_id: HASHAAM_ID,
      type: 'meeting_request',
      title: 'Meeting tomorrow — Zain Abbas',
      body: 'Your UK consultation with Zain Abbas is scheduled for tomorrow. AI brief is ready.',
      client_id: CLIENT_IDS.zain,
      meeting_id: MEETING_IDS.zain,
      is_read: false,
      created_at: hoursAgo(1),
    },
    {
      counselor_id: HASHAAM_ID,
      type: 'chat_message',
      title: 'New message — Fareeha Malik',
      body: 'Fareeha sent a new message about IELTS preparation.',
      client_id: CLIENT_IDS.fareeha,
      is_read: false,
      created_at: hoursAgo(2),
    },
    {
      counselor_id: ANEEQA_ID,
      type: 'meeting_request',
      title: 'Meeting tomorrow — Hamza Riaz',
      body: 'Germany consultation with Hamza Riaz is tomorrow morning. Documents checklist ready.',
      client_id: CLIENT_IDS.hamza,
      meeting_id: MEETING_IDS.hamza,
      is_read: false,
      created_at: hoursAgo(0.5),
    },
    {
      counselor_id: ADMIN_ID,
      type: 'profile_update',
      title: 'New unassigned leads',
      body: '2 new clients registered directly and are waiting for assignment.',
      is_read: false,
      created_at: hoursAgo(1),
    },
  ])
  if (error) throw error
  console.log('Notifications: 4 inserted')
}

async function seedActivityLog() {
  const clientIds = Object.values(CLIENT_IDS)
  await db
    .from('student_activity_log')
    .delete()
    .in('client_id', clientIds)
    .in('action_type', ['meeting_booked', 'ai_message_sent', 'document_uploaded', 'counselor_note'])

  const { error } = await db.from('student_activity_log').insert([
    {
      client_id: CLIENT_IDS.zain,
      counselor_id: HASHAAM_ID,
      action_type: 'meeting_booked',
      description: 'Meeting booked via AI chat for UK consultation',
      metadata: { method: 'auto_booking', time: 'tomorrow 11am' },
      created_at: offsetFrom(5, 12),
    },
    {
      client_id: CLIENT_IDS.zain,
      counselor_id: null,
      action_type: 'ai_message_sent',
      description: 'AI sent message at stage stage_4',
      metadata: { stage: 'stage_4' },
      created_at: offsetFrom(5, 10),
    },
    {
      client_id: CLIENT_IDS.hamza,
      counselor_id: ANEEQA_ID,
      action_type: 'meeting_booked',
      description: 'Meeting booked via AI chat for Germany Masters consultation',
      metadata: { method: 'auto_booking' },
      created_at: offsetFrom(7, 10),
    },
    {
      client_id: CLIENT_IDS.hamza,
      counselor_id: ANEEQA_ID,
      action_type: 'document_uploaded',
      description: 'IELTS certificate uploaded',
      metadata: { document_type: 'ielts' },
      created_at: daysAgo(6),
    },
    {
      client_id: CLIENT_IDS.fareeha,
      counselor_id: HASHAAM_ID,
      action_type: 'counselor_note',
      description:
        'Initial consultation completed. Student has IELTS fear. Recommended IELTS training first.',
      metadata: {},
      created_at: daysAgo(1),
    },
  ])
  if (error) throw error
  console.log('Activity log: 5 entries inserted')
}

async function verify() {
  const checks = [
    ['clients', Object.values(CLIENT_IDS)],
    ['meetings', Object.values(MEETING_IDS)],
    ['ai_profiles', [CLIENT_IDS.zain, CLIENT_IDS.hamza]],
  ]

  for (const [table, ids] of checks) {
    const col = table === 'ai_profiles' ? 'client_id' : 'id'
    const { data, error } = await db.from(table).select(col).in(col, ids)
    if (error) throw error
    console.log(`  ${table}: ${data.length}/${ids.length} records`)
  }

  for (const [label, counselorId, expectedNames] of [
    ['Hashaam', HASHAAM_ID, ['Zain Abbas', 'Fareeha Malik']],
    ['Aneeqa', ANEEQA_ID, ['Hamza Riaz', 'Sobia Khan']],
  ]) {
    const { data } = await db.from('clients').select('name').eq('counselor_id', counselorId).in('name', expectedNames)
    console.log(`  ${label} clients: ${(data || []).map((c) => c.name).join(', ')}`)
  }

  const { data: unassigned } = await db
    .from('clients')
    .select('name')
    .is('counselor_id', null)
    .in('name', ['Bilal Chaudhry', 'Nadia Hussain'])
  console.log(`  Unassigned pool: ${(unassigned || []).map((c) => c.name).join(', ')}`)

  const { count: convCount } = await db
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .in('client_id', Object.values(CLIENT_IDS))
  console.log(`  Conversations: ${convCount} messages across 6 clients`)
}

async function main() {
  console.log('OVERNIGHT B — seeding mock data...\n')
  await assertCounselors()
  await seedClients()
  await seedMeetings()
  await seedConversations()
  await seedAiProfiles()
  await seedTasks()
  await seedDocuments()
  await seedNotifications()
  await seedActivityLog()
  console.log('\nVerification:')
  await verify()
  console.log('\nDone. Brief URLs:')
  console.log(`  Zain:  /dashboard/brief/${MEETING_IDS.zain}`)
  console.log(`  Hamza: /dashboard/brief/${MEETING_IDS.hamza}`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
