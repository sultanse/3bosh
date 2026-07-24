export interface DisposableLike {
  dispose(): void;
}

export class DisposableBag implements DisposableLike {
  private readonly disposables: DisposableLike[] = [];
  private disposed = false;

  public add(disposable: DisposableLike): void {
    if (this.disposed) {
      disposable.dispose();
      return;
    }

    this.disposables.push(disposable);
  }

  public addCallback(callback: () => void): void {
    this.add({ dispose: callback });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    for (const disposable of this.disposables.splice(0).reverse()) {
      disposable.dispose();
    }
  }
}
