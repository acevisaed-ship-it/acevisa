'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const CLIENT_LANGUAGE_TO_SPEECH: Record<string, string> = {
  urdu: 'ur-PK',
  english: 'en-US',
  punjabi: 'pa-IN',
  sindhi: 'ur-PK',
  pashto: 'ps-AF',
}

function speechLang(language?: string | null): string {
  if (!language) return 'en-US'
  return CLIENT_LANGUAGE_TO_SPEECH[language.toLowerCase()] ?? 'en-US'
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Options = {
  onRecorded: (
    blob: Blob,
    mimeType: string,
    ext: string,
    transcript?: string
  ) => void | Promise<void>
  onError?: (message: string) => void
  minBytes?: number
  language?: string | null
}

export function useVoiceRecorder({ onRecorded, onError, minBytes = 1000, language }: Options) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startingRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef('')

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const finalizeTranscript = useCallback(async (): Promise<string> => {
    const recognition = recognitionRef.current
    if (!recognition) return transcriptRef.current.trim()

    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve(transcriptRef.current.trim())
      }

      recognition.onend = finish
      setTimeout(finish, 2000)

      try {
        recognition.stop()
      } catch {
        finish()
      }
    })
  }, [])

  const stopRecognition = useCallback(() => {
    recognitionRef.current = null
  }, [])

  const startRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition()
    if (!SpeechRecognitionCtor) return false

    transcriptRef.current = ''
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = speechLang(language)

    recognition.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript ?? ''
      }
      transcriptRef.current = text
    }

    recognition.onerror = () => {
      // Non-fatal — server may still transcribe the uploaded audio
    }

    recognition.onend = () => {
      if (mediaRecorderRef.current?.state === 'recording' && recognitionRef.current) {
        try {
          recognition.start()
        } catch {
          // Ignore restart failures while recording
        }
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      return true
    } catch {
      return false
    }
  }, [language])

  const start = useCallback(async () => {
    if (startingRef.current || mediaRecorderRef.current) return
    startingRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

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
        mediaRecorderRef.current = null

        const actualMime = mr.mimeType || mimeType || 'audio/webm'
        const ext = actualMime.includes('mp4') ? 'mp4' : actualMime.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(audioChunksRef.current, { type: actualMime })

        // Wait for speech recognition to flush final words before releasing the mic
        const transcript = await finalizeTranscript()
        stopRecognition()
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        setRecording(false)
        setSeconds(0)

        if (blob.size < minBytes) {
          onError?.('Recording was too short — press and hold the mic a little longer.')
          return
        }

        await onRecorded(blob, actualMime, ext, transcript || undefined)
      }

      // Start speech recognition before the recorder to reduce mic contention
      startRecognition()
      await wait(150)
      mr.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      stopRecognition()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      onError?.('Microphone access denied. Please allow microphone permission and try again.')
    } finally {
      startingRef.current = false
    }
  }, [finalizeTranscript, minBytes, onError, onRecorded, startRecognition, stopRecognition])

  const stop = useCallback(() => { mediaRecorderRef.current?.stop() }, [])
  const cancel = useCallback(() => { mediaRecorderRef.current?.stop() }, [])

  return { recording, seconds, start, stop, cancel }
}
