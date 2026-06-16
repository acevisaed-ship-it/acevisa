'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion'

// ─── Asset sources ────────────────────────────────────────────────────────
const CLOUD_SRCS = [
  '/cloud.svg',
  '/Cloud Long.svg',
  '/Big cloud with straight base.svg',
  '/Cloud with many arcs.svg',
]
const STAR_SRCS  = ['/Orange Star.svg', '/Blue Star.svg', '/Green star.svg']
// Commercial jets — index 0 = orange (plane A), index 1 = blue (plane B)
const PLANE_SRCS = ['/Orange plane.svg', '/Blue plane.svg', '/Green Plane.svg']

// Paper planes — coloured variants only (plane.svg reserved for page transitions)
const PAPER_SRCS = [
  '/paper airplane.svg',
  '/paper plane Orange 2.svg',
  '/paper Plane Blue 2.svg',
  '/paper plane Green 2.svg',
  '/paper plane blue 1.svg',
  '/paper plane Green.svg',
]

// ─── Client-side random helpers ───────────────────────────────────────────
const rn   = (min: number, max: number) => Math.random() * (max - min) + min
const ri   = (min: number, max: number) => Math.floor(rn(min, max + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// ─── Angle helper ────────────────────────────────────────────────────────
// Returns the tilt angle (degrees) for a plane SVG that faces RIGHT by default.
// flipX must be applied separately when travelling left.
// In Framer Motion: rotate() runs BEFORE scaleX() in the CSS transform chain,
// so with scaleX(-1), rotate(θ) produces a visual heading of 180° − θ.
// ↓ Therefore for right→left planes: angle = atan2(dy, |dx|)  (tilt only)
// ↓ For left→right planes:           angle = atan2(dy,  dx)   (full heading)
function planeAngle(dx: number, dy: number, fromRight: boolean): number {
  if (fromRight) {
    return Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI
  }
  return Math.atan2(dy, dx) * 180 / Math.PI
}

// ════════════════════════════════════════════════════════════════════════════
// 0. STAR FIELD
//    8 stars total; staggered so 5–7 are visible at once.
//    Each fades in → pulses (scale 1→3→1) → fades out → 2 s dark gap → repeat.
// ════════════════════════════════════════════════════════════════════════════

interface StarData {
  id:         number
  xPct:       number
  yPct:       number
  size:       number
  src:        string
  maxOpacity: number
  visibleDur: number  // 10–14 s
  pulseDur:   number  // 7.5–20 s  (5× slower than original 1.5–4 s)
  delay:      number
}

function Star({ s }: { s: StarData }) {
  return (
    // Outer — controls the appear/disappear cycle
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, translateX: '-50%', translateY: '-50%' }}
      animate={{ opacity: [0, s.maxOpacity, s.maxOpacity, 0] }}
      transition={{
        duration:    s.visibleDur,
        delay:       s.delay,
        repeat:      Infinity,
        repeatDelay: 2,
        times:       [0, 0.08, 0.92, 1],
        ease:        'easeInOut',
      }}
    >
      {/* Inner — continuous scale pulse */}
      <motion.img
        src={s.src}
        alt=""
        aria-hidden
        style={{ width: s.size, height: s.size, display: 'block' }}
        animate={{ scale: [1, 3, 1] }}
        transition={{ duration: s.pulseDur, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

function StarField({ isMobile }: { isMobile?: boolean }) {
  const [stars, setStars] = useState<StarData[]>([])

  useEffect(() => {
    const CYCLE = 14   // visible (~12 s) + dark (2 s)
    const count = isMobile ? 4 : 8
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id:         i,
        xPct:       rn(4, 94),
        // On mobile: only top 45% of screen gets stars (lower half stays clean)
        yPct:       rn(4, isMobile ? 45 : 94),
        size:       rn(8, isMobile ? 18 : 28),
        src:        pick(STAR_SRCS),
        maxOpacity: rn(0.45, 0.75),
        visibleDur: rn(10, 14),
        pulseDur:   rn(7.5, 20),
        delay:      (i / count) * CYCLE,
      }))
    )
  }, [isMobile])

  return <>{stars.map(s => <Star key={s.id} s={s} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// 1. CLOUD LAYER
//    Right → left only. Spawn in top 5–50 % band. All 4 cloud types.
//    Full opacity. Four formation types: spread | merged | stacked | cluster.
// ════════════════════════════════════════════════════════════════════════════

type CloudFormation = 'spread' | 'merged' | 'stacked' | 'cluster'

interface CloudDot {
  src:    string
  size:   number
  x:      number   // absolute offset within the group container
  y:      number
  zIdx:   number
}

interface CloudGroupData {
  id:          number
  topPct:      number
  speed:       number
  delay:       number
  repeatDelay: number
  formation:   CloudFormation
  cW:          number   // container width
  cH:          number   // container height
  dots:        CloudDot[]
  easeType:    string          // 'linear' | 'easeOut' | 'easeInOut'
  slowFrac:    number | null   // 0.35–0.75 = pause near ACE zone, null = no pause
}

function buildFormation(formation: CloudFormation, count: number): { dots: CloudDot[]; cW: number; cH: number } {
  const dots: CloudDot[] = []

  if (formation === 'spread') {
    // Side-by-side with moderate overlap and slight vertical wobble
    let cursor = 0
    for (let j = 0; j < count; j++) {
      const size = rn(110, 230)
      dots.push({ src: pick(CLOUD_SRCS), size, x: cursor, y: rn(-15, 20), zIdx: j })
      cursor += size * rn(0.55, 0.82)   // partial overlap
    }
    return { dots, cW: cursor + 240, cH: 180 }
  }

  if (formation === 'merged') {
    // Heavy overlap — clouds blend into one mass
    for (let j = 0; j < count; j++) {
      const size = rn(130, 260)
      dots.push({ src: pick(CLOUD_SRCS), size, x: rn(0, 70), y: rn(-10, 10), zIdx: j })
    }
    return { dots, cW: 360, cH: 180 }
  }

  if (formation === 'stacked') {
    // Clouds piled on top of each other vertically (tower / cumulus look)
    for (let j = 0; j < count; j++) {
      const size = rn(100, 210)
      dots.push({
        src: pick(CLOUD_SRCS), size,
        x: rn(-20, 50),
        y: j * rn(28, 48),   // each layer above the last
        zIdx: count - j,      // higher layers paint over lower
      })
    }
    return { dots, cW: 320, cH: count * 55 + 120 }
  }

  // cluster — scattered arrangement in a loose blob
  for (let j = 0; j < count; j++) {
    const size = rn(90, 210)
    dots.push({
      src: pick(CLOUD_SRCS), size,
      x: rn(0, 220),
      y: rn(-30, 60),
      zIdx: j,
    })
  }
  return { dots, cW: 460, cH: 230 }
}

function CloudGroup({ g, vw }: { g: CloudGroupData; vw: number }) {
  const buf   = g.cW + 120
  const startX = vw + buf
  const endX   = -buf

  // Keyframe & timing arrays for variable-speed clouds
  const xFrames = g.slowFrac !== null
    ? [startX, startX + (endX - startX) * g.slowFrac, endX]
    : [startX, endX]

  // When a slow-zone is present, spend proportionally more time there
  // (ACE logo is ~20–50% from left → cloud reaches it 50–80% through journey)
  const timesArr = g.slowFrac !== null
    ? [0, Math.min(g.slowFrac * 0.70 + 0.10, 0.88), 1]
    : [0, 1]

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ top: `${g.topPct}%`, left: 0, width: g.cW, height: g.cH }}
      animate={{ x: xFrames }}
      transition={{
        duration:    g.speed,
        delay:       g.delay,
        repeat:      Infinity,
        repeatDelay: g.repeatDelay,
        ease:        g.slowFrac !== null ? ['linear', 'easeInOut'] : (g.easeType as 'linear' | 'easeOut' | 'easeInOut'),
        times:       timesArr,
      }}
    >
      {g.dots.map((d, i) => (
        <img
          key={i}
          src={d.src}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            left:     d.x,
            top:      d.y,
            width:    d.size,
            zIndex:   d.zIdx,
            opacity:  1,        // full opacity — no transparency
          }}
        />
      ))}
    </motion.div>
  )
}

