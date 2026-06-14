'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion'

// ─── Asset sources ────────────────────────────────────────────────────────
const CLOUD_SRC  = '/cloud.svg'
const STAR_SRCS  = ['/Orange Star.svg', '/Blue Star.svg', '/Green star.svg']
const PLANE_SRCS = ['/Orange plane.svg', '/Blue plane.svg', '/Green Plane.svg']
const PAPER_SRCS = [
  '/paper airplane.svg',
  '/paper plane Orange 2.svg',
  '/paper Plane Blue 2.svg',
  '/paper plane Green 2.svg',
  '/paper plane blue 1.svg',
  '/paper plane Green.svg',
]

// ─── Client-side random helpers (never called during SSR) ────────────────
const rn  = (min: number, max: number) => Math.random() * (max - min) + min
const ri  = (min: number, max: number) => Math.floor(rn(min, max + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// ════════════════════════════════════════════════════════════════════════════
// 0. STAR FIELD
//    Dense, randomly placed twinkling stars — lowest z-index of all layers
// ════════════════════════════════════════════════════════════════════════════

interface StarData {
  id:       number
  xPct:     number   // left %
  yPct:     number   // top %
  size:     number   // base size in px
  src:      string
  duration: number   // pulse cycle seconds
  delay:    number
  opacity:  number
}

function StarField() {
  const [stars, setStars] = useState<StarData[]>([])

  useEffect(() => {
    const count = ri(18, 28)   // 6–9× the original 3 stars
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id:       i,
        xPct:     rn(1, 98),
        yPct:     rn(1, 98),
        size:     rn(8, 30),
        src:      pick(STAR_SRCS),
        duration: rn(1.5, 4),
        delay:    rn(0, 4),
        opacity:  rn(0.35, 0.75),
      }))
    )
  }, [])

  return (
    <>
      {stars.map(s => (
        <motion.img
          key={s.id}
          src={s.src}
          alt=""
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left:   `${s.xPct}%`,
            top:    `${s.yPct}%`,
            width:  s.size,
            height: s.size,
            opacity: s.opacity,
            translateX: '-50%',
            translateY: '-50%',
          }}
          animate={{ scale: [1, 3, 1], opacity: [s.opacity * 0.4, s.opacity, s.opacity * 0.4] }}
          transition={{
            duration:   s.duration,
            delay:      s.delay,
            repeat:     Infinity,
            ease:       'easeInOut',
          }}
        />
      ))}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 1. CLOUD LAYER
//    Groups of 2-4 cloud SVGs drifting horizontally together
// ════════════════════════════════════════════════════════════════════════════

interface CloudDot {
  size: number
  opacity: number
  offsetX: number
  offsetY: number
}

interface CloudGroupData {
  id: number
  topPct: number       // vertical position (%)
  speed: number        // seconds to cross
  delay: number        // initial start delay
  repeatDelay: number  // gap before re-entering
  fromLeft: boolean
  dots: CloudDot[]
}

function CloudGroup({ g, vw }: { g: CloudGroupData; vw: number }) {
  const buf   = 450
  const start = g.fromLeft ? -buf : vw + buf
  const end   = g.fromLeft ? vw + buf : -buf

  return (
    <motion.div
      className="pointer-events-none absolute flex items-start"
      style={{ top: `${g.topPct}%`, left: 0 }}
      initial={{ x: start }}
      animate={{ x: end }}
      transition={{
        duration:     g.speed,
        delay:        g.delay,
        repeat:       Infinity,
        repeatDelay:  g.repeatDelay,
        ease:         'linear',
      }}
    >
      {g.dots.map((d, i) => (
        <img
          key={i}
          src={CLOUD_SRC}
          alt=""
          aria-hidden
          style={{
            position: 'relative',
            marginLeft: d.offsetX,
            top:        d.offsetY,
            width:      d.size,
            opacity:    d.opacity,
            flexShrink: 0,
          }}
        />
      ))}
    </motion.div>
  )
}

