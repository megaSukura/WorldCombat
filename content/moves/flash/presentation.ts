/**
 * 闪光 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：光先被收进施法者身体，然后以它为中心炸开一圈刺眼的白金色，光壳扫过谁，谁眼前留下没散尽的余光。
 *
 * 色相家族：暖白金（0xFFF3C8／0xFFE9A0）为主体，近白只做高光小点，淡金（0xFFD87A）只在边缘细节。
 * 层次：聚光（起手，向内收）→ 光壳＋地面光环（爆开，范围本身就是判定半径）→ 中头余光（持续）。
 * 起击收：gather（收光）→ flare（炸开，半径由服务端 data.radius 画出）→ dazzle（落到每个被照到的人身上）→ linger（余光未散）。
 * 数：flare_sparks 的爆发量绑定 data.sparks（级数与被照到的人数换算），dazzle 的爆发量绑定 data.burst（级数换算），
 *     地面光尘的覆盖半径绑定 data.radius。
 */
const FlashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_in", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 24, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFF0C0, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "gather_core", bind: "source", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        },
        flare: {
            duration: 26,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "flare_shell", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/vanilla/flash",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0, 0],
                    lifetime: 10, size: [2.2, 3.4], sizeMode: "index",
                    color: 0xFFF3C8, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 6
                },
                {
                    name: "flare_ring", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 44 }, shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.3, 0.9],
                    color: 0xFFE9A0, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "flare_sparks", bind: "point", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "sparks", fallback: 50 } }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.34], spread: 40,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "flare_dust", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 70, shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFF6D8, alpha: [0.5, 0], light: "full", maxParticles: 140
                }
            ]
        },
        dazzle: {
            duration: 34,
            emitters: [
                {
                    name: "dazzle_hit", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "burst", fallback: 44 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [7, 13], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xFFE9A0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "dazzle_glare", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "burst", fallback: 30 } }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "dazzle_ring", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.3, 0.6],
                    color: 0xFFF0C0, alpha: [0.5, 0], light: "full", maxParticles: 4
                }
            ]
        },
        linger: {
            duration: { data: "tick", fallback: 60 },
            exit: { drain: 24 },
            emitters: [
                {
                    name: "linger_glint", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 4, shape: { kind: "circle", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [14, 22], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xFFF6D8, alpha: [0.35, 0], alphaMode: "sin", light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flash", 1, FlashDefinition);