function CloudLayer({ vw }: { vw: number }) {
  const [groups, setGroups] = useState<CloudGroupData[]>([])

  useEffect(() => {
    const FORMATIONS: CloudFormation[] = ['spread', 'merged', 'stacked', 'cluster']
    setGroups(
      Array.from({ length: ri(5, 8) }, (_, i) => {
        const formation = FORMATIONS[i % FORMATIONS.length] as CloudFormation  // ensure all 4 types appear
        const count     = formation === 'merged' ? ri(3, 5) : ri(2, 4)
        const { dots, cW, cH } = buildFormation(formation, count)
        const easeOptions = ['linear', 'linear', 'easeOut', 'easeInOut']
        return {
          id: i, formation, dots, cW, cH,
          topPct:      rn(0, 8),                              // higher up in sky
          speed:       rn(55, 280),                           // wide range: some very slow
          delay:       rn(0, 40),
          repeatDelay: rn(4, 20),
          easeType:    easeOptions[Math.floor(Math.random() * easeOptions.length)],
          slowFrac:    Math.random() < 0.40 ? rn(0.40, 0.72) : null,  // 40% get slow zone
        }
      })
    )
  }, [])

  return <>{groups.map(g => <CloudGroup key={g.id} g={g} vw={vw} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// 2. FREE-ROAMING PAPER PLANES (directed)
//    From right → diagonally toward logo (top-left).
//    From left  → diagonally toward Earth (right-centre).
//    2–3 planes; 2 s gap between appearances.
// ════════════════════════════════════════════════════════════════════════════

interface DirPlaneData {
  id:     number
  startX: number
  startY: number
  endX:   number
  endY:   number
  angle:  number
  flipX:  boolean
  dur:    number
  delay:  number
  size:   number
  src:    string
}

function DirPaperPlane({ p }: { p: DirPlaneData }) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left:       0,
        top:        0,
        width:      p.size,
        rotate:     p.angle,
        scaleX:     p.flipX ? -1 : 1,
        willChange: 'transform',
      }}
      initial={{ x: p.startX, y: p.startY, opacity: 0 }}
      animate={{ x: p.endX,   y: p.endY,   opacity: [0, 1, 1, 0] }}
      transition={{
        x:       { duration: p.dur, ease: 'linear' },
        y:       { duration: p.dur, ease: 'linear' },
        opacity: { duration: p.dur, ease: 'easeInOut', times: [0, 0.05, 0.95, 1] },
        delay:       p.delay,
        repeat:      Infinity,
        repeatDelay: 2,
      }}
    >
      <img src={p.src} alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

function FreeRoamingPaperPlanes({ vw, vh, isMobile }: { vw: number; vh: number; isMobile?: boolean }) {
  const [planes, setPlanes] = useState<DirPlaneData[]>([])

  useEffect(() => {
    if (!vw || !vh) return

    // Approximate targets
    const LOGO_X  = 120,       LOGO_Y  = 60
    const EARTH_X = vw * 0.85, EARTH_Y = vh * 0.5

    const count  = ri(2, 3)
    const result: DirPlaneData[] = []

    for (let i = 0; i < count; i++) {
      const fromRight = i % 2 === 0   // alternate directions for variety

      let sX: number, sY: number, eX: number, eY: number

      if (fromRight) {
        sX = vw + 100
        sY = rn(vh * 0.2, vh * 0.65)
        // Project straight past the logo all the way to off-screen left
        const ratio = (sX + 150) / (sX - LOGO_X)
        eX = -150
        eY = sY - (sY - LOGO_Y) * ratio
      } else {
        sX = -100
        sY = rn(vh * 0.1, vh * 0.60)
        // Extend path past Earth to off-screen right
        const ratio = (vw + 150 - sX) / (EARTH_X - sX)
        eX = vw + 150
        eY = sY + (EARTH_Y - sY) * ratio
      }

      const dx  = eX - sX
      const dy  = eY - sY

      result.push({
        id:     i,
        startX: sX, startY: sY,
        endX:   eX, endY:   eY,
        angle:  planeAngle(dx, dy, fromRight),
        flipX:  fromRight,
        dur:    rn(30, 70),
        delay:  i * rn(5, 12),
        size:   isMobile ? rn(16, 28) : rn(28, 55),
        src:    pick(PAPER_SRCS),
      })
    }
    setPlanes(result)
  }, [vw, vh])

  return <>{planes.map(p => <DirPaperPlane key={p.id} p={p} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// 2b. BEE ORANGE PLANE
//     One orange paper plane that drifts left→right with erratic, bee-like
//     Y movement driven by three overlapping sine waves at different
//     frequencies. Rotates to face its instantaneous velocity vector.
//     Loops continuously; randomises path on each crossing.
// ════════════════════════════════════════════════════════════════════════════

function BeeOrangePlane({ vw, vh, isMobile }: { vw: number; vh: number; isMobile?: boolean }) {
  const mx  = useMotionValue(-80)
  const my  = useMotionValue(0)
  const rot = useMotionValue(0)
  const t0  = useRef<number | null>(null)
  const [ready, setReady] = useState(false)

  // All mutable crossing params live here — updated on each loop
  const p = useRef({
    speedX: 70,
    baseY:  300,
    a1: 80,  f1: 0.45, ph1: 0,
    a2: 35,  f2: 1.40, ph2: 1,
    a3: 14,  f3: 3.10, ph3: 2,
    cycleStart: 0,
  })

  const randomise = (currentVh: number) => {
    const pr = p.current
    pr.speedX = rn(55, 100)
    pr.baseY  = currentVh * rn(0.20, 0.72)
    pr.a1  = rn(55, 120);  pr.f1  = rn(0.25, 0.70);  pr.ph1 = rn(0, Math.PI * 2)
    pr.a2  = rn(22, 58);   pr.f2  = rn(1.00, 2.30);  pr.ph2 = rn(0, Math.PI * 2)
    pr.a3  = rn(8,  24);   pr.f3  = rn(2.50, 4.60);  pr.ph3 = rn(0, Math.PI * 2)
  }

  useEffect(() => {
    if (!vw || !vh) return
    randomise(vh)
    setReady(true)
  }, [vw, vh])

  useAnimationFrame((t) => {
    if (!ready) return
    if (t0.current === null) t0.current = t
    const elapsed = (t - t0.current) / 1000
    const pr      = p.current
    const cyc     = elapsed - pr.cycleStart

    // When the plane exits the right edge, restart from left with new params
    const rawX = -80 + cyc * pr.speedX
    if (rawX > vw + 80) {
      pr.cycleStart = elapsed
      randomise(vh)
      return
    }

    const yOff = (e: number) =>
      pr.a1 * Math.sin(pr.f1 * e + pr.ph1) +
      pr.a2 * Math.sin(pr.f2 * e + pr.ph2) +
      pr.a3 * Math.sin(pr.f3 * e + pr.ph3)

    const clampY = (v: number) => Math.max(40, Math.min(vh - 80, v))

    const x  = rawX
    const y  = clampY(pr.baseY + yOff(cyc))
    const dt = 0.05   // small lookahead for angle
    const nx = x + pr.speedX * dt
    const ny = clampY(pr.baseY + yOff(cyc + dt))

    mx.set(x)
    my.set(y)
    rot.set(Math.atan2(ny - y, nx - x) * 180 / Math.PI)
  })

  if (!ready) return null

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: 0, top: 0,
        width: isMobile ? 28 : 46,
        x: mx, y: my, rotate: rot,
        translateX: '-50%', translateY: '-50%',
        willChange: 'transform',
      }}
    >
      <img src="/paper plane Orange 2.svg" alt="" aria-hidden className="h-auto w-full" />
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 2c. BEE BLUE PLANE
//     Blue paper plane with wide X-axis travel, occasional direction reversal,
//     and gravity coupling: faster when going down on Y, slower going up.
// ════════════════════════════════════════════════════════════════════════════

function BeeBluePlane({ vw, vh, isMobile }: { vw: number; vh: number; isMobile?: boolean }) {
  const mx  = useMotionValue(-80)
  const my  = useMotionValue(0)
  const rot = useMotionValue(0)
  const t0  = useRef<number | null>(null)
  const prevT = useRef<number>(0)
  const [ready, setReady] = useState(false)

  const s = useRef({
    x: -80, y: 0,
    baseVx: 80,
    // X oscillation — large amplitude, very low frequency → occasional reversals
    ax1: 0.85, fx1: 0,   // fraction of baseVx; can push vx negative briefly
    ax2: 0.40, fx2: 0,
    phx1: 0,  phx2: 0,
    // Y sine waves (bee motion)
    ay1: 0, fy1: 0, phy1: 0,
    ay2: 0, fy2: 0, phy2: 0,
    ay3: 0, fy3: 0, phy3: 0,
    baseY: 0,
    gravK: 0,    // gravity coupling strength
    cycleStart: 0,
  })

  const randomise = (cVw: number, cVh: number) => {
    const p = s.current
    p.x       = -80
    p.baseVx  = rn(55, 110)
    // X modulation amplitudes — sum can exceed 1 for brief reversals
    p.ax1 = rn(0.60, 0.95); p.fx1 = rn(0.020, 0.055); p.phx1 = rn(0, Math.PI * 2)
    p.ax2 = rn(0.25, 0.55); p.fx2 = rn(0.005, 0.020); p.phx2 = rn(0, Math.PI * 2)
    // Y bee waves
    p.ay1 = rn(50, 110); p.fy1 = rn(0.22, 0.60); p.phy1 = rn(0, Math.PI * 2)
    p.ay2 = rn(25, 55);  p.fy2 = rn(0.90, 2.00); p.phy2 = rn(0, Math.PI * 2)
    p.ay3 = rn(8,  22);  p.fy3 = rn(2.00, 4.00); p.phy3 = rn(0, Math.PI * 2)
    p.baseY  = cVh * rn(0.18, 0.72)
    p.gravK  = rn(0.8, 2.2)   // higher = stronger gravity coupling
    p.cycleStart = 0
  }

  useEffect(() => {
    if (!vw || !vh) return
    randomise(vw, vh)
    setReady(true)
  }, [vw, vh])

  useAnimationFrame((t) => {
    if (!ready) return
    if (t0.current === null) { t0.current = t; prevT.current = t }
    const dt      = Math.min((t - prevT.current) / 1000, 0.05)
    prevT.current = t
    const elapsed = (t - t0.current) / 1000
    const p       = s.current

    // ── X velocity with slow oscillation — sum > 1 triggers brief reversal ──
    const xMod  = p.ax1 * Math.sin(p.fx1 * Math.PI * 2 * elapsed + p.phx1)
                + p.ax2 * Math.sin(p.fx2 * Math.PI * 2 * elapsed + p.phx2)
    const vxBase = p.baseVx * (1 + xMod)   // can go negative briefly

    // ── Y position via three sine waves ─────────────────────────────────────
    const yOff = (e: number) =>
      p.ay1 * Math.sin(p.fy1 * e + p.phy1) +
      p.ay2 * Math.sin(p.fy2 * e + p.phy2) +
      p.ay3 * Math.sin(p.fy3 * e + p.phy3)

    const clampY = (v: number) => Math.max(30, Math.min(vh - 60, v))

    const curY  = clampY(p.baseY + yOff(elapsed))
    const nextY = clampY(p.baseY + yOff(elapsed + 0.05))
    const dy    = nextY - curY   // positive = moving down

    // ── Gravity coupling: faster X when descending, slower when climbing ─────
    // Normalise dy by a rough amplitude scale (~50 px) then multiply coupling
    const gravBoost = 1 + p.gravK * (dy / 55)
    const vx = vxBase * Math.max(0.08, gravBoost)   // floor at 8% so it doesn't freeze

    p.x += vx * dt

    // Reset when exits right side (or if somehow drifts very far left)
    if (p.x > vw + 120 || p.x < -300) {
      randomise(vw, vh)
      p.x = -80
    }

    const x  = p.x
    const y  = curY
    const nx = x + vx * 0.05
    const ny = nextY

    mx.set(x)
    my.set(y)
    rot.set(Math.atan2(ny - y, nx - x) * 180 / Math.PI)
  })

  if (!ready) return null

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: 0, top: 0,
        width: isMobile ? 26 : 42,
        x: mx, y: my, rotate: rot,
        translateX: '-50%', translateY: '-50%',
        willChange: 'transform',
      }}
    >
      <img src="/paper Plane Blue 2.svg" alt="" aria-hidden className="h-auto w-full" />
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 3. LARGE COMMERCIAL PLANES (exactly 2, directed)
//    Plane A: right → toward logo (top-left) → exits left.
//    Plane B: left  → toward Earth (right-centre) → exits right.
//    2 s gap between passes. 80–140 s crossing time.
// ════════════════════════════════════════════════════════════════════════════

interface APlaneData {
  id:      number
  startX:  number
  startY:  number
  endX:    number
  endY:    number
  angle:   number
  flipX:   boolean
  speed:   number
  delay:   number
  size:    number
  src:     string
  opacity: number
}

function LargeAirplane({ p }: { p: APlaneData }) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: 0, top: 0, width: p.size,
        rotate: p.angle, scaleX: p.flipX ? -1 : 1,
        opacity: p.opacity, willChange: 'transform',
      }}
      initial={{ x: p.startX, y: p.startY }}
      animate={{ x: p.endX,   y: p.endY }}
      transition={{
        duration: p.speed, delay: p.delay,
        repeat: Infinity, repeatDelay: 2, ease: 'linear',
      }}
    >
      <img src={p.src} alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

