import { onMounted, watchEffect } from 'vue'
import { useSettingStore } from '../stores/setting'
import { ref } from 'vue'

import { ENV, getDictVoiceUrl, SoundFileOptions } from '../config/env'
import { Toast } from '@/base'

/**
 * 获取当前浏览器的 OS+浏览器 组合 key，用于 ttsVoiceMap 的索引
 * 返回如 "mac+chrome" / "windows+edge" / "ios+safari" 等固定组合
 */
export function getBrowserKey(): string {
  if (typeof navigator === 'undefined') return 'unknown+unknown'
  const ua = navigator.userAgent

  let os = 'unknown'
  if (/iPad|iPhone|iPod/.test(ua)) {
    os = 'ios'
  } else if (/Android/.test(ua)) {
    os = 'android'
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'mac'
  } else if (/Windows/.test(ua)) {
    os = 'windows'
  } else if (/Linux/.test(ua)) {
    os = 'linux'
  }

  let browser = 'unknown'
  if (/Edg\//.test(ua)) {
    browser = 'edge'
  } else if (/OPR\/|Opera/.test(ua)) {
    browser = 'opera'
  } else if (/Chrome\//.test(ua)) {
    browser = 'chrome'
  } else if (/Firefox\//.test(ua)) {
    browser = 'firefox'
  } else if (/Safari\//.test(ua)) {
    browser = 'safari'
  }

  return `${os}+${browser}`
}

export function useSound(audioSrcList?: string[], audioFileLength?: number) {
  let audioList = ref<HTMLAudioElement[]>([])
  let audioLength = ref(1)
  let index = ref(0)

  onMounted(() => {
    if (audioSrcList) setAudio(audioSrcList, audioFileLength)
  })

  //这里同一个音频弄好几份是为了快速打字是，可同时发音
  function setAudio(audioSrcList2: string[], audioFileLength2?: number) {
    //@ts-ignore
    if (import.meta.server) return
    if (audioFileLength2) audioLength.value = audioFileLength2
    audioList.value = []
    for (let i = 0; i < audioLength.value; i++) {
      audioSrcList2.map(src => audioList.value.push(new Audio(ENV.RESOURCE_URL + src)))
    }
    index.value = 0
  }

  function play(volume: number = 100) {
    index.value++
    if (audioList.value.length > 1 && audioList.value.length !== audioLength.value) {
      let htmlAudioElement = audioList.value[index.value % audioList.value.length]
      if (htmlAudioElement) {
        htmlAudioElement.volume = volume / 100
        void htmlAudioElement.play().catch(() => {})
      }
    } else {
      let htmlAudioElement1 = audioList.value[index.value % audioLength.value]
      if (htmlAudioElement1) {
        htmlAudioElement1.volume = volume / 100
        void htmlAudioElement1.play().catch(() => {})
      }
    }
  }

  return { play, setAudio }
}

let keyboardPlayFn: ((volume: number) => void) | null = null
export function usePlayKeyboardAudio() {
  const settingStore = useSettingStore()

  if (!keyboardPlayFn) {
    const { play, setAudio } = useSound()

    watchEffect(() => {
      if (!settingStore.keyboardSound) return
      if (!SoundFileOptions.find(v => v.label === settingStore.keyboardSoundFile)) {
        settingStore.keyboardSoundFile = '机械键盘2'
      }
      let urlList = getAudioFileUrl(settingStore.keyboardSoundFile)
      setAudio(urlList, urlList.length === 1 ? 4 : 1)
    })

    keyboardPlayFn = play
  }

  function playAudio() {
    if (settingStore.keyboardSound) {
      keyboardPlayFn!(settingStore.keyboardSoundVolume)
    }
  }

  return playAudio
}

let playBeep = null
export function usePlayBeep() {
  const settingStore = useSettingStore()
  if (!playBeep) {
    const { play } = useSound([`/sound/beep.wav`], 1)
    playBeep = play
  }

  function playAudio() {
    if (settingStore.effectSound) {
      playBeep(settingStore.effectSoundVolume)
    }
  }

  return playAudio
}

export function usePlayCorrect() {
  const settingStore = useSettingStore()
  const { play } = useSound([`/sound/correct.wav`], 1)

  function playAudio() {
    if (settingStore.effectSound) {
      play(settingStore.effectSoundVolume)
    }
  }

  return playAudio
}

