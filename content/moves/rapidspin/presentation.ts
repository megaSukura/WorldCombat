/**
 * 高速旋转 / rapidspin 的客户端表现。
 *
 * 一句话：施法者重心一沉、脚边起一圈向内收的风 → 贴地高速自转起来，青白风屑绕身公转、地面只有一圈清晰的
 *   风环从脚下向外扫过 → 缠在身上的东西被甩散（一圈更亮的解缚光与飞丝），随后身上升起一段青白提速气流。
 * 色相家族：风青白（0xBFD8E8 主体、0xE6F3FA 亮面、近白核心），余韵用中性灰白；无第二个色相。
 * 拍子：起 wind 0–实际 prepare ／ 旋 spin 0–30t ／ 中 hit ／ 解 free ／ 提 haste ／ 散 settle。
 * 范围：spin／free 的贴地风环以参考半径 2.8 格书写、`fit: "none"`，按 `data.scale`（旋风半径 / 2.8）一次缩放到
 *   真实半径；玩家一眼看出旋到哪一圈，且判定只结算一次伤害（不靠重复小环暗示多段）。
 * 运动：wind 的风屑向内收；spin 的风屑绕身公转、风环一圈向外扫过；haste 的气流向上收束。
 * 数：`data.wind`（速度与物攻派生的风屑数）驱动各段发射量，`data.swirl`（旋动圈数派生的转速）让转得更快的人
 *   肉眼转得更快，`data.freed`（甩脱的束缚条数）在解缚时追加更亮的解缚环与飞丝，`data.intensity` 抬高密度。
 */
const RapidSpinDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.3, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 24, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.2], spin: 18,
                    lifetime: [7, 13], size: [0.24, 0.05], sizeMode: "sin",
                    color: 0xBFD8E8, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xC9CFD6, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        spin: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "gyre", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "wind", fallback: 18 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.28], spin: { data: "swirl", fallback: 26 }, spread: 20,
                    lifetime: [7, 14], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xBFD8E8, alpha: [0.75, 0], light: "full", maxParticles: 140
                },
                {
                    name: "blade", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 34, shape: { kind: "ring", radius: 0.42 },
                    direction: "shape", speed: [0.05, 0.16], spin: { data: "swirl", fallback: 30 },
                    lifetime: [5, 11], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xE6F3FA, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 110
                },
                {
                    name: "sweep", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 2.8 },
                    direction: "outward", speed: [0.14, 0.34],
                    lifetime: [10, 18], size: [0.4, 0.95], sizeMode: "sin",
                    color: 0xBFD8E8, alpha: [0.55, 0], light: "world", maxParticles: 8
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "swat", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "wind", fallback: 16 }, at: 0 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE6F3FA, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                }
            ]
        },
        free: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "unwind", bind: "point", fit: "none", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "freed", fallback: 1 }, interval: 2 },
                    shape: { kind: "ring", radius: 2.8 },
                    direction: "outward", speed: [0.16, 0.4],
                    lifetime: [10, 18], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0xE6F3FA, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "thread", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "freed", fallback: 1 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.14, 0.36],
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0xE6F3FA, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        haste: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "haste", fallback: 1 }, interval: 3 },
                    shape: { kind: "box", size: [0.5, 0.7, 0.5] },
                    direction: "up", speed: [0.06, 0.22],
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xBFD8E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.25, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "wind", fallback: 14 } }, shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], gravity: 0.04,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xC9CFD6, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rapidspin", 1, RapidSpinDefinition);
