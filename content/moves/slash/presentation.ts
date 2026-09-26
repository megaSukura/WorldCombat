/**
 * 劈开 / slash 的客户端表现。
 *
 * 一句话：刃尖举过头顶聚起一道竖直亮线，随后一条窄走廊从高处压下，命中处划出一道由高处斜下的长刀痕；
 * 真劈中要害时，落点再闪一记更亮的白星。
 * 色相家族：近白与冷银（swipe／cut／impact_normal／bigsparkle）＋中性尘（tinydust）＋暗红的一点强调（critical_hit）。
 * 拍子：起（windup 举刃）→ 劈（cleave 窄走廊、fall 一条斜下长刀痕、strike 命中）→ 强调（crit 要害，仅真实暴击）。
 * 范围：cleave 用 `data.path`（与服务端 WorldGeometry.lane 同一组四个顶点）铺成窄走廊；fall 用 `data.path`
 *   （服务端 slashStroke 的两个顶点）画斜下长刀痕——判定与画面读同一份顶点，普通命中只有这一条、没有交叉双刀。
 * 运动：走廊粒子从刃根向远端扫过，fall 沿斜线由高处落到命中点，命中碎屑向外爆。
 * 数：`data.notes`（物攻换算的崩屑量）绑定走廊与命中火花的量；`data.scale`／`data.intensity` 让重刃比疾刃更大更亮；
 *   要害标记的尺寸读 `data.scale`（实际伤害换算）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SlashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 1.05, 0.15], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 15, shape: { kind: "line", length: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xE8EEF6, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 28
                }
            ]
        },
        cleave: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lane_fill", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" }, rate: { data: "notes", fallback: 18 }, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [7, 14], size: [0.32, 0.06],
                    color: 0xEEF2F8, alpha: [0.3, 0], light: "full", maxParticles: 110
                },
                {
                    name: "lane_edge", bind: "path", offset: [0, 0.65, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: 22, direction: "shape", speed: [0.05, 0.16], spread: 8,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 80
                }
            ]
        },
        fall: {
            duration: 18,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "stroke", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 52, direction: "shape", speed: [0.05, 0.18], spread: 6,
                    lifetime: [4, 10], size: [0.5, 0.09], sizeMode: "index",
                    color: 0xFAFCFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 130
                }
            ]
        },
        strike: {
            duration: 18,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "hit_burst", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "notes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.07, 0.22], spread: 22,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF4F8FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "hit_dust", bind: "target", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9AA0A8, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "weak_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: { data: "marks", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.55, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 20
                },
                {
                    name: "weak_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 22, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], spread: 30,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFF6E8, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 34
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xA6A8AC, alpha: [0.32, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_slash", 1, SlashDefinition);
