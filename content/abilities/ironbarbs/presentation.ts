/**
 * Client definition for Iron Barbs. One cold-steel family on short, sharp accents.
 *
 * The ability is the holder answering a melee blow with a spike, so every moment reads as
 * one beat of that answer:
 *   bristle - the proc: spikes thrust out of the body and metal filings scatter.
 *   gather  - the one-second pause: filings draw into a barb forming above the holder.
 *   launch  - the barb leaves the holder: a steel flash and a spray of shards.
 *   flight  - the moving point renews every travel tick, leaving a cold streak behind the shard.
 *   impact  - the barb lands on the attacker: steel burst, contracting ring, falling dust.
 *   cripple - a pierced Pokemon guard: a dark steel clamp closes on the body.
 *
 * Steel greys carry the mass and the neutral dust; the only saturated colour is the cold glint
 * 0xCFE8FF on the small emphasis sprites. The gather sits above the head so the holder stays
 * readable, and the flight streak is thin and short-lived so it never hides the attacker.
 */
const IronBarbsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // The proc: the body bristles. A steel flash at the body, a ring of spikes snapping out
        // with the filings, and a few cold glints. One shot, no lingering layers.
        bristle: {
            duration: 26,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "spike_flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.6 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.28, 0.03], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "spike_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.14], spin: 12,
                    lifetime: [14, 22], size: [0.32, 0.10],
                    color: 0xB8C2CC, alpha: [0.9, 0], light: "full", maxParticles: 20
                },
                {
                    name: "filings", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 25, gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x9AA6B2, alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "cold_glint", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xCFE8FF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 14
                }
            ]
        },
        // The one-second pause: a barb forms above the holder, filings drawn inward, a slow core
        // pulse. Sparse and above the head so the fighter below stays clear.
        gather: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "orbit", bind: "point", offset: [0, 2.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    rate: 12, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.01, 0.03], spin: 20,
                    lifetime: [16, 28], size: [0.16, 0.05],
                    color: 0xB8C2CC, alpha: [0.8, 0], light: "full", maxParticles: 26
                },
                {
                    name: "core", bind: "point", offset: [0, 2.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 4, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.14, 0.05], sizeMode: "sin",
                    color: 0xCFE8FF, alpha: [0.7, 0], alphaMode: "sin", light: "full",
                    bloom: 0.25, maxParticles: 12
                },
                {
                    name: "settle", bind: "point", offset: [0, 2.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 26], size: [0.05, 0.01],
                    color: 0x8A949E, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        // The barb leaves the holder: a muzzle flash where the shard was, shards thrown outward,
        // cold glints on the launch. One shot; the travel streak takes over from here.
        launch: {
            duration: 24,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "muzzle_flash", bind: "point", offset: [0, 2.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.22, thickness: 0.6 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [7, 12], size: [0.3, 0.04], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "launch_shards", bind: "point", offset: [0, 2.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.1, 0.25], spread: 30, gravity: 0.03, drag: 0.9, spin: 24,
                    lifetime: [10, 20], size: [0.16, 0.03],
                    color: 0xB8C2CC, alpha: [0.9, 0], light: "full", maxParticles: 20
                },
                {
                    name: "launch_glints", bind: "point", offset: [0, 2.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xCFE8FF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        // The moving point: the server renews this at the shard each travel tick, so the short-lived
        // cold streaks and filings string together into one barb trail.
        flight: {
            exit: { drain: 8 },
            emitters: [
                {
                    name: "streak", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 90, shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [5, 10], size: [0.16, 0.02],
                    color: 0xCFE8FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 50
                },
                {
                    name: "filings", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.01, 0.05], spread: 60,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x9AA6B2, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // The barb lands: a steel burst, shards driven into the body, a cold ring contracting onto
        // it, and heavy dust sinking. Bound to the hit point so it reads even on a killing blow.
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "core", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 15], size: [0.34, 0.04], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.3], spread: 30, gravity: 0.05, drag: 0.9, spin: 30,
                    lifetime: [12, 24], size: [0.16, 0.03],
                    color: 0xB8C2CC, alpha: [0.95, 0], light: "full", maxParticles: 30
                },
                {
                    name: "clamp_ring", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 28 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.06, 0.1],
                    lifetime: [12, 16], size: [0.4, 0.16],
                    color: 0x8A949E, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "fell_dust", bind: "point", offset: [0, 0.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.02, drag: 0.95,
                    lifetime: [14, 24], size: [0.06, 0.02],
                    color: 0x6A737C, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // The Pokemon extra layer made visible: the stage the barbs took away. A dark steel clamp
        // closes on the guard and a few shards stay lodged in the body.
        cripple: {
            duration: 26,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "guard_clamp", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.09],
                    lifetime: [12, 18], size: [0.35, 0.12],
                    color: 0x5A626B, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "lodged", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 8 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [16, 26], size: [0.14, 0.05],
                    color: 0xB8C2CC, alpha: [0.8, 0], light: "full", maxParticles: 12
                },
                {
                    name: "dull_glint", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xCFE8FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 8
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_ironbarbs", 1, IronBarbsDefinition);
