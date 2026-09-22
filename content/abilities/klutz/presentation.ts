/**
 * Particle language for Klutz.
 *
 * Klutz is a self trade: the holder cannot use its held item, but while it still carries one it
 * fights unburdened, so the whole scene reads as weight leaving and returning to the body.
 * One family, the effect's own amber gold (0xC9A227): the burden side only darkens within it.
 *
 *   unburden   - the item is set down and the buff starts: a gold ring snaps out at the feet,
 *                a soft core pops at the body, sparks scatter and a small updraft lifts.
 *   unburdened - the buff sustains: a low amber ring breathes at the feet, fine dust drifts up,
 *                a few swift motes rise off the body.
 *   burdened   - the buff drops when no item is held: a dark-gold ring contracts inward, dust is
 *                pressed down and a muted settle knock marks the weight coming back.
 *
 * Every moment binds `source`, because the ability pulse hook's source is the holder; previews
 * with `here` therefore show the whole scene on the player.
 */
const KlutzDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // One-shot when the unburdened buff first applies: the weight comes off.
        unburden: {
            duration: 36,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, at: 1 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.10, 0.16],
                    lifetime: [14, 22], size: [0.30, 0.80],
                    color: 0xC9A227, alpha: [0.75, 0], light: "full"
                },
                {
                    name: "pop", bind: "source", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 8, at: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.20],
                    lifetime: [8, 14], size: [0.30, 0.04], sizeMode: "index",
                    color: 0xFFF0C8, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "shards", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], spread: 20,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [12, 24], size: [0.08, 0.01],
                    color: 0xFFD86B, alpha: [0.95, 0], light: "full", maxParticles: 36
                },
                {
                    name: "updraft", bind: "source", offset: [0, 0.08, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: 3, at: 1, interval: 3, repeats: 3 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.03, 0.08],
                    lifetime: [16, 28], size: [0.50, 0.90], sizeMode: "sin",
                    color: 0xFFE9A8, alpha: [0.35, 0], light: "full", maxParticles: 12
                },
                {
                    name: "swift_mote", bind: "source", offset: [0, 0.30, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 6, at: 2 }, shape: { kind: "sphere", radius: 0.30 },
                    direction: "up", speed: [0.05, 0.12],
                    lifetime: [16, 28], size: [0.10, 0.02],
                    color: 0xFFF0C8, alpha: [0.90, 0], light: "full", maxParticles: 16
                }
            ]
        },
        // Persistent while the buff holds: low and off the sight line, breathing slowly.
        unburdened: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "foot_ring", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [30, 44], size: [0.42, 0.52], sizeMode: "sin",
                    color: 0xC9A227, alpha: [0.18, 0.07], alphaMode: "sin",
                    light: "world", maxParticles: 12
                },
                {
                    name: "lift_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 36], size: [0.055, 0.01],
                    color: 0xFFD86B, alpha: [0.50, 0], light: "full", maxParticles: 26
                },
                {
                    name: "swift_mote", bind: "source", offset: [0, 0.30, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 3, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [22, 38], size: [0.10, 0.02],
                    color: 0xFFE9A8, alpha: [0.40, 0], alphaMode: "sin",
                    light: "full", maxParticles: 12
                }
            ]
        },
        // One-shot when the buff drops: the weight settles back onto the body.
        burdened: {
            duration: 32,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "press_ring", bind: "source", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.85 },
                    direction: "inward", speed: [0.05, 0.08],
                    lifetime: [12, 16], size: [0.42, 0.16],
                    color: 0x8A6E1E, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "down_dust", bind: "source", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.38 },
                    direction: "down", speed: [0.03, 0.10],
                    gravity: 0.02, drag: 0.95,
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0x6E5612, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "settle", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "down", speed: [0.04, 0.12],
                    lifetime: [8, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0x9A7B1E, alpha: [0.70, 0], light: "world"
                },
                {
                    name: "lower_orb", bind: "source", offset: [0, 0.40, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "down", speed: [0.03, 0.08],
                    lifetime: [14, 22], size: [0.14, 0.05],
                    color: 0xC9A227, alpha: [0.50, 0], light: "world", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_klutz", 1, KlutzDefinition);