function CloudLayer({ vw }: { vw: number }) {
  const [groups, setGroups] = useState<CloudGroupData[]>([])

  useEffect(() => {
    const n  = ri(4, 7)
    const gs: CloudGroupData[] = Array.from({ length: n }, (_, i) => {
      const count = ri(2, 4)
      const dots: CloudDot[] = Array.from({ length: count }, (_, j) => ({
        size:    rn(90, 200),
        opacity: rn(0.35, 0.85),
        offsetX: j === 0 ? 0 : rn(0, 70),
        offsetY: rn(-22, 22),
      }))
      return {
        id:          i,
        topPct:      rn(4, 62),
        speed:       rn(26, 56),
        delay:       rn(0, 22),
        repeatDelay: rn(3, 14),
        fromLeft:    Math.random() > 0.5,
        dots,
      }
    })
    setGroups(gs)
  }, [])

  return <>{groups.map(g => <CloudGroup key={g.id} g={g} vw={vw} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// 2. FREE-ROAMING PAPER PLANES
//    Arc or zigzag paths across the entire hero section
// ════════════════════════════════════════════════════════════════════════════

interface FPData {
  id:    number
  xKF:   number[]
  yKF:   number[]
  rKF:   number[]
  times: number[]
  dur:   number
  delay: number
  size:  number
  src:   string
}

/** Compute the heading angle at each keyframe */
function headings(xs: number[], ys: number[]): number[] {
  return xs.map((_, i) => {
    let dx: number, dy: number
    if (i === 0) {
      dx = xs[1] - xs[0];            dy = ys[1] - ys[0]
    } else if (i === xs.length - 1) {
      dx = xs[i] - xs[i - 1];       dy = ys[i] - ys[i - 1]
    } else {
      dx = xs[i + 1] - xs[i - 1];   dy = ys[i + 1] - ys[i - 1]
    }
    return Math.atan2(dy, dx) * 180 / Math.PI
  })
}

function buildArc(vw: number, vh: number): Pick<FPData, 'xKF' | 'yKF' | 'rKF' | 'times'> {
  const left  = Math.random() > 0.5
  const sY    = rn(vh * 0.04, vh * 0.78)
  const eY    = rn(vh * 0.04, vh * 0.78)
  const midY  = Math.min(sY, eY) - rn(40, 130)
  const xs    = [left ? -90 : vw + 90, vw / 2 + rn(-120, 120), left ? vw + 90 : -90]
  const ys    = [sY, midY, eY]
  const rKF   = headings(xs, ys)
  const times = [0, 0.5, 1]
  return { xKF: xs, yKF: ys, rKF, times }
}

function buildZigzag(vw: number, vh: number): Pick<FPData, 'xKF' | 'yKF' | 'rKF' | 'times'> {
  const left  = Math.random() > 0.5
  const steps = ri(5, 8)
  const xs    = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    return left ? -90 + (vw + 180) * t : vw + 90 - (vw + 180) * t
  })
  const ys    = Array.from({ length: steps }, () => rn(vh * 0.04, vh * 0.78))
  const rKF   = headings(xs, ys)
  const times = xs.map((_, i) => i / (steps - 1))
  return { xKF: xs, yKF: ys, rKF, times }
}

function FreePlane({ p }: { p: FPData }) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: 0, top: 0, width: p.size }}
      initial={{ x: p.xKF[0], y: p.yKF[0], rotate: p.rKF[0] }}
      animate={{ x: p.xKF, y: p.yKF, rotate: p.rKF }}
      transition={{
        duration: p.dur,
        delay:    p.delay,
        repeat:   Infinity,
        ease:     'linear',
        times:    p.times,
      }}
    >
      <img src={p.src} alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

