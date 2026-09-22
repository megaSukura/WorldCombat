/**
 * 反射壁 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身边聚起几片硬光板，啪地扣成一圈绕着身体转；物理打上来时，迎击的那块板一亮、
 * 把这一击挡下，镜面形态再甩出一片碎光顺着来势弹回攻击者。
 *
 * 色相家族：钢蓝 0x8FC7FF 为主体，近白 0xDCEFFF 做板面高光，灰蓝 0x6E8BA8 做脚下影与淡出。
 * 一个效果一个色相家族。持续层贴在身侧、低密度，让出目标本体视线；板影只画轮廓，不糊住人。
 * 层次：聚板（起手）／铺环＋硬光板（立起一圈）／身侧板影（持续）／板挡一下（事件）／散落（收）。
 * 起击收：windup（聚板）→ raise（扣成一圈）→ hold（持续）→ block（挡下并弹回）→ fade（散）。
 * 数：板的块数绑定服务端算出的 data.plates；壁半径绑定 data.field；挡下的爆发量与弹回碎光量读 data.blocked 与 data.plates。
 */
const ReflectDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "gather", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: 10, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.26, 0.1], spin: 10,
                    color: 0x8FC7FF, alpha: [0.7, 0], light: "full", bloom: 0.15, maxParticles: 30 }
            ]
        },
        raise: {
            duration: 46,
            exit: { stop: 18, drain: 30 },
            emitters: [
                { name: "ring", bind: "source", height: 0.06, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 30 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.16, 0.28],
                    lifetime: [14, 22], size: [0.4, 0.2],
                    color: 0xDCEFFF, alpha: [0.6, 0], light: "full", bloom: 0.15, maxParticles: 50 },
                { name: "plates", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "plates", fallback: 8 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.16], drag: 0.86, spin: 12,
                    lifetime: [16, 26], size: [0.3, 0.16],
                    color: 0x8FC7FF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 60 },
                { name: "shards", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 20, interval: 4, repeats: 3 }, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.92,
                    lifetime: [14, 24], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xDCEFFF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 80 }
            ]
        },
        hold: {
            exit: { drain: 30 },
            emitters: [
                { name: "orbit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.004, 0.02], drag: 0.9, spin: 8,
                    lifetime: [18, 28], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0x8FC7FF, alpha: [0.34, 0], alphaMode: "sin", light: "full", maxParticles: 18 },
                { name: "edge", bind: "target", height: 0.05, offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.004, 0.01],
                    lifetime: [20, 30], size: [0.3, 0.42], sizeMode: "sin",
                    color: 0xDCEFFF, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 10 }
            ]
        },
        block: {
            duration: 24,
            exit: { stop: 8, drain: 20 },
            emitters: [
                { name: "snap", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "plates", fallback: 8 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.08, 0.22], drag: 0.88, spin: 8,
                    lifetime: [8, 16], size: [0.3, 0.14],
                    color: 0xDCEFFF, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 40 },
                { name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8FC7FF, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 30 },
                { name: "rebound", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 12 }, shape: { kind: "line", length: 1.4 }, orient: "direction", direction: "shape",
                    speed: [0.2, 0.34],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0xDCEFFF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 24 }
            ]
        },
        fade: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                { name: "drop", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/orbshrink_white",
                    burst: { count: { data: "plates", fallback: 8 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.03, drag: 0.94,
                    lifetime: [20, 32], size: [0.2, 0.03],
                    color: 0x6E8BA8, alpha: [0.5, 0], light: "world", maxParticles: 40 },
                { name: "ring", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0x6E8BA8, alpha: [0.3, 0], light: "world", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_reflect", 1, ReflectDefinition);
