/**
 * 诡异咒语 / eeryspell —— 客户端表现。
 *
 * 一句话：喉前聚起一团翻卷的紫色咒念 → 咒念飞出 → 命中在目标身上炸开并抽出几缕记忆丝向上散掉 →
 * 落空时只留一点紫烟。一个紫蓝色相家族（0x9A7BFF / 0xC7B4FF），近白只给打击点。
 * 命中强弱由服务端算出的 `bursts`（伤害占目标最大生命）决定记忆丝数量。
 * 拍子：起（windup）／行（travel）／击（impact）／抽（drain）／空（fizzle）。
 */
const EerieSpellDefinition: ParticleDefinition = {
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "gather_psy", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 20, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.09], spin: 12,
                    lifetime: [8, 16], size: [0.18, 0.03],
                    color: 0x9A7BFF, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xD9CCFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "gather_runes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC7B4FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        travel: {
            duration: 60,
            exit: { stop: 50, drain: 20 },
            emitters: [
                {
                    name: "bolt_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    rate: 40, shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [5, 12], size: [0.16, 0.03],
                    color: 0xB79BFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "bolt_wisps", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "away", speed: [0.02, 0.08], spin: 10,
                    lifetime: [6, 14], size: [0.12, 0.02],
                    color: 0xE0D6FF, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        impact: {
            duration: 34,
            exit: { stop: 8, drain: 28 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.42, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "hit_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.30, 0.05],
                    color: 0xB79BFF, alpha: [0.85, 0], light: "full", maxParticles: 12
                },
                {
                    name: "hit_motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.01,
                    lifetime: [10, 22], size: [0.05, 0.01],
                    color: 0xDCD2FF, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        drain: {
            duration: 40,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "drain_threads", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 14, repeats: 2, interval: 4 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.14], spin: 8,
                    lifetime: [14, 26], size: [0.14, 0.02],
                    color: 0x8F6FE8, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "drain_sparks", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12, at: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.06, 0.16],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xC7B4FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 6, drain: 18 },
            emitters: [
                {
                    name: "fizzle_smoke", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.20, 0.04],
                    color: 0xB9A8E0, alpha: [0.4, 0], light: "world", maxParticles: 20
                },
                {
                    name: "fizzle_motes", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.03, 0.10], gravity: 0.02,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xDCD2FF, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_eeriespell", 1, EerieSpellDefinition);
