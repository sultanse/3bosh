import type { DisposableLike } from "./DisposableBag";

export interface GameEvents {
  readonly playerJumped: { readonly kind: "ground" | "coyote" | "double" };
  readonly playerDamaged: {
    readonly health: number;
    readonly amount: number;
    readonly source: "enemy" | "projectile" | "fall";
  };
  readonly healthChanged: { readonly health: number; readonly maxHealth: number };
  readonly shieldChanged: { readonly active: boolean; readonly expiresAtSeconds: number | null };
  readonly playerDied: undefined;
  readonly playerRespawned: { readonly x: number; readonly y: number };
  readonly scoreChanged: { readonly score: number; readonly collectibles: number };
  readonly collectibleCollected: {
    readonly kind: "crystal" | "health" | "shield";
    readonly scoreDelta: number;
  };
  readonly enemyDefeated: { readonly enemyId: string; readonly scoreDelta: number };
  readonly audioCueRequested: { readonly cue: "enemy-defeated" | "player-hit" | "projectile-fired" };
  readonly checkpointActivated: { readonly checkpointId: string };
  readonly levelCompleted: { readonly score: number; readonly collectibles: number };
  readonly pauseRequested: undefined;
  readonly restartRequested: undefined;
}

type EventListener<Payload> = (payload: Payload) => void;

export class TypedEventBus<T extends object> implements DisposableLike {
  private readonly listeners = new Map<keyof T, Set<EventListener<T[keyof T]>>>();
  private disposed = false;

  public on<K extends keyof T>(key: K, listener: EventListener<T[K]>): DisposableLike {
    if (this.disposed) {
      return { dispose: () => undefined };
    }

    const listeners = this.listeners.get(key) ?? new Set<EventListener<T[keyof T]>>();
    this.listeners.set(key, listeners);
    const untypedListener = listener as EventListener<T[keyof T]>;
    listeners.add(untypedListener);

    return {
      dispose: () => {
        listeners.delete(untypedListener);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      },
    };
  }

  public emit<K extends keyof T>(key: K, payload: T[K]): void {
    const listeners = this.listeners.get(key);
    if (this.disposed || listeners === undefined) {
      return;
    }

    for (const listener of [...listeners]) {
      listener(payload);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }
}
