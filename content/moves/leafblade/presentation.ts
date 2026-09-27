/**
 * 叶刃 / leafblade 的客户端表现。
 *
 * 一句话：施法者身侧的叶立起、拉长成一把绿色长刃，随后这笔薄刃由左前低侧一笔扫到右前高侧——每刻只画当前
 * 真实的一段刀锋（与服务端 `action.trace` 同一对端点）和刚扫过的一小段弧，切中目标的瞬间爆出一团叶屑并沿
 * 刀路补一道裂口；挥空时刀尖清楚收回。
 * 色相家族：草绿与白绿（cut／smallleaf／impact_grass），近白刃光（impact_grass_white）只给暴击那一下。
 * 拍子：起（draw 立刃）→ 斩（sweep 当前锋缘、arc 刚过的弧）→ 中（cut 叶屑）→ 强调（crit 沿同一笔的白闪）。
 * 范围：sweep／arc 的顶点就是服务端这一拍真正的刀根→刀尖与最近几个刀尖，判定与画面共用同一组端点；不铺整片扇面。
 * 运动：draw 的叶向上长成刃；sweep 每拍把刀锋画到新的角度与高度，已发出的粒子留成刚过的弧。
 * 数：`data.shards`（物攻派生）决定叶屑量，`data.scale` 随实际刃长缩放，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const LeafbladeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 12,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "draw_blade", bind: "source", offset: [0.32, 0.35, 0.12], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 18, shape: { kind: "line", length: 1.25, rotation: [0, 0, 0] },
                    direction: "inward", speed: [0.02, 0.09], spread: 8, spin: 20,
                    lifetime: [8, 15], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x9BE86A, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 32
                },
                {
                    name: "draw_edge", bind: "source", offset: [0.32, 0.5, 0.12], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 9, shape: { kind: "line", length: 1.2, rotation: [0, 0, 0] },
                    direction: "inward", speed: [0.01, 0.05], spread: 6,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8FFC0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 22
                }
            ]
        },
        sweep: {
            duration: 22,
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "blade_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: 90, shape: { kind: "polyline" }, direction: "shape", speed: [0.06, 0.26], spread: 8,
                    lifetime: [5, 10], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xD8F7A0, alpha: [0.95, 0], light: "full", bloom: 0.55, maxParticles: 120
                },
                {
                    name: "blade_leaf", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 42, shape: { kind: "polyline" }, direction: "shape", speed: [0.12, 0.44], spread: 18, spin: 24,
                    lifetime: [7, 14], size: [0.15, 0.02],
                    color: 0x7FBE4A, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "blade_glow", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 26, shape: { kind: "polyline" }, direction: "shape", speed: [0.04, 0.16], spread: 10,
                    lifetime: [4, 9], size: [0.1, 0.02],
                    color: 0xE8FFC0, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 60
                }
            ]
        },
        arc: {
            duration: 18,
            exit: { stop: 2, drain: 9 },
            emitters: [
                {
                    name: "arc_trace", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: 40, shape: { kind: "polyline" }, direction: "shape", speed: [0.04, 0.18], spread: 12,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xA8D97C, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        cut: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "cut_burst", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 }, direction: "outward", speed: [0.1, 0.36], spread: 26,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF2FFD0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "cut_stroke", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.2], spread: 10, spin: 12,
                    lifetime: [8, 15], size: [0.44, 0.08], sizeMode: "index",
                    color: 0xBFE86A, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 50
                }
            ]
        },
        crit: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "vital_stroke", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.08, 0.3], spread: 16,
                    lifetime: [6, 12], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 60
                },
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 6, at: 0 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    lifetime: [5, 10], size: [0.12, 0.02],
                    color: 0xE8FFC0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 18
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.16], spread: 18, spin: 18, gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0x8FBF5A, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        block: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "block_chip", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 8, at: 0 }, shape: { kind: "cone", radius: 0.24, angleDegrees: 30 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24, spin: 16,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0x9BC46A, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leafblade", 1, LeafbladeDefinition);
