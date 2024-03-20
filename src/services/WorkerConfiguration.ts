import { Provide } from "microdi";

@Provide()
export class WorkerConfiguration {
  private static readonly DEFAULT_WORKERS = 4;

  public readonly workers: number;

  public constructor() {
    const workersStr = Deno.env.get("WORKERS");
    if (!workersStr) {
      this.workers = WorkerConfiguration.DEFAULT_WORKERS;
    } else {
      const workers = Number.parseInt(workersStr);
      if (Number.isNaN(workers)) {
        this.workers = WorkerConfiguration.DEFAULT_WORKERS;
      }
      this.workers = Math.max(1, Math.floor(workers));
    }
  }
}
