import { BoundMethod } from "decorate";
import { Provide } from "microdi";
import { AsyncQueue } from "shared/AsyncQueue.ts";
import { Logger } from "services/Logger.ts";

@Provide()
export class ConsoleLogger implements Logger {
  private queue = new AsyncQueue();

  private scheduleMicrotask(fn: () => void) {
    return new Promise<void>((resolve) => {
      try {
        fn();
      } catch {
        // do nothing
      } finally {
        resolve();
      }
    });
  }

  private getTimedMessage(message: string) {
    return `[${new Date().toISOString()}] ${message}`;
  }

  @BoundMethod
  public info(message: string): void {
    const timedMessage = this.getTimedMessage(message);
    this.queue.submitAndGetResult(() => {
      return this.scheduleMicrotask(() => {
        console.log(timedMessage);
      });
    });
  }

  @BoundMethod
  public warn(message: string): void {
    const timedMessage = this.getTimedMessage(message);
    this.queue.submitAndGetResult(() => {
      return this.scheduleMicrotask(() => {
        console.warn(timedMessage);
      });
    });
  }

  @BoundMethod
  public error(message: string): void {
    const timedMessage = this.getTimedMessage(message);
    this.queue.submitAndGetResult(() => {
      return this.scheduleMicrotask(() => {
        console.error(timedMessage);
      });
    });
  }
}
