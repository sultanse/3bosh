import { describe, expect, it } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PatrolEnemy } from "../../src/gameplay/enemies/PatrolEnemy";

const createEnemy = () => new PatrolEnemy({
  id: "patrol-a",
  position: new Vector3(5, 1, 0),
  patrolMinX: 4,
  patrolMaxX: 6,
  speed: 2,
  score: 100,
});

describe("PatrolEnemy", () => {
  it("reverses direction when the next step reaches a patrol bound", () => {
    const enemy = createEnemy();

    enemy.update({
      stepSeconds: 1,
      playerPosition: Vector3.Zero(),
      worldQueries: { isBlockedAhead: () => false, hasGroundAhead: () => true },
    });

    expect(enemy.position.x).toBe(6);
    expect(enemy.direction).toBe(-1);
  });

  it("reverses direction at a blocking obstacle or a missing ground edge", () => {
    const blocked = createEnemy();
    blocked.update({
      stepSeconds: 1 / 60,
      playerPosition: Vector3.Zero(),
      worldQueries: { isBlockedAhead: () => true, hasGroundAhead: () => true },
    });
    expect(blocked.direction).toBe(-1);

    const edge = createEnemy();
    edge.update({
      stepSeconds: 1 / 60,
      playerPosition: Vector3.Zero(),
      worldQueries: { isBlockedAhead: () => false, hasGroundAhead: () => false },
    });
    expect(edge.direction).toBe(-1);
  });

  it("stops updating and emits defeat exactly once", () => {
    const enemy = createEnemy();
    const defeated: string[] = [];
    enemy.onDefeated((event) => defeated.push(event.enemyId));

    expect(enemy.takeDamage(1, "stomp").defeated).toBe(true);
    expect(enemy.takeDamage(1, "stomp").defeated).toBe(false);
    const xAfterDefeat = enemy.position.x;
    enemy.update({
      stepSeconds: 1,
      playerPosition: Vector3.Zero(),
      worldQueries: { isBlockedAhead: () => false, hasGroundAhead: () => true },
    });

    expect(enemy.position.x).toBe(xAfterDefeat);
    expect(defeated).toEqual(["patrol-a"]);
  });
});
