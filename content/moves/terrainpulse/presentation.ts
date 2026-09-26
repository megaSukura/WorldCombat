/** Actual floor samples carry each wave and its current width and terrain colour. */
const TerrainPulseDefinition: ParticleDefinition = {
    moments: {
        surface: { emitters: [{ name: "actual_path", bind: "path", fit: "world", particle: "world_combat_core:cobblemon/generic/tinydust",
            rate: 32, shape: { kind: "polyline" }, speed: [0,.006], lifetime: [4,8], size: [.22,.12], color:  { data: "tint", fallback: 0x9AA0A8 }, alpha: [.7,.15], light: "world", maxParticles: 42 }] },
        windup: {
            duration: 22,
            exit: { stop: 14, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        stomp: {
            duration: 20,
            exit: { stop: 12, drain: 10 },
            emitters: [
                {
                    name: "shock", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [8, 16], size: [0.5, 0.16],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.8, 0], light: "world", maxParticles: 4
                },
                {
                    name: "kick", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.02,
                    lifetime: [6, 14], size: [0.06, 0.01],
                    color: 0xD8DAE0, alpha: [0.6, 0], light: "world", maxParticles: 28
                }
            ]
        },
        travel: {
            duration: 60,
            exit: { stop: 52, drain: 16 },
            emitters: [
                {
                    name: "ground_trail", bind: "projectile", fit: "none", offset: [0, -0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 46, shape: { kind: "sphere", radius: 0.22 },
                    direction: "away", speed: [0.01, 0.05],
                    lifetime: [5, 12], size: [0.07, 0.01],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "wave_core", bind: "projectile", fit: "none", offset: [0, -0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/flat",
                    rate: 40, shape: { kind: "sphere", radius: 0.18 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [5, 10], size: [0.2, 0.04],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.9, 0], light: "full", maxParticles: 50
                }
            ]
        },
        impact: {
            duration: 32,
            exit: { stop: 8, drain: 26 },
            emitters: [
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1.2 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 20], size: [0.7, 0.2],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.8, 0], light: "full", maxParticles: 4
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "bursts", fallback: 18 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.10, 0.30], gravity: 0.03, spin: 8,
                    lifetime: [9, 20], size: [0.08, 0.01],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.95, 0], light: "world", maxParticles: 120
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bursts", fallback: 18 } }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.02,
                    lifetime: [12, 24], size: [0.06, 0.01],
                    color: 0xD8DAE0, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        },
        secondary: {
            duration: 30,
            exit: { stop: 8, drain: 24 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1.2 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 20], size: [0.65, 0.18],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.75, 0], light: "full", maxParticles: 4
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bursts", fallback: 12 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.02,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xD8DAE0, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 18 },
            emitters: [
                {
                    name: "fizzle", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.10], gravity: 0.02,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: { data: "tint", fallback: 0x9AA0A8 }, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_terrainpulse", 1, TerrainPulseDefinition);
