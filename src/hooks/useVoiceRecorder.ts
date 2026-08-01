'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Options = {
  onRecorded: (blob: Blob, mimeType: string, ext: string) => void | Promise<void>
  onError?: (message: string) => void
  minBytes?: number
}

export function useVoiceRecorder({ onRecorded, onError, minBytes = 1000 }: Options) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startingRef = useRef(false)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const start = useCallback(async () => {
    if (startingRef.current || mediaRecorderRef.current) return
    startingRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Safari (iOS/macOS) only supports audio/mp4 — webm is Chrome/Firefox only
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        mediaRecorderRef.current = null

        const actualMime = mr.mimeType || mimeType || 'audio/webm'
        const ext = actualMime.includes('mp4') ? 'mp4' : actualMime.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(audioChunksRef.current, { type: actualMime })
        setRecording(false)
        setSeconds(0)

        if (blob.size < minBytes) {
          onError?.('Recording was too short — press and hold the mic a little longer.')
          return
        }
        await onRecorded(blob, actualMime, ext)
      }

      mr.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      onError?.('Microphone access denied. Please allow microphone permission and try again.')
    } finally {
      startingRef.current = false
    }
  }, [minBytes, onError, onRecorded])

  const stop = useCallback(() => { mediaRecorderRef.current?.stop() }, [])
  const cancel = useCallback(() => { mediaRecorderRef.current?.stop() }, [])

  return { recording, seconds, start, stop, cancel }
}
