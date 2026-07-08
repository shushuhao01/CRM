/**
 * 来电铃声（WebAudio 合成，无需音频文件）
 *
 * 使用标准电话双音振铃（440Hz + 480Hz），节奏为响1秒停2秒循环，
 * 接近真实座机来电铃声。通过 startRingtone / stopRingtone 控制。
 *
 * 注意：浏览器自动播放策略要求页面至少有过一次用户交互（点击/按键）
 * 才允许发声。CRM 属于登录后操作的系统，正常使用中该条件天然满足；
 * 若 AudioContext 被挂起会尝试 resume，失败则静默降级（不影响弹窗）。
 */

let audioCtx: AudioContext | null = null
let ringInterval: ReturnType<typeof setInterval> | null = null
let activeNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null
let ringing = false

const getContext = (): AudioContext | null => {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      audioCtx = new Ctx()
    }
    return audioCtx
  } catch {
    return null
  }
}

/** 播放一声约1秒的双音振铃 */
const playRingBurst = (ctx: AudioContext) => {
  stopActiveNodes()

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  // 淡入淡出，避免爆音
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.03)
  gain.gain.setValueAtTime(0.18, ctx.currentTime + 0.95)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0)
  gain.connect(ctx.destination)

  const osc1 = ctx.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.value = 440
  osc1.connect(gain)

  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = 480
  osc2.connect(gain)

  osc1.start()
  osc2.start()
  osc1.stop(ctx.currentTime + 1.05)
  osc2.stop(ctx.currentTime + 1.05)

  activeNodes = { osc1, osc2, gain }
}

const stopActiveNodes = () => {
  if (!activeNodes) return
  try {
    activeNodes.osc1.stop()
    activeNodes.osc2.stop()
    activeNodes.gain.disconnect()
  } catch {
    // 节点可能已自然结束
  }
  activeNodes = null
}

/** 开始循环播放来电铃声（重复调用安全，不会叠加） */
export const startRingtone = () => {
  if (ringing) return
  const ctx = getContext()
  if (!ctx) return

  ringing = true

  const kickoff = () => {
    if (!ringing) return
    playRingBurst(ctx)
    ringInterval = setInterval(() => {
      if (!ringing) return
      playRingBurst(ctx)
    }, 3000)
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(kickoff).catch(() => {
      // 自动播放被浏览器拦截：静默降级，仅无声
      ringing = false
    })
  } else {
    kickoff()
  }
}

/** 停止来电铃声 */
export const stopRingtone = () => {
  ringing = false
  if (ringInterval) {
    clearInterval(ringInterval)
    ringInterval = null
  }
  stopActiveNodes()
}

export const isRingtonePlaying = () => ringing
