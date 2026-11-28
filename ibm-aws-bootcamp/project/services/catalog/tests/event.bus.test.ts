// Unit tests for InMemoryEventBus: publish, subscribe, unsubscribe, and that one
// broken subscriber cannot break publish() (i.e. cannot turn a POST into a 500).
import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, type DomainEvent } from "../src/shared/events/event.bus.js";

const EVENT: DomainEvent = {
  type: "product.created",
  product: { id: "p1", name: "Monitor", price: 5990 },
};

describe("InMemoryEventBus", () => {
  it("delivers a published event to every subscriber", () => {
    const bus = new InMemoryEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);
    bus.publish(EVENT);
    expect(a).toHaveBeenCalledExactlyOnceWith(EVENT);
    expect(b).toHaveBeenCalledExactlyOnceWith(EVENT);
  });

  it("a subscriber keeps getting events: every publish, not only the first", () => {
    const bus = new InMemoryEventBus();
    const a = vi.fn();
    bus.subscribe(a);
    bus.publish(EVENT);
    bus.publish(EVENT);
    bus.publish(EVENT);
    expect(a).toHaveBeenCalledTimes(3);
  });

  it("publish with no subscribers does nothing (and does not throw)", () => {
    expect(() => new InMemoryEventBus().publish(EVENT)).not.toThrow();
  });

  it("unsubscribe stops only that subscriber", () => {
    const bus = new InMemoryEventBus();
    const a = vi.fn();
    const b = vi.fn();
    const unsubscribeA = bus.subscribe(a);
    bus.subscribe(b);
    unsubscribeA();
    bus.publish(EVENT);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it("calling unsubscribe twice is harmless", () => {
    const bus = new InMemoryEventBus();
    const a = vi.fn();
    const unsubscribe = bus.subscribe(a);
    unsubscribe();
    unsubscribe();
    bus.publish(EVENT);
    expect(a).not.toHaveBeenCalled();
  });

  it("the same handler subscribed twice gets the event twice, and each unsubscribe removes one", () => {
    const bus = new InMemoryEventBus();
    const a = vi.fn();
    const first = bus.subscribe(a);
    bus.subscribe(a);
    first();
    bus.publish(EVENT);
    expect(a).toHaveBeenCalledOnce();
  });

  it("a throwing subscriber: publish does not throw, later subscribers still run, error is reported", () => {
    const onError = vi.fn();
    const bus = new InMemoryEventBus(onError);
    const boom = new Error("subscriber bug");
    const after = vi.fn();
    bus.subscribe(() => {
      throw boom;
    });
    bus.subscribe(after);

    expect(() => bus.publish(EVENT)).not.toThrow();
    expect(after).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledExactlyOnceWith(boom, EVENT);
  });
});
