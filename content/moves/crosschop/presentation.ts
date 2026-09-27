/**
 * 十字劈 / crosschop 的客户端表现。
 *
 * 一句话：双臂交叉举过头顶 → 在同一个竖直挥击面上，第一笔从左上扫到右下、第二笔隔一瞬从右上扫到左下，两笔都穿过
 *   锁定的交叉点并继续越过 → 两笔的残迹自然叠成一个 X，第二笔正中同一目标时在接触处短闪一下 → 都落空就只留一道扑空的风。
 * 色相家族：暗红（0xD24B3E 主体、0x8C2F26 暗部）＋骨白（0xF2E8DC）只出现在刃口、命中与第二笔上。
 * 拍子：起 windup（交叉举高）→ 劈 guard／seam（每刻画当前真实子段，`data.point` 是当刻刀尖）→ 中 cut（正中）→ 收 miss。
 * 范围：guard／seam 的 `data.path` 每刻只有一小段——上一刀尖到当前刀尖、撞墙就停在墙上；服务端判定与表现读同一组端点。
 * 运动：刃口沿当刻子段扫过、刀尖跟着 `data.point` 走，上一笔停下后只留很短残迹，两笔先后叠出 X。
 * 数：`data.intensity`（每劈威力换算）驱动刃口密度与亮度，`data.scale`（交叉幅度换算）决定两笔张开多大。
 */
const CrossChopDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: { data: "windup", fallback: 8 }, drain: 10 },
            emitters: [
                {
                    name: "rise", bind: "source", offset: [0, 1.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 16, shape: { kind: "arc", radius: 0.7, arcDegrees: 120, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.02, 0.08], spin: 6,
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0xD24B3E, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "core", bind: "source", offset: [0, 1.1, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.25 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [7, 12], size: [0.06, 0.01],
                    color: 0xF2E8DC, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        guard: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "chop_a", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 90, direction: "outward", speed: [0.04, 0.2], spread: 12,
                    lifetime: [7, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xD24B3E, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 120
                },
                {
                    name: "tip_a", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 20, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.06, 0.22], spin: 8,
                    lifetime: [6, 11], size: [0.26, 0.06],
                    color: 0xF2E8DC, alpha: [0.8, 0], light: "world", maxParticles: 30
                }
            ]
        },
        seam: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "chop_b", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 110, direction: "outward", speed: [0.05, 0.24], spread: 12,
                    lifetime: [7, 12], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xF2E8DC, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 150
                },
                {
                    name: "tip_b", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    rate: 18, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [6, 12], size: [0.3, 0.07],
                    color: 0xD24B3E, alpha: [0.8, 0], light: "world", maxParticles: 24
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "chip", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30, spin: 12,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x9A8F82, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], spread: 18,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0x8C2F26, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        cut: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.34], spread: 24,
                    lifetime: [7, 13], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF2E8DC, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xF2E8DC, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        cross: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [7, 13], size: [0.4, 0.08], sizeMode: "index",
                    color: 0xD24B3E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18], spin: 6,
                    lifetime: [9, 15], size: [0.24, 0.05],
                    color: 0x8C2F26, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crosschop", 1, CrossChopDefinition);
