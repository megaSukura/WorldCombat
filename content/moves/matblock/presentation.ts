/** The held mat follows the exact fixed world-space sheet vertices supplied by the guard. */
const MatBlockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fold: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "fold_straw", bind: "source", fit: "body", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: 12, shape: { kind: "sphere", radius: 1.0 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 14,
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0xF0E2BC, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        },
        raise: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "raise_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.34, 0.14],
                    color: 0xD9C08A, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "raise_slat", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "slats", fallback: 10 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.13], drag: 0.9,
                    lifetime: [16, 26], size: [0.5, 0.16],
                    color: 0xD9C08A, alpha: [0.7, 0], light: "world", maxParticles: 44
                },
                {
                    name: "raise_straw", bind: "source", fit: "body", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: { data: "fibers", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.01, drag: 0.92, spin: 16,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xF0E2BC, alpha: [0.8, 0], light: "world", maxParticles: 70
                }
            ]
        },
        hold: {
            emitters: [{ name: "sheet_outline", bind: "path", fit: "none",
                particle: "world_combat_core:cobblemon/generic/screen_color", rate: 24,
                shape: { kind: "polyline" }, direction: "up", speed: [0, .002],
                lifetime: [8, 12], size: [.16, .12], color: 0xD9C08A, alpha: [.55, .15], light: "world", maxParticles: 36 }]
        },
        block: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "block_flex", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: { data: "slats", fallback: 10 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "away", speed: [0.08, 0.26], drag: 0.9, spin: 12,
                    lifetime: [8, 16], size: [0.3, 0.06],
                    color: 0xF0E2BC, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "block_straw", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "fibers", fallback: 24 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "away", speed: [0.06, 0.2], gravity: 0.02, drag: 0.92, spin: 18,
                    lifetime: [8, 16], size: [0.11, 0.03],
                    color: 0x6E7A46, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fall_slat", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.03, drag: 0.9,
                    lifetime: [16, 28], size: [0.36, 0.1],
                    color: 0x6E7A46, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fall_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xD9C08A, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_matblock", 1, MatBlockDefinition);
