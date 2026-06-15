'use client'

import { motion } from 'framer-motion'
import { Check, Bot, Sparkles } from 'lucide-react'

// ─── Application stages ───────────────────────────────────────────────────
type StageStatus = 'done' | 'active' | 'pending'

const stages: { label: string; sub: string; status: StageStatus }[] = [
  { label: 'Initial Consultation',  sub: 'Goals & eligibility assessed',   status: 'done'    },
  { label: 'Document Review',       sub: 'IELTS & transcripts verified',    status: 'done'    },
  { label: 'University Selection',  sub: '3 shortlisted matches found',     status: 'active'  },
  { label: 'Application Filing',    sub: 'Personal statement pending',       status: 'pending' },
  { label: 'Visa Processing',       sub: 'Awaiting application outcome',     status: 'pending' },
  { label: 'Departure Ready',       sub: 'Travel pack & pre-departure brief',status: 'pending' },
]

// ─── Mock chat messages ───────────────────────────────────────────────────
const messages = [
  {
    id: 1,
    sender: 'ai' as const,
    text: 'Hi Ahmad! I\'ve analysed your profile — 7.0 IELTS, 3.4 GPA. You qualify for 12 UK universities. Ready to shortlist?',
  },
  {
    id: 2,
    sender: 'student' as const,
    text: 'Yes! Which ones suit Computer Science best?',
  },
  {
    id: 3,
    sender: 'ai' as const,
    text: '🇬🇧 Top picks: Leeds (strong match), Manchester (reach), Coventry (safe). Want me to start your Leeds personal statement now?',
  },
  {
    id: 4,
    sender: 'student' as const,
    text: 'Please! How long does the whole process take?',
  },
  {
    id: 5,
    sender: 'ai' as const,
    text: 'For Sept 2025 intake we have ~8 weeks. I\'ll draft Leeds today. What\'s your preferred focus — AI, web dev, or systems?',
  },
]

// ─── Stage dot ───────────────────────────────────────────────────────────
function StageDot({ status }: { status: StageStatus }) {
  if (status === 'done') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grad-green crisp-on-dark">
        <Check className="h-3.5 w-3.5 text-text" strokeWidth={2.5} />
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-orange/40" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-grad-orange crisp-on-dark">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      </span>
    )
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-bg/20 bg-white/5">
      <span className="h-1.5 w-1.5 rounded-full bg-bg/30" />
    </span>
  )
}

// ─── Vertical flowchart ───────────────────────────────────────────────────
function StageFlowchart() {
  return (
    <div className="flex flex-col gap-0">
      {stages.map((stage, i) => (
        <motion.div
          key={stage.label}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.10, ease: 'easeOut' }}
          className="flex items-stretch gap-3"
        >
          {/* Left: dot + connector line */}
          <div className="flex flex-col items-center">
            <StageDot status={stage.status} />
            {i < stages.length - 1 && (
              <div
                className="mt-1 w-px flex-1"
                style={{
                  background:
                    stage.status === 'done'
                      ? 'linear-gradient(to bottom, rgba(183,199,51,0.6), rgba(183,199,51,0.15))'
                      : 'rgba(230,232,231,0.12)',
                  minHeight: 28,
                }}
              />
            )}
          </div>

          {/* Right: label + sublabel badge */}
          <div className="pb-6 pt-0.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                stage.status === 'done'
                  ? 'bg-green/20 text-green'
                  : stage.status === 'active'
                    ? 'bg-orange/20 text-orange'
                    : 'bg-white/8 text-bg/40'
              }`}
            >
              {stage.status === 'active' && (
                <Sparkles className="h-3 w-3 shrink-0" />
              )}
              {stage.label}
            </span>
            <p className={`mt-1 text-[11px] leading-snug ${stage.status === 'pending' ? 'text-bg/30' : 'text-bg/55'}`}>
              {stage.sub}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Horizontal badge strip (mobile only) ─────────────────────────────────
function StageBadgeStrip() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((stage) => (
        <span
          key={stage.label}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
            stage.status === 'done'
              ? 'bg-green/20 text-green'
              : stage.status === 'active'
                ? 'bg-orange/20 text-orange'
                : 'bg-white/8 text-bg/35'
          }`}
        >
          {stage.status === 'done' && <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} />}
          {stage.status === 'active' && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-orange" />}
          {stage.label}
        </span>
      ))}
    </div>
  )
}