const activeWordPlayCountMap = new Map<string, number>()
let resetWordPlayCountTimer = -1

export function resetActiveWordPlayCount(word: string) {
  if (!word) return
  activeWordPlayCountMap.delete(word.trim().toLowerCase())
}

let cachedWordAudio: HTMLAudioElement | null = null
let wordPlaybackGeneration = 0
let ttsPlaybackGeneration = 0

function getCachedWordAudio(): HTMLAudioElement | null {
  if (!cachedWordAudio && typeof Audio !== 'undefined') {
    cachedWordAudio = new Audio()
  }
  return cachedWordAudio
}

export function cancelWordPracticeAudio() {
  wordPlaybackGeneration++
  ttsPlaybackGeneration++
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.pause()
    speechSynthesis.cancel()
  }
  const wordAudio = getCachedWordAudio()
  if (wordAudio) {
    wordAudio.onended = null
    wordAudio.onerror = null
    wordAudio.pause()
    wordAudio.currentTime = 0
  }
}

export function usePlayWordAudio() {
  const settingStore = useSettingStore()

  onMounted(() => {
    // @ts-ignore SSR guard
    if (import.meta.server) return
    getCachedWordAudio()
  })

  function playAudio(word: string, handle: boolean = true, onEnd?: () => void, onPlay?: () => void) {
    const wordAudio = getCachedWordAudio()
    if (!word || !wordAudio) return
    cancelWordPracticeAudio()
    const generation = ++wordPlaybackGeneration
    let playbackRate = settingStore.wordSoundSpeed
    if (handle) {
      const key = word.trim().toLowerCase()
      const count = activeWordPlayCountMap.get(key) ?? 0
      if (count % 3 !== 0) {
        playbackRate = playbackRate * 0.75
        Toast.success('0.75倍速播放')
      } else {
        Toast.closeAll()
      }
      activeWordPlayCountMap.set(key, count + 1)

      //5秒后重置，以免隔了很久播放，还是0.75倍
      clearTimeout(resetWordPlayCountTimer)
      resetWordPlayCountTimer = setTimeout(() => {
        activeWordPlayCountMap.set(key, 0)
      }, 5000)
    }
    // console.log('playAudio-handle', handle, playbackRate)
    const url = getDictVoiceUrl(word, settingStore.soundType)
    let onended = () => {
      if (generation !== wordPlaybackGeneration) return
      onEnd?.()
    }
    wordAudio.onended = onended
    wordAudio.onplay = () => onPlay?.()
    wordAudio.onerror = () => {
      if (generation !== wordPlaybackGeneration) return
      const ttsPlay = useTTsPlayAudio()
      ttsPlay(word, { rate: playbackRate, onEnd: onended })
    }
    wordAudio.src = url
    wordAudio.volume = settingStore.wordSoundVolume / 100
    wordAudio.playbackRate = playbackRate
    void wordAudio.play()
  }

  return playAudio
}

function getVoicesAsync() {
  return new Promise(resolve => {
    const voices = speechSynthesis.getVoices()
    if (voices.length) return resolve(voices)

    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices())
    }
  })
}

export interface TTsPlayOptions {
  rate?: number
  volume?: number
  pitch?: number
  lang?: string
  onEnd?: () => void
}

const sentenceBlobCache = new Map<string, string>()
const sentenceInflight = new Map<string, Promise<string>>()

