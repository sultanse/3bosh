export const CollisionLayer = {
  world: 1 << 0,
  player: 1 << 1,
  enemy: 1 << 2,
  projectile: 1 << 3,
  trigger: 1 << 4,
  collectible: 1 << 5,
} as const;

export const CollisionMask = {
  world: CollisionLayer.player | CollisionLayer.enemy | CollisionLayer.projectile,
  player:
    CollisionLayer.world |
    CollisionLayer.enemy |
    CollisionLayer.projectile |
    CollisionLayer.trigger |
    CollisionLayer.collectible,
  enemy: CollisionLayer.world | CollisionLayer.player | CollisionLayer.projectile,
  projectile: CollisionLayer.world | CollisionLayer.player | CollisionLayer.enemy,
  trigger: CollisionLayer.player,
  collectible: CollisionLayer.player,
} as const;
