/** The locked spear line, the actual extending shaft and a persistent exhaustion cue. */
const MeteorassaultDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        thrust: { emitters: [
            { name: "extended_spear", bind: "path", fit: "world", particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                rate: 64, shape: { kind: "polyline" }, speed: [0, .005], lifetime: [4, 7],
                size: [{ data: "width", fallback: .3 }, { data: "width", fallback: .3 }], color: 0xD6C39B, alpha: [.8, .15], light: "world", maxParticles: 80 },
            { name: "spear_edge", bind: "path", fit: "world", particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                rate: 30, shape: { kind: "polyline" }, speed: [0, .004], lifetime: [5, 8],
                size: [.1, .02], color: 0xEAF6B0, alpha: [.85, .1], light: "full", maxParticles: 32 },
            { name: "spear_tip", bind: "point", fit: "world", particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                burst: { count: 3, interval: 2 }, shape: { kind: "sphere", radius: .14 }, direction: "shape", speed: [.0, .03],
                lifetime: [4, 8], size: [.34, .05], color: 0xFFFFFF, alpha: [.9, 0], light: "full", maxParticles: 12 }
        ] },
        contact: { duration: 18, emitters: [{ name: "spear_contact", bind: "target", fit: "body", particle: "world_combat_core:cobblemon/generic/hit_yellow",
            burst: { count: 12 }, shape: { kind: "sphere_surface", radius: .3 }, speed: [.04, .14], lifetime: [6, 12], size: [.3, .05], alpha: [.9, 0] }] },
        windup: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    // 准备期就画出锁定的枪线：长度 reach、粗细绑定本招真实半宽。
                    name: "spear_line", bind: "path", fit: "world", particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 40, shape: { kind: "polyline" }, speed: [0, .003], lifetime: [4, 8],
                    size: [{ data: "width", fallback: .3 }, { data: "width", fallback: .3 }], color: 0xA8D060, alpha: [.45, .08], light: "world", maxParticles: 40
                },
                {
                    name: "raise", bind: "source", offset: [0, 1.0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 14, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xC8E070, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "brace_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [5, 11], size: [0.05, 0.02],
                    color: 0xA79A6E, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        daze: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "daze_core", bind: "source", offset: [0, 1.55, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "count", fallback: 12 }, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "shape", speed: [0.02, 0.07], spin: 10,
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0xEAF6B0, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "stagger_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x9AA0A8, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "dizzy_ring", bind: "source", offset: [0, 1.6, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 6, shape: { kind: "ring", radius: 0.26 },
                    direction: "shape", speed: [0.01, 0.03], spin: 8,
                    lifetime: [16, 26], size: [0.09, 0.02],
                    color: 0xD6EFA0, alpha: [0.4, 0], light: "full", maxParticles: 28
                },
                {
                    name: "sway", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.02],
                    color: 0x9AA0A8, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_meteorassault", 1, MeteorassaultDefinition);
