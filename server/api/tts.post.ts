const FISH_TTS_URL = 'https://api.fish.audio/v1/tts'
const CACHE_LIMIT = 80

type CacheEntry = { body: Buffer; contentType: string }

const audioCache = new Map<string, CacheEntry>()

function remember(key: string, entry: CacheEntry) {
  if (audioCache.has(key)) audioCache.delete(key)
  audioCache.set(key, entry)
  while (audioCache.size > CACHE_LIMIT) {
    const oldest = audioCache.keys().next().value
    if (!oldest) break
    audioCache.delete(oldest)
  }
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const apiKey = String(config.fishApiKey || '').trim()
  if (!apiKey) {
    throw createError({ statusCode: 501, statusMessage: 'FISH_API_KEY is not configured' })
  }

  const body = await readBody<{ text?: string }>(event)
  const text = String(body?.text || '').trim()
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'text is required' })
  }

  const voiceId = String(config.fishVoiceId || '').trim()
  const model = String(config.fishTtsModel || 's2.1-pro-free').trim() || 's2.1-pro-free'
  const cacheKey = `${model}:${voiceId}:${text}`
  const cached = audioCache.get(cacheKey)
  if (cached) {
    setResponseHeader(event, 'Content-Type', cached.contentType)
    setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
    return cached.body
  }

  const payload: Record<string, unknown> = {
    text,
    format: 'mp3',
    latency: 'balanced',
    normalize: true,
  }
  if (voiceId) payload.reference_id = voiceId

  const response = await fetch(FISH_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      model,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    throw createError({
      statusCode: response.status,
      statusMessage: detail || 'Fish Audio TTS failed',
    })
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg'
  const audio = Buffer.from(await response.arrayBuffer())
  remember(cacheKey, { body: audio, contentType })
  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=86400')
  return audio
})
