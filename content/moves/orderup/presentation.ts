/**
 * 上菜 / orderup 的客户端表现。
 *
 * 一句话：托手成盘、盘中亮起一点暖金；实际伙伴先递来一道短指令线，随后一枚托盘形龙气平抛飞出，
 * 碰到第一个身体时拍出一圈礼花；成功加到谁，就在谁身上按能力亮出对应的小符。
 * 色相家族：暖金与米白（托盘与菜势）为底，玫瑰色只做点缀；能力光环按提升的能力取红／蓝／黄之一的窄色。
 * 拍子：起（windup 托盘聚金）→ 令（order 伙伴到自身）→ 端（fly 龙气飞行）→ 中（hit 礼花）→ 供（dish 能力小符）→ 空（miss 散掉）。
 * 范围：order 的 path 是伙伴与施法者两点连成的同一道短指令线；fly 绑真实投射物，命中与增益点都读服务端给的坐标。
 * 数：`data.power`（下手威力）绑定命中礼花量，`data.stages`（增益级数）绑定能力光环环数，
 * `data.stat`（提升的能力序号）选光环色，`data.scale`（下手半宽 / 0.45）放菜势范围。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const OrderupDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "tray", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: 16, shape: { kind: "circle", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xF0C86A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "note", bind: "source", offset: [0, 0.9, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.18, 0.04],
                    color: 0xE8A0B0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 18
                }
            ]
        },
        order: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "line", bind: "path", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 22, direction: "shape", speed: [0.03, 0.12], spread: 8,
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xF0D9A0, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "note", bind: "path", offset: [0, 0.75, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    shape: { kind: "polyline" },
                    rate: 8, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xE8A0B0, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fly: {
            duration: 40,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "qi", bind: "projectile", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 26, shape: { kind: "sphere", radius: 0.22 },
                    direction: "away", speed: [0.04, 0.16], orient: "velocity",
                    lifetime: [6, 11], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xF0C86A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "tip", bind: "projectile", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    rate: 10, shape: { kind: "sphere", radius: 0.18 },
                    direction: "away", speed: [0.02, 0.1], orient: "velocity",
                    lifetime: [5, 10], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xF4E4C0, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "power", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [7, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xF4E4C0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "crumbs", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFF0C0, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 50
                }
            ]
        },
        dish: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "present", bind: "target", offset: [0, 0.8, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/present",
                    burst: { count: 6, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [0.3, 0.08],
                    color: 0xF0C86A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "aura", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "stages", fallback: 2 }, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.4, 0.14], sizeMode: "sin",
                    color: { attribute: "stat", colors: { "0": 0xF07070, "1": 0x70A8F0, "2": 0xF0D060 }, fallback: 0xF0D060 },
                    alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.8, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 16, at: 2 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [14, 22], size: [0.12, 0.02],
                    color: 0xFFF0C0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "spill", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xB0A080, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_orderup", 1, OrderupDefinition);
