/**
 * 叶刃 / leafblade 的客户端表现。
 *
 * 一句话：施法者身侧的叶立起、拉长成一把绿色长刃，随后贴着一张宽弧横挥出去，切开目标的瞬间爆出一团叶屑、
 * 受创处留下一道随后的裂口；被刃风扫到的旁人各自蹭出一小撮叶屑。
 * 色相家族：草绿与白绿（cut／smallleaf／impact_grass），近白刃光（impact_grass_white）只给暴击那一下。
 * 拍子：起（draw 立刃）→ 斩（slash 宽弧横挥）→ 中（cut 命中叶屑+裂口、echo 旁人）→ 强调（crit）。
 * 范围：slash 的弧线用服务端给的顶点（`data.path`，与判定同一张角与半径）画成一条宽弧，`data.reach`／`data.span` 的
 *   锥面同时铺出扇形区域，画出来的就是这一刀真扫到的范围。
 * 运动：draw 的叶片向上长成刃；slash 的刃沿弧线扫过、碎叶沿切线甩出；cut 时叶屑向外炸、裂口闪一下。
 * 数：`data.shards`（物攻派生）决定命中与波及的叶屑量，`data.sever`（削防档数）决定裂口强调，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const LeafbladeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "draw_blade", bind: "source", offset: [0.35, 0.35, 0.15], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 20, shape: { kind: "line", length: 1.3, rotation: [0, 0, 0] },
                    direction: "inward", speed: [0.02, 0.1], spread: 8, spin: 20,
                    lifetime: [8, 15], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x9BE86A, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 34
                },
                {
                    name: "draw_edge", bind: "source", offset: [0.35, 0.5, 0.15], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "line", length: 1.2, rotation: [0, 0, 0] },
                    direction: "inward", speed: [0.01, 0.05], spread: 6,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8FFC0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 22
                }
            ]
        },
        slash: {
            duration: 20,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "swing_edge", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: 96, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.08, 0.3], spread: 10, spin: 10,
                    lifetime: [6, 11], size: [0.42, 0.08], sizeMode: "index",
                    color: 0xD8F7A0, alpha: [0.95, 0], light: "full", bloom: 0.55, maxParticles: 120
                },
                {
                    name: "swing_leaves", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 54, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.14, 0.5], spread: 18, spin: 24,
                    lifetime: [8, 15], size: [0.15, 0.02],
                    color: 0x7FBE4A, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "swing_fill", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 30, shape: { kind: "cone_volume", radius: 0.6,
                        length: { data: "reach", fallback: 3 }, angleDegrees: { data: "span", fallback: 118 } },
                    direction: "shape", speed: [0.03, 0.14], spread: 12,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xA8D97C, alpha: [0.22, 0], light: "full", maxParticles: 60
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
                    name: "cut_sever", bind: "target", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "sever", fallback: 1 }, at: 1, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.05, 0.2], spread: 20, spin: 14,
                    lifetime: [10, 18], size: [0.5, 0.12], sizeMode: "index",
                    color: 0x8FE05A, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 30
                }
            ]
        },
        echo: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "echo_burst", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.08, 0.26], spread: 22,
                    lifetime: [6, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xD8F0B0, alpha: [0.85, 0], light: "full", maxParticles: 40
                }
            ]
        },
        crit: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 }, direction: "outward", speed: [0.12, 0.42], spread: 30,
                    lifetime: [7, 14], size: [0.42, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 16, gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xB8CFA0, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leafblade", 1, LeafbladeDefinition);
