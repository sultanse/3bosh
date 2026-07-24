import { describe, expect, it, vi } from "vitest";
import { DisposableBag } from "../../src/core/DisposableBag";

describe("DisposableBag", () => {
  it("disposes owned resources once in reverse order", () => {
    const order: string[] = [];
    const bag = new DisposableBag();
    bag.addCallback(() => order.push("first"));
    bag.addCallback(() => order.push("second"));

    bag.dispose();
    bag.dispose();

    expect(order).toEqual(["second", "first"]);
  });

  it("immediately disposes resources added after disposal", () => {
    const dispose = vi.fn();
    const bag = new DisposableBag();
    bag.dispose();
    bag.add({ dispose });

    expect(dispose).toHaveBeenCalledOnce();
  });
});
