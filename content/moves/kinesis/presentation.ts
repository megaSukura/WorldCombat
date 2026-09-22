/**
 * 折弯汤匙 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身前浮起一把被掰弯的汤匙，蓝紫念力绕着它打转；那道旋光顺着视线牵住对面，在它头顶转成一圈迷惑。
 *
 * 色相家族：低饱和靛蓝（0x8FA8E0／0x6E7AB8）为主体，近白的钢光（0xC9D4F0）只做汤匙边缘与念力高光。
 * 层次：手边聚念（起手）→ 旋光牵线（命中，沿视线朝目标）→ 头顶迷惑环（失神）→ 落空暗点 → 余念（持续）。
 * 起击收：gather（举匙）→ beguile（牵住视线）→ linger（还在打转）；被掩体挡住时走 fizzle（暗一下）。
 * 数：头顶念力点的数量绑定 data.swirl（特攻换算），环的亮度随 data.stage 加深。
 */
const KinesisDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_spiral", bind: "source", offset: [0, 0.4, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.12], spin: 16,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x8FA8E0, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "gather_glint", bind: "source", offset: [0, 0.4, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.09, 0.01],
                    color: 0xC9D4F0, alpha: [0.75, 0], light: "full", maxParticles: 16
                }
            ]
        },
        beguile: {
            duration: 38,
            exit: { stop: 14, drain: 24 },
            emitters: [
                {
                    name: "beguile_swirl", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "swirl", fallback: 18 }, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: 0.36 },
                    direction: "up", speed: [0.02, 0.06], spin: 20,
                    lifetime: [14, 24], size: [0.18, 0.04],
                    color: 0x8FA8E0, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "beguile_ring", bind: "target", offset: [0, 0.3, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.46 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.24, 0.1],
                    color: 0x6E7AB8, alpha: [0.55, 0], light: "full", maxParticles: 60
                },
                {
                    name: "beguile_bird", bind: "target", offset: [0, 0.4, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 4, repeats: 4 }, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.22, 0.1], sizeMode: "sin",
                    color: 0x8FA8E0, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "beguile_thread", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: { data: "swirl", fallback: 18 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.1, 0.02],
                    color: 0xC9D4F0, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        fizzle: {
            duration: 18,
            emitters: [
                {
                    name: "fizzle_dim", bind: "point", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x6E7AB8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            duration: { data: "tick", fallback: 60 },
            exit: { drain: 26 },
            emitters: [
                {
                    name: "linger_thought", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 4, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03], spin: 12,
                    lifetime: [18, 28], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x8FA8E0, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_kinesis", 1, KinesisDefinition);
