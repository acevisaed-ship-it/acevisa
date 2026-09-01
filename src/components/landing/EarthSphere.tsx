'use client'

import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// EarthSphere
// A clean, self-contained Three.js rotating Earth rendered into a perfectly
// circular container.
//
// How the circle works
// ────────────────────
// The wrapper div uses  border-radius: 50% + overflow: hidden.
// This is the most browser-reliable way to clip WebGL to a circle — the canvas
// renders at full size and the parent div masks it. No clip-path on the canvas
// is needed (clip-path on WebGL can bleed anti-aliased pixels outside the arc).
//
// Camera FOV is wide enough that the sphere fills ~88 % of the canvas width,
// leaving a thin band of transparent pixels at every edge. This guarantees
// no sphere geometry ever touches the canvas border, so the circular mask
// always bites into clean transparency.
//
// Axial tilt
// ──────────
// The sphere sits inside a Group rotated 23.5° on Z (Earth's true axial tilt).
// The Y-axis rotation (daily spin) is applied to the sphere, not the group,
// so it correctly spins around the tilted axis — exactly like the real Earth.
//
// Lighting
// ────────
// One strong directional "sun" from upper-right creates a day/night terminator.
// Low ambient keeps the night side dark-but-visible. A faint blue fill
// from the opposite side simulates earthshine from the Moon.
// ─────────────────────────────────────────────────────────────────────────────

interface EarthSphereProps {
  size: number   // pixel side-length of the square canvas (and the circle)
}

export function EarthSphere({ size }: EarthSphereProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current || size === 0) return

    let animId: number
    let renderer: import('three').WebGLRenderer | null = null

    const init = async () => {
      const THREE = await import('three')

      // ── Scene + Camera ──────────────────────────────────────────────────
      const scene  = new THREE.Scene()

      // FOV 45° keeps the sphere proportionally large without distortion.
      // z = 2.4 leaves a ~6% gap between the sphere edge and the canvas edge.
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.z = 2.4

      // ── Renderer ────────────────────────────────────────────────────────
      renderer = new THREE.WebGLRenderer({
        antialias:          true,
        alpha:              true,
        premultipliedAlpha: false,   // removes dark-fringe composite artefacts
        powerPreference:    'low-power',
      })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)   // fully transparent background

      const mount = mountRef.current
      if (!mount) return
      mount.querySelector('canvas')?.remove()
      mount.appendChild(renderer.domElement)

      // ── Earth texture ────────────────────────────────────────────────────
      const texture = await new THREE.TextureLoader().loadAsync('/Earth2.png')
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

      // ── Geometry + Material ──────────────────────────────────────────────
      // 64 segments gives smooth edges with no visible polygon faceting.
      const geometry = new THREE.SphereGeometry(1, 64, 64)
      const material = new THREE.MeshPhongMaterial({
        map:       texture,
        shininess: 18,                         // subtle ocean specular
        specular:  new THREE.Color(0x1a3a55),  // deep-blue specular tint
      })

      // ── Axial tilt group ─────────────────────────────────────────────────
      // Group carries the 23.5° tilt; sphere spins inside it on Y.
      const earthGroup = new THREE.Group()
      earthGroup.rotation.z = 23.5 * (Math.PI / 180)
      scene.add(earthGroup)

      const sphere = new THREE.Mesh(geometry, material)
      earthGroup.add(sphere)

      // ── Lighting ─────────────────────────────────────────────────────────
      // Sun: upper-right, warm daylight colour
      const sun = new THREE.DirectionalLight(0xfff5e0, 1.5)
      sun.position.set(5, 3, 3)
      scene.add(sun)

      // Ambient: dark-blue so the night side stays visible but clearly dark
      scene.add(new THREE.AmbientLight(0x223355, 0.45))

      // Earthshine: faint cool-blue fill from the opposite side
      const fill = new THREE.DirectionalLight(0x2244aa, 0.12)
      fill.position.set(-5, -2, -2)
      scene.add(fill)

      // ── Animation loop ────────────────────────────────────────────────────
      // 0.0018 rad/frame ≈ one full rotation every ~58 min at 60 fps —
      // visually smooth and clearly rotating without being distracting.
      const animate = () => {
        animId = requestAnimationFrame(animate)
        sphere.rotation.y += 0.0018
        renderer!.render(scene, camera)
      }
      animate()
    }

    init().catch(console.error)

    return () => {
      cancelAnimationFrame(animId)
      renderer?.dispose()
      mountRef.current?.querySelector('canvas')?.remove()
    }
  }, [size])

  // border-radius + overflow: hidden is the most reliable circular mask for WebGL.
  // The canvas inside renders square; the parent clips to circle.
  return (
    <div
      ref={mountRef}
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        overflow:     'hidden',
        isolation:    'isolate',
        flexShrink:   0,
      }}
    />
  )
}
