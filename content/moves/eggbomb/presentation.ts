/** Native egg flight, brief landing cracks and one shell burst; the rolling body is rendered by its native appearance. */
const EggbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        heave: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 1.5, 0.15], height: 0.75, fit: "body",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_egg",
                    rate: 10, shape: { kind: "sphere", radius: 0.35 }, spriteFrom: "age",
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.3, 0.12], sizeMode: "linear",
                    alpha: [0.85, 0], light: "world", maxParticles: 16
                },
                {
                    name: "tension", bind: "source", offset: [0, 0.2, 0.2], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.09], gravity: 0.04, drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.02],
                    color: 0xE8D8A8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        release: {
            duration: 8,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "fling", bind: "source", offset: [0, 1.4, 0.35], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 24, spin: 8,
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0xF2E4B8, alpha: [0.8, 0], light: "world", maxParticles: 20
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.35 }, rate: 22,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.03, drag: 0.94,
                    lifetime: [5, 11], size: [0.06, 0.02],
                    color: 0xE8D8A8, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "wobble", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    trail: { minDistance: 0.5 }, rate: 10, spriteFrom: "age",
                    direction: "outward", speed: [0.0, 0.03], spin: 10,
                    lifetime: [4, 8], size: [0.07, 0.03],
                    color: 0xF6ECD2, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        shatter: {
            duration: 22,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [4, 9], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 10
                },
                {
                    name: "shell", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30, spin: 12,
                    gravity: 0.08, drag: 0.92,
                    lifetime: [8, 15], size: [0.12, 0.04],
                    color: 0xF6ECD2, alpha: [0.95, 0], light: "world", maxParticles: 60
                },
                {
                    name: "yolk", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/moves/softboiled_egg",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.09, drag: 0.9,
                    lifetime: [9, 17], size: [0.16, 0.05],
                    color: 0xF2C14E, alpha: [0.9, 0], light: "world", maxParticles: 48
                }
            ]
        },
        splash: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shell", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: { data: "shards", fallback: 9 }, at: 0 },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.22], spin: 10,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0xF6ECD2, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "spread", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/moves/softboiled_egg",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.18, 0.06],
                    color: 0xF2C14E, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_eggbomb", 1, EggbombDefinition);
