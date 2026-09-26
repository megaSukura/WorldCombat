/**
 * 火焰鞭 / firelash 的客户端表现。
 *
 * 一句话：手边点起一簇火苗、鞭身越拉越长越亮 → 一条火鞭沿上扬弧线分四拍从短甩到长再落下、沿途拖着火星与余烬 →
 *   真实扫中处爆开火焰撞击、目标身上缠上一小段跳动的火 → 缠卷式的火绳从落点收回、被命中的目标沿绳被拉近。
 * 色相家族：火焰橙黄（flame / ember / wisp / impact_fire）为主体，烟灰（smoke）作余韵，无第二色相。
 * 拍子：起 kindle（点火、拉鞭）→ 甩 lash（逐拍伸展）→ 中 hit（火焰撞击）／空 miss／墙 wall → 缠 bind（火绳收拢与拖拽）。
 * 范围：本招是单目标的一条鞭，画面本身就画在那条上扬弧线上（`data.path` 顶点，判定与表现同一条线），逐拍伸展的鞭尖就是当前判定末端。
 * 运动：鞭身沿顶点连线由短到长扫出，火苗沿鞭身向末端流动；bind 的 rope 顶点读 `path:["source",<目标>]`，随实际拉近而缩短。
 * 数：命中火星量绑 `data.embers`（威力派生）、`data.intensity`（威力 / 80）放大整幕；鞭身长度由顶点本身表达。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const FirelashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kindle: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "spark", bind: "source", offset: [0, 0.55, 0.28], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 18, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xFFB347, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "grow", bind: "source", offset: [0, 0.6, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 12, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xFF7A2A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        lash: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "body", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "polyline" }, rate: 60,
                    direction: "outward", speed: [0.02, 0.12], spread: 18,
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFF9A3C, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "flow", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polyline" }, rate: 44,
                    direction: "outward", speed: [0.04, 0.18], spread: 26,
                    gravity: -0.01, drag: 0.93,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xFFD27A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "embers", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.07, 0.28], spread: 30,
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "cling", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [8, 15], size: [0.14, 0.02],
                    color: 0xFF8A3C, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    gravity: -0.005, drag: 0.95,
                    lifetime: [14, 24], size: [0.28, 0.06],
                    color: 0x6A5648, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        bind: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "rope", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polyline" }, rate: 40,
                    direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [5, 11], size: [0.12, 0.02],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "tug", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "toward", speed: [0.08, 0.26],
                    lifetime: [7, 13], size: [0.13, 0.02],
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "scorch", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [14, 22], size: [0.6, 0.4],
                    color: 0x7A4A28, alpha: [0.5, 0], light: "world", maxParticles: 6
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFF9A3C, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firelash", 1, FirelashDefinition);