function FreeRoamingPlanes({ vw, vh }: { vw: number; vh: number }) {
  const [planes, setPlanes] = useState<FPData[]>([])

  useEffect(() => {
    if (!vw || !vh) return
    const count = ri(5, 10)
    setPlanes(
      Array.from({ length: count }, (_, i) => {
        const path = Math.random() > 0.5 ? buildZigzag(vw, vh) : buildArc(vw, vh)
        return { id: i, ...path, dur: rn(9, 22), delay: rn(0, 18), size: rn(28, 68), src: pick(PAPER_SRCS) }
      })
    )
  }, [vw, vh])

  return <>{planes.map(p => <FreePlane key={p.id} p={p} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// 3. EARTH + ORBITING PLANES
//    Elliptical orbit paths with dotted trails; Earth overlaps back-arc planes
// ════════════════════════════════════════════════════════════════════════════

interface OrbitData {
  id:         number
  rx:         number   // semi-major axis (px relative to Earth container)
  ry:         number   // semi-minor axis
  tiltDeg:    number
  startDeg:   number
  speed:      number   // seconds per revolution
  size:       number   // plane size (px)
  src:        string
  cw:         boolean  // clockwise
}

function OrbitPlane({ d, earthPx }: { d: OrbitData; earthPx: number }) {
  const mx  = useMotionValue(0)
  const my  = useMotionValue(0)
  const rot = useMotionValue(0)
  const t0  = useRef<number | null>(null)

  useAnimationFrame((t) => {
    if (t0.current === null) t0.current = t
    const elapsed = (t - t0.current) / 1000
    const dir     = d.cw ? 1 : -1
    const angle   = (d.startDeg * Math.PI / 180) + (elapsed / d.speed) * Math.PI * 2 * dir
    const tRad    = d.tiltDeg * Math.PI / 180

    // Parametric ellipse
    const lx = d.rx * Math.cos(angle)
    const ly = d.ry * Math.sin(angle)

    // Apply tilt
    const px = lx * Math.cos(tRad) - ly * Math.sin(tRad)
    const py = lx * Math.sin(tRad) + ly * Math.cos(tRad)
    mx.set(px)
    my.set(py)

    // Tangent vector → heading
    const dlx = -d.rx * Math.sin(angle) * dir
    const dly =  d.ry * Math.cos(angle) * dir
    const dx  = dlx * Math.cos(tRad) - dly * Math.sin(tRad)
    const dy  = dlx * Math.sin(tRad) + dly * Math.cos(tRad)
    rot.set(Math.atan2(dy, dx) * 180 / Math.PI)
  })

  return (
    <motion.div
      style={{
        position:   'absolute',
        left:       '50%',
        top:        '50%',
        x:          mx,
        y:          my,
        rotate:     rot,
        translateX: '-50%',
        translateY: '-50%',
        width:      d.size,
        willChange: 'transform',
        pointerEvents: 'none',
      }}
    >
      <img src={d.src} alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

function EarthOrbitSystem() {
  const [orbits, setOrbits]   = useState<OrbitData[]>([])
  const [earthPx, setEarthPx] = useState(420)

  useEffect(() => {
    const vw  = window.innerWidth
    const sz  = Math.min(520, Math.max(300, vw * 0.38))
    setEarthPx(sz)

    const count = ri(3, 6)
    setOrbits(
      Array.from({ length: count }, (_, i) => ({
        id:       i,
        rx:       sz * rn(0.5, 0.76),
        ry:       sz * rn(0.18, 0.38),
        tiltDeg:  rn(-45, 45),
        startDeg: rn(0, 360),
        speed:    rn(6, 18),
        size:     rn(18, 44),
        src:      pick(PAPER_SRCS),
        cw:       Math.random() > 0.5,
      }))
    )
  }, [])

  const half = earthPx / 2

  return (
    <div
      className="pointer-events-none absolute right-[-6%] top-1/2"
      style={{ width: earthPx, height: earthPx, transform: 'translateY(-50%)' }}
    >
      {/* Dotted orbit trails */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        {orbits.map(d => (
          <ellipse
            key={d.id}
            cx={half} cy={half}
            rx={d.rx} ry={d.ry}
            transform={`rotate(${d.tiltDeg}, ${half}, ${half})`}
            fill="none"
            stroke="#2083B9"
            strokeWidth="1.2"
            strokeDasharray="5 9"
            opacity="0.2"
          />
        ))}
      </svg>

      {/* Back-arc planes — rendered below Earth */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        {orbits.map(d => <OrbitPlane key={d.id} d={d} earthPx={earthPx} />)}
      </div>

      {/* Earth Globe */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <img
          src="/Earth.svg"
          alt=""
          aria-hidden
          style={{
            width: '100%', height: '100%', objectFit: 'contain',
            opacity: 0.5,
            animation: 'globe-spin 28s linear infinite',
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 4. LARGE AIRPLANE LAYER
//    Slow-moving commercial jets in brand colors, below clouds
// ════════════════════════════════════════════════════════════════════════════

interface APlaneData {
  id:          number
  topPct:      number
  speed:       number
  delay:       number
  repeatDelay: number
  size:        number
  fromLeft:    boolean
  src:         string
  opacity:     number
  driftY:      number  // subtle vertical drift while crossing
}

function LargeAirplane({ p, vw }: { p: APlaneData; vw: number }) {
  const buf   = p.size + 80
  const start = p.fromLeft ? -buf : vw + buf
  const end   = p.fromLeft ? vw + buf : -buf

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        top:        `${p.topPct}%`,
        width:      p.size,
        opacity:    p.opacity,
        scaleX:     p.fromLeft ? 1 : -1,
        willChange: 'transform',
      }}
      initial={{ x: start, y: 0 }}
      animate={{ x: end,   y: p.driftY }}
      transition={{
        duration:    p.speed,
        delay:       p.delay,
        repeat:      Infinity,
        repeatDelay: p.repeatDelay,
        ease:        'linear',
      }}
    >
      <img src={p.src} alt="" aria-hidden className="h-auto w-full object-contain" />
    </motion.div>
  )
}

function AirplaneLayer({ vw }: { vw: number }) {
  const [planes, setPlanes] = useState<APlaneData[]>([])

  useEffect(() => {
    const count = ri(3, 5)
    setPlanes(
      Array.from({ length: count }, (_, i) => ({
        id:          i,
        topPct:      rn(10, 70),
        speed:       rn(24, 52),
        delay:       rn(0, 28),
        repeatDelay: rn(6, 22),
        size:        rn(80, 170),
        fromLeft:    Math.random() > 0.5,
        src:         pick(PLANE_SRCS),
        opacity:     rn(0.22, 0.44),
        driftY:      rn(-30, 30),
      }))
    )
  }, [])

  return <>{planes.map(p => <LargeAirplane key={p.id} p={p} vw={vw} />)}</>
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// Z-stack: gradient(1) → airplanes(2) → clouds(3) → Earth+orbit(4) → stars(4) → free planes(5)
// UI content in HeroSection sits at z-10 and is always on top
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

  // Avoid any render until viewport is measured client-side (SSR-safe)
  if (!vw) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

      {/* Background gradient wash — z-1 */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 65% 50%, rgba(32,131,185,0.07) 0%, transparent 70%),' +
            'radial-gradient(ellipse 50% 70% at 10% 80%, rgba(10,63,58,0.06) 0%, transparent 60%)',
        }}
      />

      {/* z-[1] — Star field (lowest animated layer, behind everything) */}
      <div className="absolute inset-0 z-[1]">
        <StarField />
      </div>

      {/* z-2 — Large commercial airplanes (background, slow) */}
      <div className="absolute inset-0 z-[2]">
        <AirplaneLayer vw={vw} />
      </div>

      {/* z-3 — Cloud groups (cover airplanes partially) */}
      <div className="absolute inset-0 z-[3]">
        <CloudLayer vw={vw} />
      </div>

      {/* z-4 — Earth + orbit system (self-contained z-layering inside) */}
      <div className="absolute inset-0 z-[4]">
        <EarthOrbitSystem />
      </div>

      {/* z-4 — Globe on stand, bottom-left */}
      <div
        className="absolute bottom-[5%] left-[1%] z-[4] hidden md:block"
        style={{ animation: 'float-bob 6s ease-in-out infinite' }}
      >
        <img
          src="/Globe on stand.svg"
          alt=""
          aria-hidden
          className="landing-decor-globe-sm"
          style={{ opacity: 0.12 }}
        />
      </div>

      {/* z-5 — Free-roaming paper planes (topmost animated layer) */}
      <div className="absolute inset-0 z-[5]">
        <FreeRoamingPlanes vw={vw} vh={vh} />
      </div>
    </div>
  )
}
