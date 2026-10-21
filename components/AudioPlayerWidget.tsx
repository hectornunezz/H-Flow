'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type AudioPlayerWidgetProps = {
  bucket: string
  filePath: string
  title?: string
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function AudioPlayerWidget({
  bucket,
  filePath,
  title = 'Nota de voz de WhatsApp',
}: AudioPlayerWidgetProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadAudio() {
      setIsLoading(true)
      setError('')
      setAudioUrl('')

      try {
        const supabase = createClient()
        const { data, error: storageError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 60 * 60)

        if (storageError) throw storageError
        if (!data?.signedUrl) throw new Error('No se pudo generar el enlace del audio.')
        if (isCurrent) setAudioUrl(data.signedUrl)
      } catch (loadError) {
        console.error(
          '[AudioPlayerWidget] No se pudo cargar el audio:',
          loadError instanceof Error ? loadError.message : loadError,
        )
        if (isCurrent) {
          setError('No se pudo cargar la nota de voz.')
          setIsLoading(false)
        }
      }
    }

    void loadAudio()
    return () => {
      isCurrent = false
    }
  }, [bucket, filePath])

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio || isLoading || error) return

    if (audio.paused) {
      void audio.play().catch((playError: unknown) => {
        console.error(
          '[AudioPlayerWidget] No se pudo reproducir el audio:',
          playError instanceof Error ? playError.message : playError,
        )
        setError('No se pudo reproducir la nota de voz.')
        setIsPlaying(false)
      })
    } else {
      audio.pause()
    }
  }

  function seekAudio(value: number) {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = value
    setCurrentTime(value)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <section
      aria-label={title}
      className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/65 p-4 text-white shadow-xl shadow-black/20 backdrop-blur-xl"
    >
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
          setIsLoading(false)
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
        onError={() => {
          if (!audioUrl) return
          setIsLoading(false)
          setIsPlaying(false)
          setError('No se pudo cargar la nota de voz.')
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={isLoading || Boolean(error) || !audioUrl}
          aria-label={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/20 transition hover:bg-[#ff6a1a] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-slate-200">{title}</p>
            <Volume2 className="h-4 w-4 shrink-0 text-[#FF8A4C]" aria-hidden="true" />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seekAudio(Number(event.target.value))}
            disabled={isLoading || Boolean(error) || duration === 0}
            aria-label="Progreso del audio"
            aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
            style={{
              background: `linear-gradient(to right, #FF5A00 ${progress}%, rgb(51 65 85) ${progress}%)`,
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#FF5A00] disabled:cursor-not-allowed [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF5A00] [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#FF5A00]"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>{isLoading ? 'Cargando…' : formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-400">
          {error}
        </p>
      )}
    </section>
  )
}
