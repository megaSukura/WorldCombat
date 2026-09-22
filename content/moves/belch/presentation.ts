/**
 * 打嗝 / belch 的客户端表现。
 *
 * 一句话：施法者先在嘴边聚起一颗树果的果香与绿沫，咬碎吞下后，一团短而宽的黄绿毒气从嘴前喷成整片扇形，
 * 由近及远把锥面填满，被罩住的目标身上翻起毒泡，气团再在原地飘一阵才散去。
 * 色相家族：黄绿与浊黄（poisonbubble / sludgesplash / smokeball / impact_poison）为主体，果渣的暖色只出现在咬下的一瞬。
 * 拍子：起（chew 果香聚口）→ 击（eat 咬碎 + belch 扇形铺开 + hit 逐个目标中毒）→ 收（haze 残气散去 / miss 落空）。
 * 范围：belch / haze 用 `data.path`（服务端扇面顶点）画 polygon，气团够到哪、有多宽，画面就是那块地。
 * 运动：毒气沿 shape 由近及远向外翻涌，泡泡在气团里缓慢上浮。
 * 数：`data.motes`（特攻派生）决定气团与残留的粒子密度，`data.scale`（当前长度 / 全长）控制尺寸，
 *   `data.intensity`（本击威力派生）抬高命中亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BelchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        chew: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "scent", bind: "source", offset: [0, 0.75, 0.15], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xD8E070, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "froth", bind: "source", offset: [0, 0.6, 0.18], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xA8C24A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        eat: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "bits", bind: "source", offset: [0, 0.7, 0.15], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "motes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24], spread: 18,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xB8C86A, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        belch: {
            duration: 16,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "gas", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    shape: { kind: "polygon" },
                    rate: { data: "motes", fallback: 40 }, direction: "shape", speed: [0.05, 0.2], spread: 14,
                    gravity: -0.008, drag: 0.93, spin: 5,
                    lifetime: [12, 24], size: [0.34, 0.14],
                    color: 0x8FB84A, alpha: [0.34, 0], light: "world", maxParticles: 260
                },
                {
                    name: "edge", bind: "path", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "shape", speed: [0.08, 0.28], spread: 16,
                    gravity: -0.01, drag: 0.94,
                    lifetime: [10, 20], size: [0.18, 0.05],
                    color: 0xC8D860, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "motes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [6, 12], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xE0F090, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "boil", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "motes", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [10, 20], size: [0.12, 0.03],
                    color: 0xA8C24A, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        haze: {
            duration: 90,
            exit: { stop: 20, drain: 40 },
            emitters: [
                {
                    name: "drift", bind: "path", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    shape: { kind: "polygon" },
                    rate: { data: "motes", fallback: 30 }, direction: "up", speed: [0.01, 0.05], spread: 10,
                    drag: 0.95, spin: 3,
                    lifetime: [24, 44], size: [0.4, 0.18],
                    color: 0x7FA044, alpha: [0.16, 0], light: "world", maxParticles: 200
                },
                {
                    name: "motes", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polygon" },
                    rate: 14, direction: "up", speed: [0.01, 0.06], spread: 12,
                    lifetime: [16, 30], size: [0.07, 0.01],
                    color: 0xC8D860, alpha: [0.25, 0], light: "full", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "source", offset: [0, 0.6, 0.15], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x7A8A50, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_belch", 1, BelchDefinition);
