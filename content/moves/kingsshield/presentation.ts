/** A fixed front-facing plate with native-contact sparks and one punishment flash per attacker. */
const KingShieldDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 16,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "plate", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    rate: 26, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [10, 20], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "crest", bind: "source", offset: [0, 0.9, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "arc", radius: 0.6, arcDegrees: 200 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [14, 26], size: [0.12, 0.02],
                    color: 0xF2C85A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "haze", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.28, 0.06],
                    color: 0x9EAAB8, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hold: {
            emitters: [{ name: "sheet_outline", bind: "path", fit: "none",
                particle: "world_combat_core:cobblemon/generic/screen_color", rate: 24,
                shape: { kind: "polyline" }, direction: "up", speed: [0, .002],
                lifetime: [8, 12], size: [.16, .12], color: 0x8FA0B4, alpha: [.55, .15], light: "world", maxParticles: 36 }]
        },
        block: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "clang", bind: "target", height: 0.55, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 14, at: 1 }, shape: { kind: "arc", radius: 0.6, arcDegrees: 120 },
                    direction: "outward", speed: [0.07, 0.22],
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "sparks", bind: "target", height: 0.55, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 26 },
                    shape: { kind: "arc", radius: 0.6, arcDegrees: 150 },
                    direction: "outward", speed: [0.1, 0.3], spread: 20, gravity: 0.04,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "recoil", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 6, at: 1 }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", bloom: 0.4
                }
            ]
        },
        punish: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "bolts", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "bolts", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 26 },
                    direction: "shape", speed: [0.12, 0.34], spin: 20,
                    lifetime: [8, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xF2C85A, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "chips", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 8, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "dust", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.05,
                    lifetime: [10, 20], size: [0.05, 0.01],
                    color: 0xFFF2C0, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "sink", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 26 },
                    shape: { kind: "hemisphere", radius: 0.55 },
                    direction: "down", speed: [0.05, 0.18],
                    lifetime: [14, 26], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "fade", bind: "target", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [12, 22], size: [0.4, 0.08],
                    color: 0xAEBBCB, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "haze", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [16, 30], size: [0.28, 0.07],
                    color: 0x7C8794, alpha: [0.3, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_kingsshield", 1, KingShieldDefinition);
