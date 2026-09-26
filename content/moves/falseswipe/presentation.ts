/**
 * 点到为止 / falseswipe 的客户端表现。
 *
 * 一句话：刃尖在身前拉出一条极细的白缝，止于刀路真正的第一接触——划过目标的一瞬只闪一下近白的收手标记：
 * 血留住，人没倒。
 * 色相家族：近白与冷银（softswipe／slash／impact_normal／smallsparkle）＋中性尘（tinydust）。
 * 拍子：起（windup 聚刃）→ 切（cut 细缝、strike 命中）→ 留手（spare 收手标记）→ 空挥（miss）。
 * 范围：cut 用 `data.path`——与服务端 `action.trace` 的同一组起止点，画到实际首碰（实体或方块）为止；
 *   刀路多长、停在哪儿，画面就是那一段，不再画满整条 reach。
 * 运动：粒子从刃根沿缝扫向远端，命中处向外散出细碎白光，收手标记在原地停一瞬再淡去。
 * 数：`data.hold`（物攻换算的收手标记量）绑定细缝亮度与收手标记的点数，`data.intensity`（威力 / 44）放大整幕。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */

// 本招的停手提示使用声明依赖中的伙伴 UI 翻译入口。
CompanionWorldUi.reason("falseswipe-spared", "worldcombat.reason.falseswipe-spared");

const FalseswipeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 8,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "edge_line", bind: "source", offset: [0, 0.95, 0.18], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "line", length: 0.45 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xEEF3FA, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        cut: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "seam_fill", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" }, rate: { data: "hold", fallback: 12 }, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.24, 0.05],
                    color: 0xEAF0F8, alpha: [0.3, 0], light: "full", maxParticles: 90
                },
                {
                    name: "seam_edge", bind: "path", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 24, direction: "shape", speed: [0.04, 0.14], spread: 6,
                    lifetime: [5, 10], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        strike: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "touch_burst", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "hold", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF4F8FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "touch_dust", bind: "target", offset: [0, 0.25, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 16], size: [0.05, 0.02],
                    color: 0x9AA0A8, alpha: [0.35, 0], light: "world", maxParticles: 26
                }
            ]
        },
        spare: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "hold_mark", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "hold", fallback: 2 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.42, 0.1],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 16
                },
                {
                    name: "hold_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.3, 0.05],
                    color: 0xDCE8F6, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xA6A8AC, alpha: [0.3, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_falseswipe", 1, FalseswipeDefinition);
