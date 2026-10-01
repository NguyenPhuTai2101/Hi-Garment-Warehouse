let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function useSoundAndHaptic() {
  const playSuccess = () => {
    try {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // High crisp beep (A5)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.12)

      // Short haptic vibration
      if (navigator.vibrate) {
        navigator.vibrate(60)
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e)
    }
  }

  const playError = () => {
    try {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime) // Low harsh buzz (A3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.35)

      // Alert vibration pattern: buzz - pause - buzz
      if (navigator.vibrate) {
        navigator.vibrate([150, 80, 200])
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e)
    }
  }

  const playWarning = () => {
    try {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1) // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.22)

      if (navigator.vibrate) {
        navigator.vibrate(100)
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e)
    }
  }

  return {
    playSuccess,
    playError,
    playWarning
  }
}
