const CLIENT_LANGUAGE_TO_WHISPER: Record<string, string> = {
  urdu: 'ur',
  english: 'en',
  punjabi: 'pa',
  sindhi: 'sd',
  pashto: 'ps',
}

function mapClientLanguage(language?: string | null): string | undefined {
  if (!language) return undefined
  return CLIENT_LANGUAGE_TO_WHISPER[language.toLowerCase()]
}

export async function transcribeAudio(
  audioBytes: ArrayBuffer,
  mimeType: string,
  filename: string,
  language?: string | null
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const formData = new FormData()
  formData.append('file', new Blob([audioBytes], { type: mimeType }), filename)
  formData.append('model', 'whisper-1')

  const whisperLang = mapClientLanguage(language)
  if (whisperLang) formData.append('language', whisperLang)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    console.error('[transcribe] Whisper API error:', await res.text())
    return null
  }

  const data = (await res.json()) as { text?: string }
  return data.text?.trim() || null
}
