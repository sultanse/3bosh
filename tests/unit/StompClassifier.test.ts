import { describe, expect, it } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import {
  InteractionSystem,
  type BoundsSnapshot,
  type PlayerEnemyContact,
} from "../../src/gameplay/interactions/InteractionSystem";

const bounds = ({
  minX = 0,
  maxX = 1,
  feetY = 3,
  topY = feetY + 1.8,
}: Partial<BoundsSnapshot> = {}): BoundsSnapshot => ({ minX, maxX, feetY, topY });

const contact = (overrides: Partial<PlayerEnemyContact>): PlayerEnemyContact => ({
  enemyId: "patrol-a",
  previousPlayerBounds: bounds(),
  currentPlayerBounds: bounds(),
  enemyBounds: bounds({ minX: 0, maxX: 1, feetY: 1.5, topY: 2.5 }),
  relativeVelocity: new Vector3(0, -4, 0),
  enemyDefeated: false,
  ...overrides,
});

describe("InteractionSystem", () => {
  const interactions = new InteractionSystem({ stompMinDownSpeed: 2, stompTolerance: 0.1 });

  it("classifies a swept descending top contact as a stomp", () => {
    expect(interactions.classify(contact({
      previousPlayerBounds: bounds({ feetY: 3 }),
      currentPlayerBounds: bounds({ feetY: 2.4 }),
      enemyBounds: bounds({ feetY: 1.5, topY: 2.5 }),
      relativeVelocity: new Vector3(0, -4, 0),
    }))).toBe("stomp");
  });

  it("classifies a horizontal overlap that is not a downward crossing as side damage", () => {
    expect(interactions.classify(contact({
      previousPlayerBounds: bounds({ feetY: 2.2 }),
      currentPlayerBounds: bounds({ feetY: 2.1 }),
      enemyBounds: bounds({ feetY: 1.5, topY: 2.5 }),
      relativeVelocity: new Vector3(3, -1, 0),
    }))).toBe("side");
  });

  it("does not classify a separated or already defeated enemy", () => {
    expect(interactions.classify(contact({
      currentPlayerBounds: bounds({ minX: 3, maxX: 4, feetY: 2.4 }),
    }))).toBe("none");
    expect(interactions.classify(contact({ enemyDefeated: true }))).toBe("none");
  });
});
