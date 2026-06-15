'use client'

import { useEffect, useRef } from 'react'

interface EarthSphereProps {
  size: number
}

export function EarthSphere({ size }: EarthSphereProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current || size === 0) return

    let animId: number
    let renderer: import('three').WebGLRenderer | null = null

    const init = async () => {
      const THREE = await import('three')

      const scene    = new THREE.Scene()
      const camera   = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
      camera.position.z = 2.6

      renderer = new THREE.WebGLRenderer({
        antialias:       true,
        alpha:           true,
        powerPreference: 'low-power',
      })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      mountRef.current!.appendChild(renderer.domElement)

      // ── Earth sphere ──────────────────────────────────────────
      const geometry = new THREE.SphereGeometry(1, 72, 72)

      // Try loading Earth.svg as texture; fall back to brand colour
      let material: import('three').MeshPhongMaterial
      try {
        const texture = await new THREE.TextureLoader().loadAsync('/Earth.svg')
        texture.colorSpace = THREE.SRGBColorSpace
        material = new THREE.MeshPhongMaterial({
          map:      texture,
          shininess: 12,
          specular:  new THREE.Color(0x224466),
        })
      } catch {
        material = new THREE.MeshPhongMaterial({
          color:     new THREE.Color('#1a7098'),
          shininess: 12,
          specular:  new THREE.Color('#2083B9'),
        })
      }

      const sphere = new THREE.Mesh(geometry, material)
      scene.add(sphere)

      // ── Atmosphere halo ───────────────────────────────────────
      const atmMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.035, 32, 32),
        new THREE.MeshPhongMaterial({
          color:       new THREE.Color('#2083B9'),
          transparent: true,
          opacity:     0.09,
          side:        THREE.BackSide,
        })
      )
      scene.add(atmMesh)

      // ── Lights ────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.60))

      const sun = new THREE.DirectionalLight(0xfff8e8, 1.15)
      sun.position.set(4, 2, 3)
      scene.add(sun)

      const fill = new THREE.DirectionalLight(0x2083B9, 0.22)
      fill.position.set(-3, -1, -2)
      scene.add(fill)

      // ── Animation loop ────────────────────────────────────────
      const animate = () => {
        animId = requestAnimationFrame(animate)
        sphere.rotation.y += 0.0022   // ~1 full rotation per ~47 s
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

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}
    />
  )
}