async function getFishSentenceAudioUrl(text: string): Promise<string> {
  const cached = sentenceBlobCache.get(text)
  if (cached) return cached
  const pending = sentenceInflight.get(text)
  if (pending) return pending

  const request = fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Fish TTS ${response.status}`)
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      sentenceBlobCache.set(text, objectUrl)
      return objectUrl
    })
    .finally(() => {
      sentenceInflight.delete(text)
    })

  sentenceInflight.set(text, request)
  return request
}

/**
 * 是否启用 Fish Audio 例句合成。
 * 静态部署（无 Nitro 服务端）或未配置 FISH_API_KEY 时为 false，
 * 此时 /api/tts 不存在，应直接走有道/浏览器合成，避免无用请求与 404。
 */
function isFishTtsEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().public.fishTtsEnabled)
  } catch {
    return false
  }
}

export function usePlaySentenceAudio() {
  const settingStore = useSettingStore()
  const ttsFallback = useTTsPlayAudio()

  function playYoudaoOrBrowser(text: string, generation: number, onended: () => void, playBrowser: () => void) {
    const audio = getCachedWordAudio()
    if (!audio) {
      playBrowser()
      return
    }
    audio.onended = onended
    audio.onerror = playBrowser
    audio.src = getDictVoiceUrl(text, settingStore.soundType)
    audio.volume = settingStore.sentenceSoundVolume / 100
    audio.playbackRate = settingStore.sentenceSoundSpeed
    void audio.play().catch(playBrowser)
  }

  function play(text: string, options: { onEnd?: () => void } = {}) {
    if (!text) return
    const audio = getCachedWordAudio()
    cancelWordPracticeAudio()
    const generation = ++wordPlaybackGeneration
    const onended = () => {
      if (generation !== wordPlaybackGeneration) return
      options.onEnd?.()
    }
    const playBrowser = () => {
      if (generation !== wordPlaybackGeneration) return
      ttsFallback(text, {
        rate: settingStore.sentenceSoundSpeed,
        volume: settingStore.sentenceSoundVolume / 100,
        onEnd: onended,
      })
    }
    if (!audio) {
      playBrowser()
      return
    }

    // 未启用 Fish TTS 时跳过 /api/tts，直接走有道/浏览器合成
    if (!isFishTtsEnabled()) {
      playYoudaoOrBrowser(text, generation, onended, playBrowser)
      return
    }

    void getFishSentenceAudioUrl(text)
      .then(url => {
        if (generation !== wordPlaybackGeneration) return
        audio.onended = onended
        audio.onerror = () => playYoudaoOrBrowser(text, generation, onended, playBrowser)
        audio.src = url
        audio.volume = settingStore.sentenceSoundVolume / 100
        audio.playbackRate = settingStore.sentenceSoundSpeed
        void audio.play().catch(() => playYoudaoOrBrowser(text, generation, onended, playBrowser))
      })
      .catch(() => {
        if (generation !== wordPlaybackGeneration) return
        playYoudaoOrBrowser(text, generation, onended, playBrowser)
      })
  }

  return play
}

export function useTTsPlayAudio() {
  const settingStore = useSettingStore()

  function play(text: string, options: TTsPlayOptions = {}) {
    if (!text || typeof speechSynthesis === 'undefined') return
    const generation = ++ttsPlaybackGeneration
    speechSynthesis.cancel() // 防止 Chrome 队列卡死
    let msg = new SpeechSynthesisUtterance(text)
    msg.rate = options.rate ?? settingStore.wordSoundSpeed
    msg.volume = options.volume ?? settingStore.wordSoundVolume / 100
    msg.pitch = options.pitch ?? 1
    msg.lang = options.lang ?? 'en-US'
    msg.onend = () => options.onEnd?.()
    msg.onerror = () => options.onEnd?.()
    getVoicesAsync().then((voices: any[]) => {
      if (generation !== ttsPlaybackGeneration) return
      // 优先使用用户在当前浏览器配置的声色
      const browserKey = getBrowserKey()
      const savedVoiceName = settingStore?.ttsVoiceMap?.find(v => v.key === browserKey)?.voice
      if (savedVoiceName) {
        const savedVoice = voices.find(v => v.name === savedVoiceName)
        if (savedVoice) {
          msg.voice = savedVoice
          speechSynthesis.speak(msg)
          return
        }
      }
      // 回退：优先找 Emma / US，否则取第一个英文声色
      let voiceList = voices.filter(v => v.lang === 'en-US')
      if (voiceList && voiceList.length) {
        msg.voice = voiceList.find(v => v.name.includes('US') || v.name.includes('Emma')) ?? voiceList[0]
      }
      speechSynthesis.speak(msg)
    })
  }

  return play
}

export function usePlayAudio(url: string) {
  void new Audio(url).play().catch(() => {})
}

export function getAudioFileUrl(name: string) {
  if (name === '机械键盘') {
    return [
      `/sound/key-sounds/jixie/机械0.mp3`,
      `/sound/key-sounds/jixie/机械1.mp3`,
      `/sound/key-sounds/jixie/机械2.mp3`,
      `/sound/key-sounds/jixie/机械3.mp3`,
    ]
  } else {
    return [`/sound/key-sounds/${name}.mp3`]
  }
}
