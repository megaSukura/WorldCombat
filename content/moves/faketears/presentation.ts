/**
 * 假哭 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者眼角憋出一线水光 → 一串假泪沿视线甩到对手脸上、在它眼前炸开一圈昏暗的涟漪 →
 *   对手瞳孔一缩、脚边腾起一小撮尘，愣在原地，眼角还挂着没干的假泪。
 *
 * 色相家族：淡天蓝（0x8FB8E8／0x6F9BD0）与近白（0xEAF3FC）为主体，被唬住的那一记掺入低饱和的暗紫灰
 *   （0x5A5570，来自骗术的 Dark 属性）；没有别的色相。
 * 层次：眼角水光（起手）→ 沿视线的泪线＋近身泪珠（击）→ 对手身上的暗爆与涟漪（结果）→ 脚边定身的尘（结果）→
 *   眼角余泪（持续）→ 被挡住时的散点（反制读法）。
 * 起击收：windup（憋泪）→ feign（泪线飞过去）→ fluster（对手身上炸开）→ linger（余泪慢慢离场）。
 * 范围：泪线用 `data.path` 的两端（施法者与目标）画出，就是这一次视线真正连起的那条线。
 * 运动：假泪沿视线从施法者甩到目标；被唬住的涟漪从目标身上向外散。
 * 数：泪线密度与近身泪珠绑 `data.tears`（体型与亲近度派生），暗爆数量绑 `data.hearts`（掉级派生）。
 */
const FakeTearsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "eye_glisten", bind: "source", offset: [0, 0.42, 0], height: 0.86,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x8FB8E8, alpha: [0.5, 0], light: "full", maxParticles: 18
                },
                {
                    name: "eye_shine", bind: "source", offset: [0, 0.44, 0], height: 0.88,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "ring", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xEAF3FC, alpha: [0.7, 0], light: "full", maxParticles: 12
                }
            ]
        },
        feign: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "tear_arc", bind: "path", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline" },
                    rate: { data: "tears", fallback: 16 }, direction: "shape", speed: [0.04, 0.14], spread: 8,
                    lifetime: [8, 16], size: [0.13, 0.03], sizeMode: "index",
                    color: 0x8FB8E8, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "tear_well", bind: "source", offset: [0, 0.4, 0], height: 0.86,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "tears", fallback: 16 }, interval: 3, repeats: 2 },
                    shape: { kind: "circle", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x6F9BD0, alpha: [0.75, 0], light: "full", maxParticles: 60
                },
                {
                    name: "feign_glitter", bind: "source", offset: [0, 0.5, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16], spread: 22,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xEAF3FC, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fluster: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fluster_core", bind: "target", height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "hearts", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16], spread: 26,
                    lifetime: [8, 14], size: [0.28, 0.05], sizeMode: "index",
                    color: 0x5A5570, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "fluster_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.24, 0.5],
                    color: 0x6F9BD0, alpha: [0.6, 0], light: "world", maxParticles: 28
                },
                {
                    name: "hesitate_root", bind: "target", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16, repeats: { data: "drop", fallback: 2 }, interval: 3 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8FA0B8, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "hesitate_tears", bind: "target", offset: [0, 0.35, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "drop", fallback: 2 }, interval: 2, repeats: 3 },
                    shape: { kind: "circle", radius: 0.24 },
                    direction: "down", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0x8FB8E8, alpha: [0.75, 0], light: "world", maxParticles: 26
                }
            ]
        },
        blocked: {
            duration: 18,
            emitters: [
                {
                    name: "blocked_scatter", bind: "point", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.01],
                    color: 0x8FB8E8, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fizzle: {
            duration: 14,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x6F9BD0, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        linger: {
            exit: { drain: 28 },
            emitters: [
                {
                    name: "linger_tears", bind: "target", offset: [0, 0.25, 0], height: 0.96,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 3, shape: { kind: "circle", radius: 0.24 },
                    direction: "down", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.08, 0.02],
                    color: 0x8FB8E8, alpha: [0.35, 0], alphaMode: "sin", light: "world", maxParticles: 12
                },
                {
                    name: "linger_glum", bind: "target", height: 0.86,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 2, shape: { kind: "circle", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.13, 0.03],
                    color: 0x5A5570, alpha: [0.22, 0], light: "world", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_faketears", 1, FakeTearsDefinition);
