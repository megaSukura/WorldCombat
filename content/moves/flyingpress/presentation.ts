/**
 * 飞身重压 / flyingpress 的客户端表现。
 *
 * 一句话：施法者蹲身一压、脚下扬起一圈尘土，随即沿一道竖直的气柱跃到空中，随后斜线俯冲压下——落点同时
 * 炸开格斗系的拳形冲击与飞行系的下压气流，把站着的对手连人带地压出一圈尘土。
 * 色相家族：暖金与近白（impact_fighting / impact_flying / dashburst / speedlines）为主体，落尘用中性 tinydust。
 * 拍子：起（crouch 收尘）→ 跃（leap 气柱）→ 标（mark 锁定落点短影）→ 压（press 双属性冲击、glance 撞墙擦尘、whiff 压空）→ 收（land 落尘）。
 * 范围：press 的一圈按 `data.scale`（压击判定 / 0.9）铺开；leap 的气柱高度读 `data.height`（真实可升程）；mark 短影钉在锁死的俯冲终点。
 * 运动：leap 是竖直上升的气柱，press 是向外压平的冲击环与四散碎块，glance/whiff 只有一小圈擦尘。
 * 数：`data.count`（重压威力派生）决定落点冲击量，`data.intensity` 抬高亮度。
 */
const FlyingpressDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        crouch: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12], spread: 12,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xC8A86A, alpha: [0.5, 0], light: "world", maxParticles: 34
                },
                {
                    name: "tense", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.18, 0.04],
                    color: 0xE0C878, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        leap: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "column", bind: "source", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    rate: 30, shape: { kind: "line", length: { data: "height", fallback: 3.6 } },
                    direction: "up", speed: [0.06, 0.22], spread: 6,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xE8D8A8, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "rise", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 20, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.05, 0.2], spread: 10,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xDCEBFA, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 70,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "shadow", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 8, shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.6 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: [10, 16], size: [0.24, 0.06], sizeMode: "index",
                    color: 0xC8A86A, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        press: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "fist", bind: "point", fit: "none", offset: [0, 0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 45 }, at: 1, interval: 1, repeats: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.34], spread: 22,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF2D0, alpha: [1, 0], light: "full", bloom: 0.32, maxParticles: 70
                },
                {
                    name: "air", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "count", fallback: 45 }, at: 1 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.09, 0.3], spread: 18,
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xE8F4FF, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 45 }, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.28], spread: 16,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xB8A886, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        glance: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 15], size: [0.06, 0.01],
                    color: 0xB8A886, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "empty", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.14], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 15], size: [0.05, 0.01],
                    color: 0xB8A886, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        land: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 14], size: [0.06, 0.01],
                    color: 0xB8A886, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flyingpress", 1, FlyingpressDefinition);
