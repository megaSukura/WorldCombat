/**
 * 鳃咬 / fishiousrend 的客户端表现。
 *
 * 一句话：施法者张开鳃、嘴边聚起一层水汽 → 拖着一道水线扑近（途中首敌优先）→ 咬住目标的一刻炸开一圈水花
 * （先咬住时更重更白）→ 两片鳃刃之间拉出一条水线，随真实 drag 一节节向自己收短；拖不动只在口中压出一记短咬。
 * 色相家族：水蓝与近白（impact_water / waterjet / water_ripple / giantsplash），先咬住一拍多一层冷白。
 * 拍子：起 coil → 扑 lunge → 咬 bite / clamp → 收线 reel；免拉走 press，扑空走 miss。
 * 范围：coil 画在施法者嘴边与脚下；bite/clamp 的点爆与环由 `data.scale`（咬合判定派生）决定大小。
 * 运动：lunge 的水线朝 `orient: velocity` 沿扑击方向拉直；reel 的实体顶点沿 `data.path`（猎物→施法者）逐帧收短；press 在口中炸开。
 * 数：`data.count`（最终威力派生）决定水花与碎片数量，`data.slow`（压速级数）决定咬合处的水纹层数，
 *   `data.dragged`（已拖动距离）驱动收线强度，`data.doubled` 决定先咬住一拍是否更亮；画面里的数量与机制里的数一致。
 */
const FishiousrendDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gills", bind: "source", offset: [0, 0, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 16, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12], spread: 20,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0x9FD8EE, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "pool", bind: "source", offset: [0, 0, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 10, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0x4AA6D8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        lunge: {
            duration: 10,
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "wake", bind: "source", offset: [0, 0, 0], height: 0.5, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 26, shape: { kind: "sphere", radius: 0.22 },
                    direction: "away", speed: [0.04, 0.16], spread: 14,
                    lifetime: [5, 10], size: [0.16, 0.02],
                    color: 0x9FD8EE, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "spray", bind: "source", offset: [0, 0, 0], height: 0.2, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 16, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [7, 13], size: [0.08, 0.01],
                    color: 0x6FB6D8, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        bite: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0x7FC8E8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "ripple", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 15], size: [0.42, 0.18],
                    color: 0x4AA6D8, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        clamp: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "count", fallback: 32 } },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.12, 0.36],
                    lifetime: [8, 14], size: [0.46, 0.05], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "splash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "count", fallback: 28 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.16, 0.44], spread: 24,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xBEE8F6, alpha: [0.95, 0], light: "full", maxParticles: 130
                },
                {
                    name: "rings", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: { data: "slow", fallback: 1 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.1 } },
                    direction: "inward", speed: [0.06, 0.12],
                    lifetime: [10, 16], size: [0.5, 0.2],
                    color: 0x4AA6D8, alpha: [0.7, 0], light: "full", maxParticles: 8
                }
            ]
        },
        reel: {
            duration: 16,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "line", bind: "path", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 30, direction: "shape", speed: [0.02, 0.08], spread: 12,
                    lifetime: [5, 10], size: [0.15, 0.02],
                    color: 0x7FC8E8, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "closing", bind: "path", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 12, direction: "shape", speed: [0.02, 0.07],
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0x4AA6D8, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "grip", bind: "target", offset: [0, 0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 13], size: [0.09, 0.02],
                    color: 0x9FD8EE, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        press: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "crush", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14], spread: 20,
                    lifetime: [7, 13], size: [0.14, 0.02],
                    color: 0x4AA6D8, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "splash", bind: "source", offset: [0, 0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.13], spread: 20,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0x6FB6D8, alpha: [0.6, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fishiousrend", 1, FishiousrendDefinition);
