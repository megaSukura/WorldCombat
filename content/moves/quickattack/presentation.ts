/** A short straight stroke follows each real displacement; contact cuts it off with one narrow brake beat. */
const QuickattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 2 }, exit: { stop: 0, drain: 2 },
            emitters: [{
                name: "ready", bind: "source", height: 0, offset: [0, 0.04, 0],
                particle: "world_combat_core:cobblemon/generic/tinydust",
                burst: { count: 3 }, shape: { kind: "ring", radius: 0.2 },
                direction: "inward", speed: [0.04, 0.06], lifetime: [2, 3], size: [0.05, 0.01],
                color: 0xFFF4D8, alpha: [0.5, 0], light: "world", maxParticles: 5
            }]
        },
        segment: {
            duration: 1, exit: { stop: 0, drain: 4 },
            emitters: [{
                name: "actual_path", bind: "path", fit: "world",
                particle: "world_combat_core:cobblemon/generic/speedlines",
                burst: { count: { data: "count", fallback: 5 } }, shape: { kind: "polyline" },
                direction: [{ data: "backward.0", fallback: 0 }, { data: "backward.1", fallback: 0 }, { data: "backward.2", fallback: -1 }],
                speed: [0.06, 0.1], lifetime: [3, 4], size: [0.24, 0.04],
                color: 0xFFF4D8, alpha: [0.8, 0], light: "full", maxParticles: 20
            }]
        },
        strike: {
            duration: 1, exit: { stop: 0, drain: 4 },
            emitters: [{
                name: "tap", bind: "point", fit: "world",
                particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                burst: { count: 2 }, shape: { kind: "point" }, direction: "outward", speed: [0.01, 0.03],
                lifetime: [3, 4], size: [0.22, 0.03], color: 0xFFF6E2, alpha: [0.9, 0], light: "full", maxParticles: 4
            }]
        },
        brake: {
            duration: 1, exit: { stop: 0, drain: 4 },
            emitters: [{
                name: "stop_line", bind: "source", height: 0, offset: [0, 0.04, 0],
                particle: "world_combat_core:cobblemon/generic/tinydust",
                burst: { count: 5 }, shape: { kind: "box", size: [0.24, 0.02, 0.24] },
                direction: [{ data: "backward.0", fallback: 0 }, { data: "backward.1", fallback: 0 }, { data: "backward.2", fallback: -1 }],
                speed: [0.05, 0.09], lifetime: [3, 4], size: [0.06, 0.01],
                color: 0xEADDC0, alpha: [0.55, 0], light: "world", maxParticles: 6
            }]
        }
    }
};
WorldCombatParticles.scene("world_combat:move_quickattack", 1, QuickattackDefinition);
