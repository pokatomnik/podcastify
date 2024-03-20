import { BoundMethod } from "decorate";

export class AsyncQueue {
  #activeTasks = 0;

  #promise = Promise.resolve<unknown>(void 0);

  @BoundMethod
  private incrementActiveTasks() {
    ++this.#activeTasks;
  }

  @BoundMethod
  private decrementActiveTasks() {
    this.#activeTasks = Math.max(0, this.#activeTasks - 1);
  }

  public get activeTasks() {
    return this.#activeTasks;
  }

  @BoundMethod
  public async submitAndGetResult<TResult>(
    task: () => Promise<TResult>
  ): Promise<TResult> {
    const currentPromise = this.#promise;

    this.incrementActiveTasks();
    const newPromise = currentPromise
      .then(task)
      .then((result) => {
        this.decrementActiveTasks();
        return result;
      })
      .catch((error) => {
        this.decrementActiveTasks();
        return Promise.reject(error);
      });
    this.#promise = newPromise.catch(() => void 0);
    return await newPromise;
  }
}
