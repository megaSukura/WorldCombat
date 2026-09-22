/**
 * 翅膀攻击 / wingattack 的客户端表现。
 *
 * 一句话：双翼在身侧张开成两道人字形的风弧，随即一整片近白的翼风沿身前扇面扫过——扇面铺到哪，哪里的
 *   对手就被拍开，翅膀抖落几根羽毛。
 * 色相家族：近白与浅灰青（softswipe／impact_flying／smallsparkle 原色），羽毛层用微微发暖的米白偏色。
 * 拍子：起 spread（张翼聚风）→ 击 sweep（整片扇面扫过）→ 收 shove（拍开的余风与落羽）／ miss（空扇）。
 * 范围：`sweep` 的 `bind: "path"` 多边形用的正是服务端判定同一组扇面顶点（`WorldGeometry.sector`），
 *   玩家一眼知道站在扇面里会被扫到；`data.scale`（横扫长度 / 3.2）让扇面随体型缩放。
 * 运动：扇面从身前向外铺开、同一刻结算；扫过之后沿扇缘留下羽毛向两侧飘走。
 * 数：`data.targets`（实际扫到的人数）绑定命中爆发量，`data.chaff`（物攻换算的落羽量）绑定羽毛数量，
 *   `data.push`（推开格数）放大收势的推力感，`data.intensity`（威力 / 45）放大整幕，`data.wide` 让宽扫更张。
 */
const WingattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        spread: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "wing_left", bind: "source", offset: [-0.35, 0.75, 0.35], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 3, at: 0, interval: 2 },
                    shape: { kind: "arc", radius: 0.5, arcDegrees: 150 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [7, 13], size: [0.5, 0.2], sizeMode: "linear",
                    color: 0xE8EEF2, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "wing_right", bind: "source", offset: [0.35, 0.75, 0.35], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 3, at: 0, interval: 2 },
                    shape: { kind: "arc", radius: 0.5, arcDegrees: 150 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [7, 13], size: [0.5, 0.2], sizeMode: "linear",
                    color: 0xE8EEF2, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "feather", bind: "source", offset: [0, 0.85, 0.3], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.03],
                    color: 0xF2EFE6, alpha: [0.7, 0], light: "world", maxParticles: 34
                }
            ]
        },
        sweep: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 44, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.03, 0.12], spread: 30,
                    lifetime: [5, 11], size: [0.55, 0.22], sizeMode: "linear",
                    color: 0xEDF3F7, alpha: [0.55, 0], light: "full", maxParticles: 120
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "targets", fallback: 1 }, at: 2, interval: 2, repeats: 3 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "streak", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 8, at: 0, interval: 2 },
                    shape: { kind: "polygon" },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [4, 8], size: [0.5, 0.3], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        shove: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "feathers", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "chaff", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.22], gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xF2EFE6, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "off", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xDCE4EA, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "empty", bind: "point", fit: "none", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: { data: "chaff", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.13], spread: 30,
                    lifetime: [8, 14], size: [0.35, 0.16], sizeMode: "linear",
                    color: 0xDDE5EB, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wingattack", 1, WingattackDefinition);
