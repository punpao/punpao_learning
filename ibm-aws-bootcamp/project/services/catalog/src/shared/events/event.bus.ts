// Event bus: modules announce "something happened" (publish) without knowing
// who listens (subscribe). The products module does not know WebSocket exists.
//
// This in-memory version only reaches listeners in THIS process. With 2+ ECS tasks,
// a WebSocket client on task A never hears about a product created on task B.
// A shared bus (SNS, EventBridge, Redis pub/sub) would implement the same interface.
import { EventEmitter } from "node:events";
import { logger } from "../logger.js";

export type DomainEvent = {
  type: "product.created";
  product: { id: string; name: string; price: number };
};

export interface EventBus {
  publish(event: DomainEvent): void;
  // Returns an "unsubscribe" function: call it to stop listening.
  subscribe(handler: (event: DomainEvent) => void): () => void;
}

// One fixed channel name. (Not "error": EventEmitter treats that name specially
// and THROWS if nobody listens to it.)
const CHANNEL = "domain-event";

export class InMemoryEventBus implements EventBus {
  private readonly emitter = new EventEmitter();

  // onHandlerError: what to do when a subscriber throws. Default: log it.
  constructor(
    private readonly onHandlerError: (err: unknown, event: DomainEvent) => void = (err, event) =>
      logger.error({ err, eventType: event.type }, "event subscriber failed"),
  ) {}

  publish(event: DomainEvent): void {
    // emit() calls every listener synchronously, right here.
    this.emitter.emit(CHANNEL, event);
  }

  subscribe(handler: (event: DomainEvent) => void): () => void {
    // Wrap the handler: emit() is synchronous, so a throwing subscriber would
    // otherwise throw INTO publish(), i.e. into POST /products AFTER the product
    // was saved → the client gets a 500 for a create that worked, and the
    // listeners after it never run.
    const listener = (event: DomainEvent) => {
      try {
        handler(event);
      } catch (err) {
        this.onHandlerError(err, event);
      }
    };
    this.emitter.on(CHANNEL, listener);
    return () => {
      this.emitter.off(CHANNEL, listener);
    };
  }
}