function AirplaneLayer({ vw, vh, isMobile }: { vw: number; vh: number; isMobile?: boolean }) {
  const [planes, setPlanes] = useState<APlaneData[]>([])

  useEffect(() => {
    if (!vw || !vh) return

    const LOGO_X  = 120,       LOGO_Y  = 60
    const EARTH_X = vw * 0.85, EARTH_Y = vh * 0.5

    // Plane A — from right, heading toward logo
    const aStartX = vw + 130
    const aStartY = rn(vh * 0.25, vh * 0.55)
    const aRatio  = (aStartX + 160) / (aStartX - LOGO_X)
    const aEndX   = -160
    const aEndY   = aStartY - (aStartY - LOGO_Y) * aRatio
    const aDx     = aEndX - aStartX
    const aDy     = aEndY - aStartY

    // Plane B — from left, heading toward Earth
    const bStartX = -130
    const bStartY = rn(vh * 0.15, vh * 0.60)
    const bRatio  = (vw + 160 - bStartX) / (EARTH_X - bStartX)
    const bEndX   = vw + 160
    const bEndY   = bStartY + (EARTH_Y - bStartY) * bRatio
    const bDx     = bEndX - bStartX
    const bDy     = bEndY - bStartY

    setPlanes([
      {
        id: 0, startX: aStartX, startY: aStartY, endX: aEndX, endY: aEndY,
        angle: planeAngle(aDx, aDy, true), flipX: true,
        speed: rn(80, 140), delay: 0,
        size: isMobile ? rn(55, 85) : rn(100, 170), src: PLANE_SRCS[0], opacity: isMobile ? 0.7 : 1,
      },
      {
        id: 1, startX: bStartX, startY: bStartY, endX: bEndX, endY: bEndY,
        angle: planeAngle(bDx, bDy, false), flipX: false,
        speed: rn(90, 150), delay: rn(10, 30),
        size: isMobile ? rn(55, 85) : rn(100, 170), src: PLANE_SRCS[1], opacity: isMobile ? 0.7 : 1,
      },
    ])
  }, [vw, vh])

  return <>{planes.map(p => <LargeAirplane key={p.id} p={p} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION-LEVEL EXPORTS
// Self-contained drop-in components for other landing sections.
// Each measures its own viewport so no vw/vh prop is needed from the parent.
// ════════════════════════════════════════════════════════════════════════════

function useViewport() {
  const [vw, setVw] = useState(0)
  const [vh, setVh] = useState(0)
  useEffect(() => {
    const up = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    up()
    window.addEventListener('resize', up)
    return () => window.removeEventListener('resize', up)
  }, [])
  return { vw, vh }
}

/** Orange paper-plane bee: same 60fps physics as the Hero page. */
export function SectionBeeOrangePlane() {
  const { vw, vh } = useViewport()
  if (!vw) return null
  return <BeeOrangePlane vw={vw} vh={vh} />
}

/** Orange commercial plane flying right → left toward the ACE logo (top-left).
 *  Framer Motion directed flight — matches Hero AirplaneLayer Plane A. */
export function SectionOrangePlaneToLogo() {
  const { vw, vh } = useViewport()
  if (!vw || !vh) return null

  const LOGO_X = 120, LOGO_Y = 60
  const startX = vw + 130
  const startY = vh * 0.30
  const ratio  = (startX + 160) / (startX - LOGO_X)
  const endX   = -160
  const endY   = startY - (startY - LOGO_Y) * ratio
  const angle  = planeAngle(endX - startX, endY - startY, true)

  return (
    <motion.div
      className="pointer-events-none absolute hidden md:block"
      style={{ left: 0, top: 0, width: 120, rotate: angle, scaleX: -1, opacity: 0.9, willChange: 'transform' }}
      initial={{ x: startX, y: startY }}
      animate={{ x: endX,   y: endY }}
      transition={{ duration: 90, repeat: Infinity, repeatDelay: 5, ease: 'linear' }}
    >
      <img src="/Orange plane.svg" alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

/** Green commercial plane flying right → left toward the ACE logo (top-left).
 *  Framer Motion directed flight — matches Hero AirplaneLayer but green. */
export function SectionGreenPlaneToLogo() {
  const { vw, vh } = useViewport()
  if (!vw || !vh) return null

  const LOGO_X = 120, LOGO_Y = 60
  const startX = vw + 130
  const startY = vh * 0.18
  const ratio  = (startX + 160) / (startX - LOGO_X)
  const endX   = -160
  const endY   = startY - (startY - LOGO_Y) * ratio
  const angle  = planeAngle(endX - startX, endY - startY, true)

  return (
    <motion.div
      className="pointer-events-none absolute hidden md:block"
      style={{ left: 0, top: 0, width: 100, rotate: angle, scaleX: -1, opacity: 0.9, willChange: 'transform' }}
      initial={{ x: startX, y: startY }}
      animate={{ x: endX,   y: endY }}
      transition={{ duration: 110, repeat: Infinity, repeatDelay: 8, ease: 'linear', delay: 2 }}
    >
      <img src="/Green Plane.svg" alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// Z-stack (bottom → top):
//   gradient + stars (z-1) → airplanes (z-2) → clouds (z-3)
//   → decorative SVGs (z-4) → free paper planes (z-5) → UI (z-10)
// ════════════════════════════════════════════════════════════════════════════

export function HeroAnimations() {
  const [vw, setVw] = useState(0)
  const [vh, setVh] = useState(0)

  useEffect(() => {
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!vw) return null

  const isMobile = vw < 768

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

      {/* Background gradient */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 65% 50%, rgba(32,131,185,0.06) 0%, transparent 70%),' +
            'radial-gradient(ellipse 50% 70% at 10% 80%, rgba(10,63,58,0.05) 0%, transparent 60%)',
        }}
      />

      {/* z-1 Stars — behind every other element; mobile: top 45% only */}
      <div className="absolute inset-0 z-[1]">
        <StarField isMobile={isMobile} />
      </div>

      {/* z-2 Large commercial planes — smaller on mobile */}
      <div className="absolute inset-0 z-[2]">
        <AirplaneLayer vw={vw} vh={vh} isMobile={isMobile} />
      </div>

      {/* z-3 Clouds — upper band only, right-to-left */}
      <div className="absolute inset-0 z-[3]">
        <CloudLayer vw={vw} />
      </div>

      {/* z-4 Globe on stand — decorative, bottom-left */}
      <div
        className="absolute bottom-[5%] left-[1%] z-[4] hidden md:block"
        style={{ animation: 'float-bob 14s ease-in-out infinite' }}
      >
        <img src="/Globe on stand.svg" alt="" aria-hidden
             className="landing-decor-globe-sm" style={{ opacity: 0.13 }} />
      </div>

      {/* z-5 Free-roaming directed paper planes — smaller on mobile */}
      <div className="absolute inset-0 z-[5]">
        <FreeRoamingPaperPlanes vw={vw} vh={vh} isMobile={isMobile} />
        <BeeOrangePlane vw={vw} vh={vh} isMobile={isMobile} />
        <BeeBluePlane vw={vw} vh={vh} isMobile={isMobile} />
      </div>
    </div>
  )
}
