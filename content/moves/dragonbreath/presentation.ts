/**
 * 龙息 / dragonbreath 的客户端表现。
 *
 * 一句话：深吸一口气，胸腔亮起，随后一道青紫的龙息从嘴前喷成整片扇形，由近及远把锥面填满，气流边缘卷起
 * 螺旋，扫过的目标身上炸开龙属冲击，最后留一缕雾气散去。
 * 色相家族：龙青（0x7FE6D0）为主、紫（0x9A6BE0）作叶尖，强调用原型 impact_dragon。
 * 拍子：起（inhale 吸气聚气）→ 击（breath 扇形铺开 + 逐个 impact）→ 收（linger 雾气散去）。
 * 范围：breath 用 `data.path`（服务端扇面顶点）画 polygon 与 polyline，锥有多大、够到哪，画面就是那块地。
 * 运动：气息沿 shape 向外推，边缘顺顶点卷出螺旋，中心光核比气流走得更快。
 * 数：`data.flow`（吐息长度换算的流量）直接绑定气流密度，`data.scale`（当前长度 / 全长）控制粒子尺寸，
 * `data.intensity`（本击威力 / 60）抬高命中亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonbreathDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 18, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 16], size: [0.18, 0.05], spin: 6,
                    color: 0x7FE6D0, alpha: [0.45, 0], light: "world", maxParticles: 90
                },
                {
                    name: "charge", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xB79AF0, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        breath: {
            duration: 16,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "gust", bind: "path", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "polygon" },
                    rate: { data: "flow", fallback: 80 }, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.26, 0.06], spin: 8,
                    color: 0x7FE6D0, alpha: [0.3, 0], light: "world", maxParticles: 320
                },
                {
                    name: "edge", bind: "path", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "shape", speed: [0.08, 0.26], spread: 12,
                    lifetime: [6, 13], size: [0.16, 0.04],
                    color: 0xA6F3E2, alpha: [0.7, 0], light: "full", maxParticles: 240
                },
                {
                    name: "core", bind: "path", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    shape: { kind: "polyline" },
                    rate: 28, direction: "shape", speed: [0.1, 0.3],
                    lifetime: [5, 12], size: [0.18, 0.05],
                    color: 0xB79AF0, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xCFF6EA, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 24 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [8, 16], size: [0.14, 0.04],
                    color: 0xC3A8F2, alpha: [0.85, 0], light: "full", maxParticles: 90
                }
            ]
        },
        linger: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "mist", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 22 },
                    shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [16, 28], size: [0.34, 0.12],
                    color: 0x7FB6A8, alpha: [0.22, 0], light: "world", maxParticles: 80
                },
                {
                    name: "residual", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.02, drag: 0.94,
                    lifetime: [10, 20], size: [0.06, 0.02],
                    color: 0x9FE3D2, alpha: [0.5, 0], light: "world", maxParticles: 100
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonbreath", 1, DragonbreathDefinition);
