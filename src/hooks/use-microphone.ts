import { useState, useRef, useCallback } from 'react'

interface UseMicrophoneReturn {
  isRecording: boolean
  isSupported: boolean
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  cancelRecording: () => void
}

export function useMicrophone(): UseMicrophoneReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const isSupported =
    typeof window !== 'undefined' &&
    !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      window.MediaRecorder
    )

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return ''
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'audio/webm;codecs=opus'
    }
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      return 'audio/webm'
    }
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      return 'audio/mp4'
    }
    return ''
  }

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Este navegador não suporta gravação de áudio.')
      return
    }

    try {
      setError(null)
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = () => {
        setError('Erro na gravação de áudio.')
        setIsRecording(false)
        cleanupStream()
      }

      mediaRecorder.start(250) // collect chunks in intervals
      setIsRecording(true)
    } catch (err: unknown) {
      cleanupStream()
      setIsRecording(false)
      const errorObj = err as { name?: string; message?: string }
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Permita o acesso nas configurações do navegador.')
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        setError('Nenhum microfone encontrado.')
      } else if (errorObj?.name === 'NotSupportedError') {
        setError('Este navegador não suporta gravação de áudio.')
      } else {
        setError('Não foi possível acessar o microfone.')
      }
    }
  }, [isSupported])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false)
        cleanupStream()
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || getSupportedMimeType() || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        setIsRecording(false)
        cleanupStream()
        resolve(audioBlob)
      }

      try {
        mediaRecorder.stop()
      } catch {
        setIsRecording(false)
        cleanupStream()
        resolve(null)
      }
    })
  }, [])

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.onstop = null
        mediaRecorder.stop()
      } catch {
        // noop
      }
    }
    chunksRef.current = []
    setIsRecording(false)
    cleanupStream()
  }, [])

  return {
    isRecording,
    isSupported,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