// ─── Chat bubble ──────────────────────────────────────────────────────────
function Bubble({ msg, index }: { msg: typeof messages[0]; index: number }) {
  const isAi = msg.sender === 'ai'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.12, ease: 'easeOut' }}
      className={`flex items-end gap-2 ${isAi ? 'justify-start' : 'justify-end'}`}
    >
      {isAi && (
        <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grad-blue crisp-on-dark">
          <Bot className="h-3.5 w-3.5 text-white" />
        </span>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
          isAi
            ? 'bg-grad-blue crisp-on-dark text-white'
            : 'bg-grad-green crisp-on-dark text-text'
        }`}
      >
        {msg.text}
      </div>
    </motion.div>
  )
}

// ─── Chat window inner content ────────────────────────────────────────────
function ChatContent() {
  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/5 px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grad-blue crisp-on-dark">
          <Bot className="h-4 w-4 text-white" />
        </span>
        <div>
          <p className="text-[12px] font-semibold text-bg">ACE AI Counselor</p>
          <p className="text-[10px] text-green">● Online now</p>
        </div>
        <span className="ml-auto rounded-full bg-grad-orange crisp-on-dark px-2.5 py-0.5 text-[10px] font-semibold text-white">
          Ahmad · Lahore
        </span>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <Bubble key={msg.id} msg={msg} index={i} />
        ))}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-3.5 py-2">
          <span className="flex-1 text-[11.5px] text-bg/35">Ask anything about your application…</span>
        </div>
        <button
          type="button"
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grad-green crisp-on-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Desktop browser frame ────────────────────────────────────────────────
function BrowserFrame() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
      className="hidden md:block"
    >
      {/* Outer chrome frame */}
      <div
        className="w-full overflow-hidden rounded-[18px]"
        style={{
          boxShadow: '0 0 0 1.5px rgba(255,255,255,0.12), 0 32px 80px rgba(0,0,0,0.55)',
          background: 'rgba(10,63,58,0.6)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Browser chrome bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #ff6b6b, #e53e3e)' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #ffd93d, #f6a623)' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #6bcb77, #38a169)' }} />
          </div>
          {/* Address bar */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-md bg-white/8 px-3 py-1">
              <span className="text-[10px] text-green">🔒</span>
              <span className="text-[10px] text-bg/50">acevisa.com</span>
              <span className="text-[10px] text-bg/30">/chat</span>
            </div>
          </div>
          <div className="w-16" />
        </div>

        {/* Chat content */}
        <div style={{ height: 380 }}>
          <ChatContent />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Mobile phone frame ───────────────────────────────────────────────────
function PhoneFrame() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
      className="mx-auto md:hidden"
      style={{ maxWidth: 340 }}
    >
      {/* Phone shell */}
      <div
        className="relative overflow-hidden rounded-[36px]"
        style={{
          boxShadow:
            '0 0 0 2px rgba(255,255,255,0.14), 0 0 0 7px rgba(10,63,58,0.8), 0 0 0 8.5px rgba(255,255,255,0.08), 0 28px 70px rgba(0,0,0,0.55)',
          background: 'rgba(10,63,58,0.65)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Notch */}
        <div className="relative flex items-center justify-center py-2.5">
          <div className="h-[18px] w-[100px] rounded-full bg-black/60" />
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pb-1 text-[10px] text-bg/50">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span>●●●●</span>
            <span>WiFi</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Chat content — shorter on small phones */}
        <div style={{ height: 'clamp(300px, 50vh, 400px)' }}>
          <ChatContent />
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-2.5">
          <div className="h-1 w-24 rounded-full bg-bg/25" />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────
export function AIChatSection() {
  return (
    <div className="bg-grad-teal flex h-full flex-col justify-center overflow-y-auto px-4 py-8 md:px-10 md:py-16">
      <div className="mx-auto w-full max-w-5xl">

        {/* Eyebrow + heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-5 text-center md:mb-10"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-orange">
            AI-powered guidance
          </p>
          <h2 className="text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight text-bg lowercase">
            your counselor
            <br />
            never sleeps
          </h2>
          <p className="mx-auto mt-3 max-w-md text-xs text-bg/60 md:mt-4 md:text-sm">
            Get instant answers, track every stage of your application, and chat in Urdu or English — any time.
          </p>
        </motion.div>

        {/* Mobile badge strip */}
        <div className="mb-6 md:hidden">
          <StageBadgeStrip />
        </div>

        {/* Main grid: flowchart | chat frame */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr] md:items-center md:gap-10 lg:grid-cols-[260px_1fr]">

          {/* Left: vertical flowchart — desktop only */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="hidden md:block"
          >
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-bg/40">
              Ahmad's progress
            </p>
            <StageFlowchart />
          </motion.div>

          {/* Right: device frame */}
          <div>
            <BrowserFrame />
            <PhoneFrame />
          </div>
        </div>
      </div>
    </div>
  )
}
