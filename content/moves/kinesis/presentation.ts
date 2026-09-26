/**
 * 折弯汤匙 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身前用念力点出一把短直金属汤匙，沿折弯过程一步步把它掰弯；弯到最后一刻，一道靛蓝的目光线
 *   闪向实际目标，在它头顶留下一圈被引开注意的念力。
 *
 * 色相家族：低饱和靛蓝（0x8FA8E0／0x6E7AB8）为主体，近白的钢光（0xC9D4F0）只做汤匙轮廓与念力高光。
 * 层次：手边聚念（起手）→ 汤匙轮廓（折弯，沿 data.path 逐步变形）→ 目光线短闪（成功回执）→ 头顶标记（失神）→ 落空暗点 → 余念（持续）。
 * 起击收：gather（举念）→ spoon（折弯）→ gaze（目光线）→ beguile（标记）；被掩体挡住或目标离场走 fizzle（暗一下）。
 * 数：轮廓点密度绑定 data.swirl（特攻换算），汤匙亮度随 data.glow（折弯进度）增强，成功标记的大小由 data.scale（失神级数换算）决定。
 * 汤匙顶点由服务端算出（data.path），客户端不做第二份几何。
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
        spoon: {
            duration: 0,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "spoon_metal", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: { data: "swirl", fallback: 16 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [3, 7], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xC9D4F0, alpha: [0.9, 0], light: "full", bloom: { data: "glow", fallback: 0.2 }, maxParticles: 130
                },
                {
                    name: "spoon_spark", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "swirl", fallback: 10 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [3, 8], size: [0.06, 0.01],
                    color: 0x8FA8E0, alpha: [0.7, 0], light: "full", maxParticles: 110
                }
            ]
        },
        gaze: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gaze_line", bind: "path", fit: "none", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "swirl", fallback: 16 } }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [4, 9], size: [0.12, 0.03],
                    color: 0xC9D4F0, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        beguile: {
            duration: 36,
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
                    name: "beguile_glint", bind: "target", offset: [0, 0.4, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "swirl", fallback: 14 }, interval: 4, repeats: 3 }, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8FA8E0, alpha: [0.6, 0], light: "full", maxParticles: 70
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
