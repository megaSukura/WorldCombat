/** Two real endpoints flash briefly; only a successful swap draws their crossing path. */
const AllySwitchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fold: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "fold_ring", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 14, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.1], spin: 10,
                    lifetime: [8, 14], size: [0.22, 0.5], sizeMode: "index",
                    color: 0x7FD8FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "fold_mote", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 10, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xDFF4FF, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        swap: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "swap_thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" }, rate: 110, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0x7FD8FF, alpha: [0.9, 0], light: "full", maxParticles: 160
                },
                {
                    name: "swap_flash", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9, spin: 12,
                    lifetime: [10, 20], size: [0.2, 0.04],
                    color: 0xDFF4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "swap_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 2, interval: 3 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [10, 18], size: [0.4, 0.85], sizeMode: "index",
                    color: 0x7FD8FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                },
                {
                    name: "swap_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0x7FD8FF, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        partner: { duration: 10, emitters: [{ name: "partner_foot", bind: "point", fit: "world", particle: "world_combat_core:cobblemon/generic/psychic/psyring1", burst: { count: 2 }, shape: { kind: "ring", radius: .6 }, lifetime: [4,8], size: [.35,.08], color: 0x7FD8FF, alpha: [.6,0] }] },
        arrival: { duration: 12, emitters: [{ name: "refraction", bind: "point", fit: "world", particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan", burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "ring", radius: .6 }, speed: [.02,.07], lifetime: [4,10], size: [.12,.01], color: 0x7FD8FF, alpha: [.6,0] }] },
        fizzle: { duration: 10, emitters: [{ name: "extinguish", bind: "point", fit: "world", particle: "world_combat_core:cobblemon/generic/tinydust", burst: { count: 6 }, shape: { kind: "ring", radius: .35 }, lifetime: [3,7], size: [.04,.01], color: 0x7FD8FF, alpha: [.3,0] }] }
    }
};
WorldCombatParticles.scene("world_combat:move_allyswitch", 1, AllySwitchDefinition);
