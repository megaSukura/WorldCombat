/**
 * 鳃咬 / fishiousrend 的客户端表现。
 *
 * 一句话：施法者张开鳃、嘴边聚起一层水汽 → 拖着一道水线扑近（途中首敌优先）→ 咬住目标的一刻炸开一圈水花
 * （先咬住时更重更白），双颚贴真实嘴前与真实碰点合拢 → 两片鳃刃之间拉出一条水线，随真实 drag 一节节向自己收短；
 * 拖不动只在口中压出一记短咬。
 * 色相家族：水蓝与近白（impact_water / waterjet / water_ripple / giantsplash），先咬住一拍多一层冷白。
 * 拍子：起 coil → 扑 lunge → 咬 bite / clamp（双颚 move_fishiousrend_jaws）→ 收线 reel；免拉走 press，扑空走 miss。
 * 范围：coil 画在施法者嘴边与脚下；bite/clamp 的点爆与环由 `data.scale`（咬合判定派生）决定大小；
 *   双颚由 `move_fishiousrend_jaws` 按 `data.from`（真实嘴前）→`data.contact`（真实碰点）闭合。
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

/**
 * 双颚：按 `data.from`（真实嘴前）→`data.contact`（真实碰点）摆出上、下两列鳃刃，几刻内闭合并淡出；
 * 从嘴前拉一条鳃线到碰点。固定数量（每列 3 枚，共 6 口牙），不生成粒子或实体。
 */
const FishiousrendFangTexture = "cobblemon:particle/generic/fang";
function fishiousrendJawVec(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function fishiousrendJawNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function fishiousrendJawUnit(value: number[]): number[] {
    const length = Math.sqrt(value[0] * value[0] + value[1] * value[1] + value[2] * value[2]);
    return length > 1e-6 ? [value[0] / length, value[1] / length, value[2] / length] : [0, 0, 1];
}
function fishiousrendJawCross(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
WorldCombatClient.scene("world_combat:move_fishiousrend_jaws", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle || data.moment !== "jaws") return;
    const from = fishiousrendJawVec(data.from, [0, 0, 0]);
    const contact = fishiousrendJawVec(data.contact, from);
    const scale = Math.max(0.6, Math.min(1.8, fishiousrendJawNumber(data.scale, 1)));
    const forward = fishiousrendJawUnit([contact[0] - from[0], contact[1] - from[1], contact[2] - from[2]]);
    let reference = [0, 1, 0];
    if (Math.abs(forward[0] * reference[0] + forward[1] * reference[1] + forward[2] * reference[2]) > 0.95) reference = [1, 0, 0];
    const right = fishiousrendJawUnit(fishiousrendJawCross(forward, reference)), up = fishiousrendJawUnit(fishiousrendJawCross(right, forward));
    const hold = data.hold ? true : false;
    const start = fishiousrendJawNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const close = hold ? 0.15 : Math.min(1, age / 4);
    const fade = hold ? 1 : age <= 5 ? 1 : Math.max(0, 1 - (age - 5) / 6);
    if (fade <= 0) return;
    const alpha = Math.round(235 * fade);
    frame.line(from[0], from[1], from[2], contact[0], contact[1], contact[2], (Math.round(150 * fade) << 24 | 0x4AA6D8) | 0);
    const count = 3, spread = 0.2 * scale, gap = (0.26 * (1 - close) + 0.03) * scale;
    const ax = contact[0] - forward[0] * 0.05 * scale, ay = contact[1] - forward[1] * 0.05 * scale, az = contact[2] - forward[2] * 0.05 * scale;
    for (let i = 0; i < count; i++) {
        const along = (i - (count - 1) / 2) * spread;
        const bx = ax + right[0] * along, by = ay + right[1] * along, bz = az + right[2] * along;
        frame.sprite(FishiousrendFangTexture, bx + up[0] * gap, by + up[1] * gap, bz + up[2] * gap, 0.16 * scale, 180, (alpha << 24 | 0xBFE6F6) | 0, 0, true);
        frame.sprite(FishiousrendFangTexture, bx - up[0] * gap, by - up[1] * gap, bz - up[2] * gap, 0.16 * scale, 0, (alpha << 24 | 0x7FC8E8) | 0, 0, true);
    }
});
