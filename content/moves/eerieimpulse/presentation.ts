/**
 * 怪异电波 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身上攒起一圈吱吱作响的电弧 → 一道绿黄色的电波以它为中心贴地铺开、扫过整块地皮 →
 *   被扫到的敌人身上炸开一记电火花、身上挂着抽动的干扰电弧。
 *
 * 色相家族：电黄绿（0xF0E86A／0xA8D84A）为主体，近白（0xF8F8D8）只给放电的高光；没有第二个色相。
 * 层次：身上攒电（起手）→ 贴地扫开的电波圈＋地面电纹（击）→ 每个目标身上的电火花（结果）→ 抽动的余电（持续）。
 * 起击收：windup（攒电）→ pulse（电波放开、只播一次）→ jam（逐目标）→ linger（余电慢慢散去）。
 * 范围：pulse 的圆环半径就是判定用的电波半径（`data.radius`），铺到哪就是会被扰乱到哪；玩家一眼看出站在哪圈里。
 * 运动：电波从中心沿地面向外推；被扫中者身上的电弧在原地抽动。
 * 数：电波的密度绑 `data.arcs`（速度派生），圆环半径绑 `data.radius`（体型与等级派生），掉级绑 `data.drop`。
 */
const EerieImpulseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charge", bind: "source", offset: [0, 0.2, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 18, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12], spin: 14,
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xF0E86A, alpha: [0.6, 0], light: "full", maxParticles: 46
                },
                {
                    name: "charge_core", bind: "source", offset: [0, 0.24, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 8, interval: 4, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16], spread: 24,
                    lifetime: [5, 10], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xF8F8D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        pulse: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "field_wave", bind: "point", height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "arcs", fallback: 12 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.35, 0.85], spread: 6, gravity: 0.0,
                    lifetime: [6, 12], size: [0.18, 0.04],
                    color: 0xA8D84A, alpha: [0.7, 0], light: "full", maxParticles: 300
                },
                {
                    name: "field_ground", bind: "point", height: 0.06, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: { data: "arcs", fallback: 12 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.25, 0.6], spread: 12,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xF8F8D8, alpha: [0.8, 0], light: "full", maxParticles: 260
                },
                {
                    name: "field_edge", bind: "point", height: 0.12, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, interval: 3, repeats: 4 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: [8, 14], size: [0.28, 0.8],
                    color: 0xA8D84A, alpha: [0.5, 0], light: "world", maxParticles: 20
                },
                {
                    name: "field_core", bind: "source", offset: [0, 0.25, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 14 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.3], spread: 30,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0xF8F8D8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        jam: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "jam_core", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.22], spread: 26,
                    lifetime: [8, 14], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xA8D84A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "jam_arcs", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "drop", fallback: 2 }, interval: 2, repeats: 4 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14], spin: 20,
                    lifetime: [6, 12], size: [0.12, 0.01],
                    color: 0xF0E86A, alpha: [0.85, 0], light: "full", maxParticles: 36
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_arcs", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 4, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xA8D84A, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 18
                },
                {
                    name: "linger_motes", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xF8F8D8, alpha: [0.4, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_eerieimpulse", 1, EerieImpulseDefinition);
