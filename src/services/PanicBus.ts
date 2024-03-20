import { BoundMethod } from "decorate";
import { Provide } from "microdi";
import { pubSub, PubSub, SubscriberCallback } from "shared/PubSub.ts";

type PanicBusMessage = Readonly<{
  serviceName: string;
  message: string;
}>;

@Provide()
export class PanicBus implements PubSub<PanicBusMessage> {
  private readonly pubSub = pubSub<PanicBusMessage>();

  @BoundMethod
  public subscribe(callback: SubscriberCallback<PanicBusMessage>) {
    return this.pubSub.subscribe(callback);
  }

  @BoundMethod
  public publish(message: PanicBusMessage): void {
    return this.pubSub.publish(message);
  }
}
