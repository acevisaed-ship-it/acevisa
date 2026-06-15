'use client'

import { useEffect, useRef } from 'react'

/** Matches :root --bg in globals.css — opaque clear + mount bg stop halo bleed-through */
const PAGE_BG = 0xe6e8e7

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
      camera.position.set(0, 0.1, 3.2)
      camera.lookAt(0, -0.08, 0)

      // Opaque clear matching page bg — antialiased sphere fringe was compositing
      // against the hero gradient/orange behind the canvas, producing a coloured ring.
      renderer = new THREE.WebGLRenderer({
        antialias:       true,
        alpha:           false,
        powerPreference: 'low-power',
      })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(PAGE_BG, 1)
      renderer.outputColorSpace = THREE.SRGBColorSpace

      const canvas = renderer.domElement
      canvas.style.display = 'block'
      mountRef.current!.appendChild(canvas)

      // Trim polar caps — removes equirectangular pole-pinch geometry entirely
      const POLE_CAP = 0.36
      const geometry = new THREE.SphereGeometry(
        1, 80, 64,
        0, Math.PI * 2,
        POLE_CAP, Math.PI - 2 * POLE_CAP,
      )

      let material: import('three').MeshLambertMaterial

      try {
        const texture = await new THREE.TextureLoader().loadAsync('/Earth2.png')
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        // Lambert — no Phong specular limb ring
        material = new THREE.MeshLambertMaterial({ map: texture })
      } catch {
        material = new THREE.MeshLambertMaterial({
          color: new THREE.Color('#145e7a'),
        })
      }

      const sphere = new THREE.Mesh(geometry, material)
      sphere.rotation.x = -0.72
      sphere.scale.setScalar(0.86)
      scene.add(sphere)

      // Hemisphere fill lights the underside; no atmosphere shell
      scene.add(new THREE.HemisphereLight(0xffffff, 0x778899, 0.9))
      const sun = new THREE.DirectionalLight(0xfff8e0, 0.45)
      sun.position.set(4, 3, 5)
      scene.add(sun)

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
        clipPath:     'circle(50% at 50% 50%)',
        borderRadius: '50%',
        overflow:     'hidden',
        background:   '#E6E8E7',
      }}
    />
  )
}
