declare module 'benz-amr-recorder' {
  class BenzAMRRecorder {
    initWithUrl(url: string): Promise<void>
    play(): void
    stop(): void
    pause(): void
    resume(): void
    onEnded(cb: () => void): void
    onPlay(cb: () => void): void
    onPause(cb: () => void): void
    onStop(cb: () => void): void
    isPlaying(): boolean
    getDuration(): number
    getCurrentPosition(): number
  }
  export default BenzAMRRecorder
}
