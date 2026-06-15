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

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
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

      // ── Earth sphere ─────────────────────────────────────────────
      const geometry = new THREE.SphereGeometry(1, 72, 72)

      // Load the flat equirectangular Earth.svg as a sphere texture.
      // Three.js SphereGeometry UVs exactly match equirectangular projection,
      // so the flat map wraps onto the sphere with correct geography.
      let material: import('three').MeshPhongMaterial

      try {
        const texture = await new THREE.TextureLoader().loadAsync('/Earth.svg')
        texture.colorSpace = THREE.SRGBColorSpace
        // Anisotropic filtering keeps the texture sharp as the globe rotates
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        material = new THREE.MeshPhongMaterial({
          map:       texture,
          shininess: 10,
          specular:  new THREE.Color(0x1a3a55),
        })
      } catch {
        // Fallback: brand-coloured sphere if SVG fails to load
        material = new THREE.MeshPhongMaterial({
          color:     new THREE.Color('#1a7098'),
          shininess: 10,
          specular:  new THREE.Color('#2083B9'),
        })
      }

      const sphere = new THREE.Mesh(geometry, material)
      scene.add(sphere)

      // ── Thin atmosphere halo ─────────────────────────────────────
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.032, 32, 32),
        new THREE.MeshPhongMaterial({
          color:       new THREE.Color('#2083B9'),
          transparent: true,
          opacity:     0.08,
          side:        THREE.BackSide,
        })
      ))

      // ── Lighting ─────────────────────────────────────────────────
      // Ambient keeps the dark side visible
      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      // Main sun — from top-right-front
      const sun = new THREE.DirectionalLight(0xfff8e0, 1.2)
      sun.position.set(4, 2, 3)
      scene.add(sun)
      // Cool fill from opposite side
      const fill = new THREE.DirectionalLight(0x4499cc, 0.20)
      fill.position.set(-3, -1, -2)
      scene.add(fill)

      // ── Rotation loop ─────────────────────────────────────────────
      // ~0.0022 rad/frame ≈ 1 full rotation every ~47 s at 60 fps
      const animate = () => {
        animId = requestAnimationFrame(animate)
        sphere.rotation.y += 0.0022
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
