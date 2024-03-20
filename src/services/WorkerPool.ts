import { Provide } from "microdi";
import { WorkerConfiguration } from "services/WorkerConfiguration.ts";
import { AsyncQueue } from "shared/AsyncQueue.ts";
import { PanicBus } from "services/PanicBus.ts";
import { BoundMethod } from "decorate";

@Provide(WorkerConfiguration, PanicBus)
export class WorkerPool {
  private readonly workers: ReadonlyArray<AsyncQueue>;

  public constructor(
    workerConfiguration: WorkerConfiguration,
    private readonly panicBus: PanicBus
  ) {
    const workers: Array<AsyncQueue> = [];
    for (let i = 0; i < workerConfiguration.workers; ++i) {
      workers.push(new AsyncQueue());
    }
    this.workers = workers;
  }

  @BoundMethod
  public submitTaskAndGetResult<TResult>(task: () => Promise<TResult>) {
    const lessBusyWorker = this.getLessBusyWorker();
    return lessBusyWorker.submitAndGetResult(task);
  }

  private getLessBusyWorker() {
    let lessBusyQueue: AsyncQueue | null = null;
    for (const currentQueue of this.workers) {
      if (
        lessBusyQueue === null ||
        currentQueue.activeTasks < lessBusyQueue.activeTasks
      ) {
        lessBusyQueue = currentQueue;
      }
    }
    if (lessBusyQueue === null) {
      this.panicBus.publish({
        serviceName: WorkerPool.name,
        message: "No workers available to submit a task",
      });
      throw new Error();
    }
    return lessBusyQueue;
  }
}
