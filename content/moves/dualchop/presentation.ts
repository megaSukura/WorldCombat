/**
 * 二连劈 / dualchop 的客户端表现。
 *
 * 一句话：施法者抬起前肢先竖举再横转对准准线，第一刀沿这条窄线逐刻重劈下去、在真正触到身体或墙处带出一道
 *   紫黑的龙能裂痕，第二刀以第一刀落点为圆心逐刻横向扫过一记宽短横斩。
 * 色相家族：龙紫（0x8E6BD9、0xC79BE8）做刀路与能量，灰白（0xE6E2D8）做碎石，近白只给第二刀横斩的高光。
 * 拍子：起 raise（先竖后横）→ 一 chop1（沿 `data.path` 逐刻推进的窄重刀路）→ 裂 crack（只画首刀实际触到的支撑面）→
 *   二 chop2（以落点为圆心逐刻扫出的宽短横斩）→ 中 hit1/hit2 → 收 settle。
 * 范围：chop1 消费 `data.path`（当刻真实子段，眼位到刀锋）；chop2 消费服务端每刻上传的 `data.path`（落点加
 *   截断后的子弧顶点）、`data.point` 是当刻刃尖；crack 消费 `data.path`（首刀触点的短地面线），
 *   `data.crackTicks` 决定它停留多久。
 * 运动：chop1 沿刀路从高处压向触点；chop2 的刃尖沿地面绕落点扫过、只亮当刻子弧。
 * 数：`data.shards`（物攻派生）绑定碎石与刃光量，`data.intensity`（实际威力派生）抬高亮度，`data.quake` 决定裂痕线长度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DualchopDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.5, 0.3], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 3, interval: 2, repeats: 3 },
                    shape: { kind: "box", size: [0.35, 0.35, 0.35] },
                    direction: "inward", speed: [0.02, 0.1], spread: 14,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xC79BE8, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 24
                },
                {
                    name: "axis", bind: "source", offset: [0, 0.7, 0.35], height: 0.4, fit: "body", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 10, shape: { kind: "box", size: [1.6, 0.08, 0.08] },
                    direction: "shape", speed: [0.02, 0.08], spread: 6, spin: 6,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0x8E6BD9, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        chop1: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "blade", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 60, shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.04, 0.18], spread: 8, spin: 9,
                    lifetime: [6, 12], size: [{ data: "edge", fallback: 0.32 }, 0.04], sizeMode: "index",
                    color: 0x8E6BD9, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "energy", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 34, shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.03, 0.14], spread: 10,
                    lifetime: [7, 14], size: [0.11, 0.02],
                    color: 0xC79BE8, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "dust", bind: "point", fit: "none", start: 2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "box", size: [0.6, 0.12, 0.6] },
                    direction: "outward", speed: [0.06, 0.24], spread: 34, gravity: 0.09, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xE6E2D8, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        crack: {
            // 裂痕停留时长接第一刀参数 crackTicks：不同等级/体型裂得一样久，不再固定 26 刻。
            duration: { data: "crackTicks", fallback: 60 },
            exit: { drain: 14 },
            emitters: [
                {
                    name: "seam", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 6, burst: { count: { data: "shards", fallback: 10 }, at: 1 },
                    shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.02, 0.1], spread: 8, gravity: 0.03,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x8E6BD9, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "glow", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 4, burst: { count: { data: "shards", fallback: 6 }, at: 1 },
                    shape: { kind: "polyline", closed: false },
                    direction: "up", speed: [0.04, 0.16], spread: 10,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xC79BE8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        chop2: {
            duration: 0,
            exit: { drain: 13 },
            emitters: [
                {
                    // 逐刻上传的当前子弧：一条短横刃掠过落点两侧，判定与画面共用端点。
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "shards", fallback: 24 }, direction: "shape", speed: [0.18, 0.5], spread: 9, spin: -12,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xC79BE8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "dust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polygon" },
                    rate: { data: "shards", fallback: 16 }, direction: "shape", speed: [0.05, 0.2], spread: 26, gravity: 0.07, drag: 0.9,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xE6E2D8, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    // 当前刃尖：只有这一点跟着子弧走，不铺满整扇。
                    name: "tip", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 8 }, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.1, 0.32], spread: 22,
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 36
                }
            ]
        },
        hit1: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "break", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        hit2: {
            duration: 22,
            exit: { stop: 6, drain: 13 },
            emitters: [
                {
                    name: "breach", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 }, direction: "outward", speed: [0.12, 0.42], spread: 28,
                    lifetime: [7, 14], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 70
                },
                {
                    name: "rubble", bind: "target", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 }, direction: "outward", speed: [0.1, 0.4], spread: 30, gravity: 0.1, drag: 0.9,
                    lifetime: [9, 16], size: [0.14, 0.03],
                    color: 0xE6E2D8, alpha: [0.7, 0], light: "world", maxParticles: 44
                }
            ]
        },
        miss1: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.12], spread: 16, gravity: 0.02, drag: 0.9,
                    lifetime: [9, 16], size: [0.14, 0.02],
                    color: 0xE6E2D8, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        miss2: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                { orient: "heading",
                    name: "empty", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "sector", radius: { data: "breadth", fallback: 1.8 }, angleDegrees: { data: "span", fallback: 100 } },
                    direction: "shape", speed: [0.03, 0.12], spread: 18, gravity: 0.02, drag: 0.9,
                    lifetime: [9, 16], size: [0.13, 0.02],
                    color: 0xE6E2D8, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        settle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "breadth", fallback: 1.8 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [7, 13], size: [0.18, 0.05],
                    color: 0x8E6BD9, alpha: [0.45, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dualchop", 1, DualchopDefinition);
