/**
 * 真空波 / vacuumwave 的客户端表现。
 *
 * 一句话：双拳抡起、空气朝身前收拢，随后一道贴着地面的低压环向前推过整条走廊，把路上的尘土与碎屑
 *   朝施法者抽回来；被抽到的人身上爆开一记格斗冲击、并顺着回吸方向滑向施法者。推空时只在尽头散成一阵风。
 * 色相家族：青白冷风一族（0xCFE8E0 主体、0xEAF6F2 高光、0x9FB8B0 中性气流），冲击点借格斗的暖白点缀。
 * 拍子：起 charge（收气）→ 推 lane（走廊轮廓）＋ wave（推进环）→ 击 suck（回吸与冲击）→ 收 whiff。
 * 范围：lane 用 `data.path`（与服务端 WorldGeometry.lane 同一组四个顶点）铺出整条走廊，走廊多宽多长画面就是那块。
 * 运动：wave 环带 `orient: "direction"` 迎着推进方向张开，环内粒子向内收拢＝吸；suck 的尘土沿 `data.direction`
 *   （目标→施法者）回卷，把「被抽回来」画出来。
 * 数：lane 与 wave 的气流量绑定 `data.gust`（特攻与速度换算），尺度绑定 `data.scale`（波面半宽换算），
 *   亮暗绑定 `data.intensity`（波威力换算）；suck 的冲击量同样绑定 `data.gust`。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const VacuumwaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 2 },
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "charge_intake", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 30, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xCFE8E0, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "charge_ring", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [7, 13], size: [0.3, 0.55],
                    color: 0xEAF6F2, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        lane: {
            duration: 46,
            exit: { stop: 34, drain: 16 },
            emitters: [
                {
                    name: "lane_fill", bind: "path", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polygon" },
                    rate: { data: "gust", fallback: 20 }, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xCFE8E0, alpha: [0.16, 0], light: "world", maxParticles: 90
                },
                {
                    name: "lane_edge", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "polyline", closed: true },
                    rate: 24, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x9FB8B0, alpha: [0.3, 0], light: "world", maxParticles: 70
                }
            ]
        },
        wave: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wave_ring", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0, interval: 3, repeats: 5 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", orient: "direction", speed: [0.12, 0.4], spread: 8,
                    lifetime: [6, 12], size: [0.4, 0.9], sizeMode: "index",
                    color: 0xEAF6F2, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 12
                },
                {
                    name: "wave_suck", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "gust", fallback: 20 }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.1, 0.3], spread: 14,
                    lifetime: [4, 9], size: [0.07, 0.02], sizeMode: "index",
                    color: 0x9FB8B0, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        suck: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "suck_back", bind: "point", fit: "none", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "gust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: [{ data: "direction.0", fallback: -1 }, { data: "direction.1", fallback: 0 }, { data: "direction.2", fallback: 0 }],
                    speed: [0.14, 0.44], spread: 18,
                    lifetime: [6, 12], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xCFE8E0, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "suck_impact", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.6, 1.3], sizeMode: "index",
                    color: 0xEAF6F2, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff_puff", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "gust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x9FB8B0, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vacuumwave", 1, VacuumwaveDefinition);
