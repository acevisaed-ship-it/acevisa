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
        premultipliedAlpha: false,   // prevents dark fringe / shadow artefacts
        powerPreference: 'low-power',
      })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)   // fully transparent background

      // Style the canvas — clip-path is more reliable than border-radius for WebGL
      const canvas = renderer.domElement
      canvas.style.display    = 'block'
      canvas.style.clipPath   = 'circle(50% at 50% 50%)'
      canvas.style.boxShadow  = 'none'
      canvas.style.filter     = 'none'
      canvas.style.outline    = 'none'
      mountRef.current!.appendChild(canvas)

      // ── Earth sphere ─────────────────────────────────────────────────
      const geometry = new THREE.SphereGeometry(1, 72, 72)

      // Try SVG first; if the browser WebGL driver can't handle it as a
      // texture, fall back to a stylised brand-colour sphere.
      // NOTE: for best results export Earth.svg as earth-texture.png at
      // 4096×2048 from Inkscape and update the path below to '/earth-texture.png'
      let material: import('three').MeshPhongMaterial

      try {
        const texture = await new THREE.TextureLoader().loadAsync('/Earth2.png')
        texture.colorSpace  = THREE.SRGBColorSpace
        texture.anisotropy  = renderer.capabilities.getMaxAnisotropy()
        material = new THREE.MeshPhongMaterial({
          map:       texture,
          shininess: 10,
          specular:  new THREE.Color(0x1a3a55),
        })
      } catch {
        material = new THREE.MeshPhongMaterial({
          color:     new THREE.Color('#145e7a'),
          shininess: 10,
          specular:  new THREE.Color('#2083B9'),
        })
      }

      const sphere = new THREE.Mesh(geometry, material)
      // Tilt slightly so neither pole points directly at camera —
      // eliminates the equirectangular south-pole distortion blob at bottom
      sphere.rotation.x = -0.28
      scene.add(sphere)

      // ── Atmosphere halo ───────────────────────────────────────────────
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.030, 32, 32),
        new THREE.MeshPhongMaterial({
          color:       new THREE.Color('#2083B9'),
          transparent: true,
          opacity:     0.04,   // reduced — was darkening south-pole edge
          side:        THREE.BackSide,
          depthWrite:  false,
        })
      ))

      // ── Lighting ──────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.60))
      const sun = new THREE.DirectionalLight(0xfff8e0, 1.15)
      sun.position.set(4, 2, 3)
      scene.add(sun)
      const fill = new THREE.DirectionalLight(0x4499cc, 0.18)
      fill.position.set(-3, -1, -2)
      scene.add(fill)

      // ── Animation ─────────────────────────────────────────────────────
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
      style={{
        width:        size,
        height:       size,
        clipPath:     'circle(50% at 50% 50%)',  // bulletproof circle clip for WebGL
        borderRadius: '50%',                     // belt-and-suspenders
        overflow:     'hidden',
        boxShadow:    'none',
        filter:       'none',
        isolation:    'isolate',
        background:   'transparent',
      }}
    />
  )
}
