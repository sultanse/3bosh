import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class CameraShake {
  private amplitude = 0;
  private remainingSeconds = 0;
  private elapsedSeconds = 0;

  public start(amplitude: number, durationSeconds: number): void {
    this.amplitude = Math.max(0, amplitude);
    this.remainingSeconds = Math.max(0, durationSeconds);
    this.elapsedSeconds = 0;
  }

  public update(stepSeconds: number): Vector3 {
    if (this.remainingSeconds <= 0) {
      return Vector3.Zero();
    }
    this.elapsedSeconds += stepSeconds;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - stepSeconds);
    const decay = this.remainingSeconds === 0 ? 0 : this.remainingSeconds / (this.remainingSeconds + this.elapsedSeconds);
    const offset = this.amplitude * decay;
    return new Vector3(Math.sin(this.elapsedSeconds * 71) * offset, Math.cos(this.elapsedSeconds * 53) * offset, 0);
  }
}
