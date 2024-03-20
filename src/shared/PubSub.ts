import { BoundMethod } from "decorate";

export type SubscriberCallback<T> = (value: T) => void;

export interface Subscription {
  unsubscribe(): void;
}

export interface Subscriber<T> {
  subscribe(callback: SubscriberCallback<T>): Subscription;
}

export interface Publisher<T> {
  publish(value: T): void;
}

export interface PubSub<T> extends Publisher<T>, Subscriber<T> {}

class PubSubImpl<T> implements PubSub<T> {
  private readonly subscribers: Set<SubscriberCallback<T>> = new Set();

  @BoundMethod
  public publish(value: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(value);
      } catch {
        /* noop */
      }
    }
  }

  @BoundMethod
  public subscribe(callback: SubscriberCallback<T>): Subscription {
    this.subscribers.add(callback);
    const unsubscribe = () => {
      this.subscribers.delete(callback);
    };
    return { unsubscribe };
  }
}

export const pubSub = <T>(): PubSub<T> => new PubSubImpl<T>();
