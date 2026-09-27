/**
 * 怪力 / strength 的客户端表现。
 *
 * 一句话：把全身力气压进一记正面直拳——一枚拳沿一条直线短送到首个接触点，正面炸开一圈偏白的冲击；
 * 目标被真实顶退多少就沿出拳方向留下多少尘；若把人拍在墙上，墙的真实接触面再迸一撮碎石。
 * 色相家族：暖白（0xF5E8CC）与土黄（0xC9A06A）；饱和只出现在冲击核心的小面积。
 * 拍子：起 windup（沉腰聚势）→ 击 punch（自定义场景把拳沿拳路送出并停住）→ impact（命中峰值）→ slam（撞墙）／ miss（落空）。
 * 范围：punch 的拳用 `data.path`（施法者→首接触）从身体送到接触点；impact/slam 绑命中点，画的就是受力所在。
 * 运动：拳沿出拳方向直线送出；命中后尘土按实际顶退距离沿出拳方向退去；撞墙时石屑从墙的接触面向后迸开。
 * 数：`data.hits`（本次威力派生）决定冲击爆发数，`data.pushDust`（实际顶退距离派生）决定推出尘量，
 * `data.intensity`（威力 / 60）抬高密度与亮度，`data.scale`（判定半径 / 0.34）放大拳面与尘环；`data.path` 用同一组世界顶点。
 */
const StrengthDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "brace", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xC9A06A, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 30
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 9, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.12, 0.04], sizeMode: "sin",
                    color: 0xF5E8CC, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "hits", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.06, 0.24], spread: 12,
                    lifetime: [7, 13], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "dust", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.1, 0.26], spread: 10,
                    lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0xC9A06A, alpha: [0.6, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 100
                },
                {
                    name: "shove", bind: "point", offset: [0, 0.25, 0], height: 0.35, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "pushDust", fallback: 0 }, at: 1 },
                    shape: { kind: "cylinder", radius: 0.3, length: 0.8 }, direction: "shape",
                    speed: [0.08, 0.24], spread: 16, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE0C79A, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        slam: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "wall_hit", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 16,
                    lifetime: [8, 14], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xE8E0CF, alpha: [1, 0], light: "world", bloom: 0.3
                },
                {
                    name: "grit", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40 },
                    shape: { kind: "hemisphere", radius: 0.42, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.28],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xBFA97A, alpha: [0.75, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 120
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.34, 0.08],
                    color: 0xCFC7BC, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 16], size: [0.2, 0.06],
                    color: 0x6E6A64, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_strength", 1, StrengthDefinition);

/**
 * 直拳主体：服务端只发一次，带上真实拳路 `data.path`（施法者→首接触）与起始刻、时长；客户端把一枚拳从
 *   起点短送到首接触点并停住，读得出「一拳重推」而不是速度纹加身体处的三枚拳图。固定一枚拳形加一条短
 *   速度线，无粒子生灭或额外实体。
 */
const StrengthFist = "cobblemon:particle/generic/bigfist";
function strengthNumber(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }

WorldCombatClient.scene("world_combat:move_strength_fist", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path: number[][] = Array.isArray(data.path) && data.path.length >= 2 ? data.path : null;
    if (path === null) return;
    const start = strengthNumber(data.start, frame.serverTick());
    const duration = Math.max(1, strengthNumber(data.duration, 4));
    const progress = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    const scale = Math.max(0.6, Math.min(1.8, strengthNumber(data.scale, 1)));
    const intensity = Math.max(0.6, Math.min(2.4, strengthNumber(data.intensity, 1)));
    const from = path[0], to = path[path.length - 1];
    const x = from[0] + (to[0] - from[0]) * progress;
    const y = from[1] + (to[1] - from[1]) * progress;
    const z = from[2] + (to[2] - from[2]) * progress;
    const fade = 1 - progress * 0.3;
    frame.line(from[0], from[1], from[2], x, y, z, (Math.round(0.45 * fade * 255) << 24 | 0xF5E8CC) | 0);
    frame.sprite(StrengthFist, x, y, z, (0.34 + 0.16 * intensity) * scale, 0,
        (Math.round(0.95 * fade * 255) << 24 | 0xFFF6E0) | 0, Math.floor(frame.serverTick() * 0.5) % 9, true);
});
