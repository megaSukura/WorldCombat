/**
 * 鳃咬 / fishiousrend 的客户端表现。
 *
 * 一句话：施法者张开鳃、嘴边聚起一层水汽 → 扑上去咬住目标的一刻炸开一圈水花（先咬住时更重更白）→
 * 咬合处水纹收拢、目标被拖近时脚边溅水。
 * 色相家族：水蓝与近白（impact_water / waterjet / water_ripple / giantsplash），先咬住一拍多一层冷白。
 * 拍子：起 coil → 击 bite / clamp → 收（水纹散去）。
 * 范围：coil 画在施法者嘴边与脚下；bite/clamp 的点爆与环由 `data.scale`（咬合判定派生）决定大小。
 * 运动：水花由咬合点向外炸；水纹自中心一圈圈扩散后向内收；拖拽的尾迹留在目标被拉动的一侧。
 * 数：`data.count`（最终威力派生）决定水花与碎片数量，`data.slow`（压速级数）决定咬合处的水纹层数，
 *   `data.doubled` 决定先咬住一拍是否更亮；画面里的数量与机制里的数一致。
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
