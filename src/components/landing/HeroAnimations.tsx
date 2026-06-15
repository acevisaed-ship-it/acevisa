'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion'
import { EarthSphere } from './EarthSphere'

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

// Paper planes — includes plain + all coloured variants
const PAPER_SRCS = [
  '/paper airplane.svg',
  '/paper plane Orange 2.svg',
  '/paper Plane Blue 2.svg',
  '/paper plane Green 2.svg',
  '/paper plane blue 1.svg',
  '/paper plane Green.svg',
  '/plane.svg',
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

function StarField() {
  const [stars, setStars] = useState<StarData[]>([])

  useEffect(() => {
    const CYCLE = 14   // visible (~12 s) + dark (2 s)
    setStars(
      Array.from({ length: 8 }, (_, i) => ({
        id:         i,
        xPct:       rn(4, 94),
        yPct:       rn(4, 94),
        size:       rn(8, 28),
        src:        pick(STAR_SRCS),
        maxOpacity: rn(0.45, 0.75),
        visibleDur: rn(10, 14),
        pulseDur:   rn(7.5, 20),
        delay:      (i / 8) * CYCLE,  // evenly staggered → ~5–7 visible at once
      }))
    )
  }, [])

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
  const buf = g.cW + 120
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ top: `${g.topPct}%`, left: 0, width: g.cW, height: g.cH }}
      initial={{ x: vw + buf }}
      animate={{ x: -buf }}
      transition={{
        duration:    g.speed,
        delay:       g.delay,
        repeat:      Infinity,
        repeatDelay: g.repeatDelay,
        ease:        'linear',
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
        return {
          id: i, formation, dots, cW, cH,
          topPct:      rn(1, 16),
          speed:       rn(90, 180),
          delay:       rn(0, 40),
          repeatDelay: rn(5, 18),
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
      animate={{ x: p.endX,   y: p.endY,   opacity: [0, 0.65, 0.65, 0] }}
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

function FreeRoamingPaperPlanes({ vw, vh }: { vw: number; vh: number }) {
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
        size:   rn(28, 55),
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

function BeeOrangePlane({ vw, vh }: { vw: number; vh: number }) {
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
        width: 46,
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
// 3. EARTH + ORBITING PLANES (exactly 2)
//    Earth: 100 % opacity, large enough to fill the right column.
// ════════════════════════════════════════════════════════════════════════════

interface OrbitData {
  id:       number
  rx:       number
  ry:       number
  tiltDeg:  number
  startDeg: number
  speed:    number   // seconds per revolution (20–50 s)
  size:     number
  src:      string
  cw:       boolean
}

function OrbitPlane({ d }: { d: OrbitData }) {
  const mx  = useMotionValue(0)
  const my  = useMotionValue(0)
  const rot = useMotionValue(0)
  const t0  = useRef<number | null>(null)

  useAnimationFrame((t) => {
    if (t0.current === null) t0.current = t
    const elapsed = (t - t0.current) / 1000
    const dir     = d.cw ? 1 : -1
    const angle   = (d.startDeg * Math.PI / 180) + (elapsed / d.speed) * Math.PI * 2 * dir
    const tRad    = d.tiltDeg  * Math.PI / 180

    const lx = d.rx * Math.cos(angle)
    const ly = d.ry * Math.sin(angle)
    const px = lx * Math.cos(tRad) - ly * Math.sin(tRad)
    const py = lx * Math.sin(tRad) + ly * Math.cos(tRad)
    mx.set(px); my.set(py)

    const dlx = -d.rx * Math.sin(angle) * dir
    const dly =  d.ry * Math.cos(angle) * dir
    const ddx = dlx * Math.cos(tRad) - dly * Math.sin(tRad)
    const ddy = dlx * Math.sin(tRad) + dly * Math.cos(tRad)
    rot.set(Math.atan2(ddy, ddx) * 180 / Math.PI)
  })

  return (
    <motion.div
      style={{
        position: 'absolute', left: '50%', top: '50%',
        x: mx, y: my, rotate: rot,
        translateX: '-50%', translateY: '-50%',
        width: d.size, willChange: 'transform', pointerEvents: 'none',
      }}
    >
      <img src={d.src} alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

function EarthOrbitSystem() {
  const [orbits, setOrbits]   = useState<OrbitData[]>([])
  const [earthPx, setEarthPx] = useState(640)

  useEffect(() => {
    const vw = window.innerWidth
    const sz = Math.min(780, Math.max(520, vw * 0.55))
    setEarthPx(sz)

    setOrbits([
      {
        id: 0, cw: true,
        rx: sz * rn(0.52, 0.70), ry: sz * rn(0.20, 0.34),
        tiltDeg: rn(-30, 30), startDeg: rn(0, 180),
        speed: rn(20, 40), size: rn(22, 36), src: pick(PAPER_SRCS),
      },
      {
        id: 1, cw: false,
        rx: sz * rn(0.55, 0.72), ry: sz * rn(0.22, 0.36),
        tiltDeg: rn(-35, 35), startDeg: rn(180, 360),
        speed: rn(28, 52), size: rn(18, 30), src: pick(PAPER_SRCS),
      },
    ])
  }, [])

  const half = earthPx / 2

  return (
    <div
      className="pointer-events-none absolute right-[-6%] top-1/2"
      style={{ width: earthPx, height: earthPx, transform: 'translateY(-50%)' }}
    >
      {/* Orbit trail lines */}
      <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        {orbits.map(d => (
          <ellipse
            key={d.id}
            cx={half} cy={half} rx={d.rx} ry={d.ry}
            transform={`rotate(${d.tiltDeg}, ${half}, ${half})`}
            fill="none" stroke="#2083B9" strokeWidth="1.2"
            strokeDasharray="5 9" opacity="0.22"
          />
        ))}
      </svg>

      {/* Planes — below Earth so they pass behind it */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        {orbits.map(d => <OrbitPlane key={d.id} d={d} />)}
      </div>

      {/* Earth — true 3D sphere via Three.js */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', filter: 'none' }}>
        <EarthSphere size={earthPx} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 4. LARGE COMMERCIAL PLANES (exactly 2, directed)
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

function AirplaneLayer({ vw, vh }: { vw: number; vh: number }) {
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
        size: rn(100, 170), src: PLANE_SRCS[0], opacity: rn(0.60, 0.85), // always Orange
      },
      {
        id: 1, startX: bStartX, startY: bStartY, endX: bEndX, endY: bEndY,
        angle: planeAngle(bDx, bDy, false), flipX: false,
        speed: rn(90, 150), delay: rn(10, 30),
        size: rn(100, 170), src: PLANE_SRCS[1], opacity: rn(0.60, 0.85), // always Blue
      },
    ])
  }, [vw, vh])

  return <>{planes.map(p => <LargeAirplane key={p.id} p={p} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// Z-stack (bottom → top):
//   gradient + stars (z-1) → airplanes (z-2) → clouds (z-3)
//   → Earth + orbit (z-4) → free paper planes (z-5) → UI (z-10)
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

      {/* z-1 Stars — behind every other element */}
      <div className="absolute inset-0 z-[1]">
        <StarField />
      </div>

      {/* z-2 Large commercial planes */}
      <div className="absolute inset-0 z-[2]">
        <AirplaneLayer vw={vw} vh={vh} />
      </div>

      {/* z-3 Clouds — upper band only, right-to-left */}
      <div className="absolute inset-0 z-[3]">
        <CloudLayer vw={vw} />
      </div>

      {/* z-4 Earth + 2 orbiting paper planes */}
      <div className="absolute inset-0 z-[4]">
        <EarthOrbitSystem />
      </div>

      {/* z-4 Globe on stand — decorative, bottom-left */}
      <div
        className="absolute bottom-[5%] left-[1%] z-[4] hidden md:block"
        style={{ animation: 'float-bob 14s ease-in-out infinite' }}
      >
        <img src="/Globe on stand.svg" alt="" aria-hidden
             className="landing-decor-globe-sm" style={{ opacity: 0.13 }} />
      </div>

      {/* z-5 Free-roaming directed paper planes */}
      <div className="absolute inset-0 z-[5]">
        <FreeRoamingPaperPlanes vw={vw} vh={vh} />
        <BeeOrangePlane vw={vw} vh={vh} />
      </div>
    </div>
  )
}
