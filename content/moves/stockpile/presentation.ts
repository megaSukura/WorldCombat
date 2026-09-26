/** Amber stored breaths: one visible bead per live layer, a short release flash when spent. */
const StockpileDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.9, spin: 10,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFF3C4, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 34
                }
            ]
        },
        store: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "store_core", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 6, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.01, 0.05], spin: 14,
                    lifetime: [12, 22], size: { data: "shellSize", fallback: 0.2 },
                    color: 0xFFF3C4, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 22
                },
                {
                    name: "store_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "layer", fallback: 1 }, interval: 5 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [14, 24], size: [0.4, 0.75], sizeMode: "index",
                    color: 0xF0B23A, alpha: [0.65, 0], light: "world", maxParticles: 24
                },
                {
                    name: "store_shard", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "charge", fallback: 10 } }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF0B23A, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        guard: {
            exit: { drain: 12 },
            emitters: [
                { name: "stored_left", bind: "target", fit: "none", height: 0.45, offset: [-0.28, 0, 0.25],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb", rate: 3,
                    shape: { kind: "sphere", radius: 0.025 }, speed: 0, lifetime: [18, 22], size: 0.16,
                    color: 0xF0B23A, alpha: [0.65, 0], light: "full", maxParticles: 5 },
                { name: "stored_middle", bind: "target", fit: "none", height: 0.45, offset: [0, 0, 0.3],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb", rate: { data: "orb2", fallback: 0 },
                    shape: { kind: "sphere", radius: 0.025 }, speed: 0, lifetime: [18, 22], size: 0.16,
                    color: 0xF0B23A, alpha: [0.65, 0], light: "full", maxParticles: 5 },
                { name: "stored_right", bind: "target", fit: "none", height: 0.45, offset: [0.28, 0, 0.25],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb", rate: { data: "orb3", fallback: 0 },
                    shape: { kind: "sphere", radius: 0.025 }, speed: 0, lifetime: [18, 22], size: 0.16,
                    color: 0xF0B23A, alpha: [0.65, 0], light: "full", maxParticles: 5 }
            ]
        },
        crack: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crack_shard", bind: "target", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "layer", fallback: 1 }, interval: 1, repeats: 1 },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.28], gravity: 0.01, drag: 0.9, spin: 18,
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "crack_flash", bind: "target", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: { data: "scale", fallback: 1 },
                    color: 0xF0B23A, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        scatter: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "scatter_mote", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "layers", fallback: 1 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0x8A5A22, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stockpile", 1, StockpileDefinition);
