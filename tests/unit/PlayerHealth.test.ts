import { describe, expect, it } from "vitest";
import { PlayerHealth } from "../../src/gameplay/player/PlayerHealth";

describe("PlayerHealth", () => {
  it("applies contact damage after its invulnerability window expires", () => {
    const health = new PlayerHealth(3, 1.25);

    expect(health.damage(1, "enemy", 0)).toEqual({
      applied: true,
      health: 2,
      died: false,
    });
    expect(health.damage(1, "enemy", 0.5)).toMatchObject({ applied: false });
    expect(health.damage(1, "enemy", 1.26)).toEqual({
      applied: true,
      health: 1,
      died: false,
    });
  });

  it("caps healing at the configured maximum", () => {
    const health = new PlayerHealth(3, 1.25);
    health.damage(1, "enemy", 0);

    expect(health.heal(10)).toBe(3);
  });

  it("consumes a shield on the first blocked contact hit", () => {
    const health = new PlayerHealth(3, 1.25);
    health.grantShield(10, 0);

    expect(health.damage(1, "projectile", 1)).toEqual({
      applied: false,
      health: 3,
      died: false,
      blockedByShield: true,
    });
    expect(health.damage(1, "enemy", 2)).toEqual({
      applied: true,
      health: 2,
      died: false,
    });
  });

  it("allows falls to bypass shields and contact invulnerability", () => {
    const health = new PlayerHealth(3, 1.25);
    health.grantShield(10, 0);
    health.grantInvulnerability(10, 0);

    expect(health.damage(1, "fall", 1)).toEqual({
      applied: true,
      health: 2,
      died: false,
    });
  });
});
