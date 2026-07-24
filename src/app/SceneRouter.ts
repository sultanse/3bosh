export type SceneRoute = "menu" | "loading" | "level";

export interface ManagedScene {
  readonly name: string;
  dispose(): void;
}

export interface SceneFactory {
  create(signal: AbortSignal): Promise<ManagedScene>;
}

export class SceneRouter {
  private active: ManagedScene | undefined;
  private activeController: AbortController | undefined;
  private navigationGeneration = 0;
  private lastError: Error | undefined;

  public constructor(private readonly factories: Readonly<Record<SceneRoute, SceneFactory>>) {}

  public get current(): ManagedScene | undefined {
    return this.active;
  }

  public get error(): Error | undefined {
    return this.lastError;
  }

  public async goTo(route: SceneRoute): Promise<void> {
    const generation = ++this.navigationGeneration;
    this.activeController?.abort();
    const controller = new AbortController();
    this.activeController = controller;
    this.lastError = undefined;

    let candidate: ManagedScene;
    try {
      candidate = await this.factories[route].create(controller.signal);
    } catch (reason: unknown) {
      if (generation === this.navigationGeneration && !controller.signal.aborted) {
        this.lastError = reason instanceof Error ? reason : new Error(String(reason));
      }
      throw reason;
    }

    if (generation !== this.navigationGeneration || controller.signal.aborted) {
      candidate.dispose();
      return;
    }

    const previous = this.active;
    this.active = candidate;
    this.activeController = controller;
    previous?.dispose();
  }

  public dispose(): void {
    this.navigationGeneration += 1;
    this.activeController?.abort();
    this.activeController = undefined;
    this.active?.dispose();
    this.active = undefined;
    this.lastError = undefined;
  }
}
