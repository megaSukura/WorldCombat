/**
 * 连斩 / furycutter 的客户端表现。
 *
 * 一句话：刃上先聚起一层黄绿的薄气，随后沿着身前那条短走廊一刀接一刀地掠过，刀刀在目标身上崩出虫咬般的碎屑；
 * 层数每长一层，刃气就更密、更亮一分，落空时这股气立刻散掉。
 * 色相家族：黄绿刃气（swipe／cut／smallsparkle）＋近白高光（cut）＋中性尘（tinydust）。原色为主，只做轻微偏绿。
 * 拍子：起（windup 聚气）→ 斩（cut 逐刀走廊、bite 命中）→ 续（rise 层数上升／streak 层数存续／drop 断招散去）。
 * 范围：cut 用 `data.path`（与服务端 WorldGeometry.lane 同一组四个顶点）铺成走廊，走廊多长多宽画面就是那块。
 * 运动：刃风由近及远沿走廊扫过、左右交替（`data.side` 翻转）；命中碎屑在目标身上向外爆；层数上升时全身向上亮一次。
 * 数：服务端每挥一刀发一条 cut 载荷，条数就是机制段数；cut 的刃面量绑定 `data.notes`（机制段数换算），
 *   命中碎屑绑定 `data.sparks`（每刀威力换算），层数上升的亮点绑定 `data.cuts`（1／2／4），
 *   刃气大小绑定 `data.aura`（由当前层数推出的 0.06..0.12 格）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FurycutterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "blade_gather", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: { data: "aura", fallback: 0.08 },
                    color: 0xB8D45A, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 32
                }
            ]
        },
        cut: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "pass_fill", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" }, rate: 30, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.3, 0.06],
                    color: 0x9FC24E, alpha: [0.4, 0], light: "full", maxParticles: 90
                },
                {
                    name: "pass_edge", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "notes", fallback: 26 }, direction: "shape", speed: [0.06, 0.2], spread: 10,
                    lifetime: [5, 9], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xF2F6D4, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        bite: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "bite_burst", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "sparks", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE6F0B4, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 48
                },
                {
                    name: "bite_shard", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/scratch_yellow",
                    burst: { count: { data: "sparks", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.05, drag: 0.92,
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0x8FA83E, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        rise: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "tier_up", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "cuts", fallback: 2 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xC8E46A, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "tally", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "cuts", fallback: 2 }, at: 0 },
                    shape: { kind: "line", length: 0.34 },
                    direction: "up", speed: [0, 0], spread: 0,
                    lifetime: [10, 18], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF6B8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 24
                }
            ]
        },
        streak: {
            duration: 40,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "blade_aura", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 6, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: { data: "aura", fallback: 0.08 },
                    color: 0xA6C84E, alpha: [0.4, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        drop: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fall_away", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A9A5A, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "quiet_out", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.05, 0.02],
                    color: 0x93A566, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x9AA56A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_furycutter", 1, FurycutterDefinition);
