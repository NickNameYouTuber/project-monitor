/**
 * Утилита для детекции говорения по аудио-потоку
 */

export class AudioLevelDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number;
  private rafId: number | null = null;
  private onSpeakingChange: ((isSpeaking: boolean) => void) | null = null;
  private isSpeaking: boolean = false;
  private silentFrames: number = 0;
  private speakingFrames: number = 0;
  private readonly SILENT_THRESHOLD = 60; // кадров тишины для остановки (~500мс задержка)
  private readonly SPEAKING_THRESHOLD = 2; // кадров звука для начала (быстрая активация)

  constructor(stream: MediaStream, threshold: number = 40) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.threshold = threshold;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  start(callback: (isSpeaking: boolean) => void): void {
    this.onSpeakingChange = callback;
    this.detectAudioLevel();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audioContext.close();
  }

  private detectAudioLevel(): void {
    this.analyser.getByteFrequencyData(this.dataArray);

    // Вычисляем средний уровень звука
    const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;

    if (average > this.threshold) {
      this.speakingFrames++;
      this.silentFrames = 0;

      if (!this.isSpeaking && this.speakingFrames >= this.SPEAKING_THRESHOLD) {
        this.isSpeaking = true;
        this.onSpeakingChange?.(true);
      }
    } else {
      this.silentFrames++;
      this.speakingFrames = 0;

      if (this.isSpeaking && this.silentFrames >= this.SILENT_THRESHOLD) {
        this.isSpeaking = false;
        this.onSpeakingChange?.(false);
      }
    }

    this.rafId = requestAnimationFrame(() => this.detectAudioLevel());
  }
}

