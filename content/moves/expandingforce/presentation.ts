/**
 * 广域战力 / expandingforce —— 客户端表现。
 *
 * 一句话：身前收拢一圈精神环 → 力量砸在目标脚下炸开、并在落点摊开一片精神场地 →
 * 站在场地上再放时，紫环从施法者脚下向外一圈圈推开，把贴身的人全部卷进去。
 * 色相家族：紫蓝精神色（0x9A7BFF / 0xC7B4FF）为主体，强调用近白（0xF0EAFF），余韵中性尘。
 * 范围由服务端算出的 `scale`（真实半径/参考半径）决定：落点场地与引爆圈画出来就是判定范围。
 * 拍子：起（windup）／击（wave）／裂（detonate）／持续（field）。
 */
const ExpandingForceDefinition: ParticleDefinition = {
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "gather_psy", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 20, shape: { kind: "sphere", radius: 0.8 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 16], size: [0.24, 0.03],
                    color: 0x9A7BFF, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0xE6DEFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "gather_motes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC7B4FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        wave: {
            duration: 30,
            exit: { stop: 8, drain: 24 },
            emitters: [
                {
                    name: "wave_hit", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.44, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "wave_ring", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.32, 0.05],
                    color: 0xB79BFF, alpha: [0.85, 0], light: "full", maxParticles: 12
                },
                {
                    name: "wave_edge", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 3.0 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [12, 20], size: [0.34, 0.12],
                    color: 0x9A7BFF, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "wave_swirl", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.12], spin: 10,
                    lifetime: [10, 20], size: [0.16, 0.03],
                    color: 0xD9CCFF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        detonate: {
            duration: 40,
            exit: { stop: 10, drain: 30 },
            emitters: [
                {
                    name: "collapse", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 18, at: 0 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.10, 0.24],
                    lifetime: [4, 9], size: [0.26, 0.05],
                    color: 0xD9CCFF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "shock", bind: "source", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "bursts", fallback: 40 } }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [{ data: "shock", fallback: 0.3 }, { data: "shock", fallback: 0.42 }],
                    lifetime: [12, 20], size: [0.5, 0.22],
                    color: 0xB79BFF, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "detonate_impact", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.10, 0.26],
                    lifetime: [8, 16], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "spiral", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.06, 0.16], spin: 14,
                    lifetime: [12, 24], size: [0.22, 0.04],
                    color: 0xC7B4FF, alpha: [0.85, 0], light: "full", maxParticles: 48
                },
                {
                    name: "detonate_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 60 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.12], gravity: 0.01,
                    lifetime: [10, 22], size: [0.06, 0.01],
                    color: 0xE0D8F2, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        field: {
            duration: 0,
            exit: { stop: 0, drain: 40 },
            emitters: [
                {
                    name: "field_edge", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 10, shape: { kind: "ring", radius: 3.0 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [30, 60], size: [0.20, 0.04],
                    color: 0x9A7BFF, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 60
                },
                {
                    name: "field_pulse", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 14, interval: 50, repeats: 12, at: 30 }, shape: { kind: "ring", radius: 3.1 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 40], size: [0.16, 0.02],
                    color: 0xC7B4FF, alpha: [0.4, 0], light: "full", maxParticles: 40
                },
                {
                    name: "field_motes", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [26, 48], size: [0.05, 0.01],
                    color: 0xDCD2FF, alpha: [0.16, 0], light: "full", maxParticles: 30
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_expandingforce", 1, ExpandingForceDefinition);
