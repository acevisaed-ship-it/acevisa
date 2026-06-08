'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_DIMENSION = 400

type Props = {
  counselorId: string
  counselorName: string
  avatarUrl?: string | null
  size?: number
  className?: string
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not process image'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))),
        'image/jpeg',
        0.9
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image'))
    }

    img.src = objectUrl
  })
}

export function ProfilePicture({
  counselorId,
  counselorName,
  avatarUrl: initialAvatarUrl,
  size = 80,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)

    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Only JPG, PNG, and WEBP images are allowed')
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be 2MB or smaller')
      return
    }

    setIsUploading(true)

    try {
      const resized = await resizeImage(file)
      const formData = new FormData()
      formData.append('file', resized, `${counselorId}.jpg`)

      const res = await fetch('/api/counselor/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Upload failed')
      }

      setAvatarUrl(data.avatarUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const initial = getInitial(counselorName)

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        aria-label="Upload profile picture"
        className="relative shrink-0 overflow-hidden rounded-full transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ width: size, height: size }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${counselorName} profile`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-bold"
            style={{ backgroundColor: '#B7C733', color: '#0A3F3A', fontSize: size * 0.4 }}
          >
            {initial}
          </span>
        )}
        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
            ...
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="max-w-[120px] text-center text-xs text-orange">{error}</p>}
    </div>
  )
}
