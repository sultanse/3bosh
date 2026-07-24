export type SoundCue = "jump" | "collect" | "damage" | "enemyDefeat" | "victory" | "gameOver";
export type MusicTrack = "workshop";

export type VoiceRecipe =
  | {
      readonly kind: "tone";
      readonly offset: number;
      readonly duration: number;
      readonly frequency: number;
      readonly endFrequency: number;
      readonly volume: number;
      readonly type: OscillatorType;
    }
  | {
      readonly kind: "noise";
      readonly offset: number;
      readonly duration: number;
      readonly volume: number;
    };

export const MUSIC_LOOP_SECONDS = 3.2;

export const WORKSHOP_MUSIC_SCORE: readonly VoiceRecipe[] = [
  { kind: "tone", offset: 0, duration: 0.42, frequency: 220, endFrequency: 220, volume: 0.09, type: "triangle" },
  { kind: "tone", offset: 0.4, duration: 0.35, frequency: 277.18, endFrequency: 277.18, volume: 0.09, type: "triangle" },
  { kind: "tone", offset: 0.8, duration: 0.42, frequency: 329.63, endFrequency: 329.63, volume: 0.09, type: "triangle" },
  { kind: "tone", offset: 1.2, duration: 0.35, frequency: 277.18, endFrequency: 277.18, volume: 0.09, type: "triangle" },
  { kind: "tone", offset: 1.6, duration: 0.42, frequency: 196, endFrequency: 196, volume: 0.09, type: "triangle" },
  { kind: "tone", offset: 2, duration: 0.35, frequency: 246.94, endFrequency: 246.94, volume: 0.09, type: "triangle" },
  { kind: "tone", offset: 2.4, duration: 0.42, frequency: 293.66, endFrequency: 293.66, volume: 0.09, type: "triangle" },
  { kind: "tone", offset: 2.8, duration: 0.35, frequency: 246.94, endFrequency: 246.94, volume: 0.09, type: "triangle" },
];

export const CUE_SCORE: Readonly<Record<SoundCue, readonly VoiceRecipe[]>> = {
  jump: [
    { kind: "tone", offset: 0, duration: 0.16, frequency: 240, endFrequency: 520, volume: 0.2, type: "sine" },
  ],
  collect: [
    { kind: "tone", offset: 0, duration: 0.1, frequency: 660, endFrequency: 760, volume: 0.18, type: "triangle" },
    { kind: "tone", offset: 0.09, duration: 0.13, frequency: 990, endFrequency: 1_120, volume: 0.16, type: "triangle" },
  ],
  damage: [
    { kind: "noise", offset: 0, duration: 0.18, volume: 0.17 },
    { kind: "tone", offset: 0, duration: 0.2, frequency: 150, endFrequency: 82, volume: 0.16, type: "sawtooth" },
  ],
  enemyDefeat: [
    { kind: "tone", offset: 0, duration: 0.13, frequency: 460, endFrequency: 260, volume: 0.16, type: "square" },
    { kind: "tone", offset: 0.1, duration: 0.16, frequency: 340, endFrequency: 170, volume: 0.13, type: "triangle" },
  ],
  victory: [
    { kind: "tone", offset: 0, duration: 0.21, frequency: 523.25, endFrequency: 512.79, volume: 0.18, type: "triangle" },
    { kind: "tone", offset: 0.13, duration: 0.21, frequency: 659.25, endFrequency: 646.07, volume: 0.18, type: "triangle" },
    { kind: "tone", offset: 0.26, duration: 0.21, frequency: 783.99, endFrequency: 768.31, volume: 0.18, type: "triangle" },
  ],
  gameOver: [
    { kind: "tone", offset: 0, duration: 0.28, frequency: 392, endFrequency: 384.16, volume: 0.18, type: "triangle" },
    { kind: "tone", offset: 0.2, duration: 0.28, frequency: 293.66, endFrequency: 287.79, volume: 0.18, type: "triangle" },
    { kind: "tone", offset: 0.4, duration: 0.28, frequency: 196, endFrequency: 192.08, volume: 0.18, type: "triangle" },
  ],
};
