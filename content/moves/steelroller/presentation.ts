/**
 * 铁滚轮 / steelroller 的客户端表现。
 *
 * 一句话：施法者把脚下场地的颜色收进轮缘（被压碎那一刻才染上场地主色）、卷成一只钢轮 → 场地被从根上压碎
 * （土块与场地色光点向上崩开），钢轮贴着地面沿真实路径碾出去、滚过的地面才甩出短命钢屑，撞上目标炸开钢铁
 * 冲击与贴地环；撞墙即停。
 * 色相家族：钢灰（0xB8BEC8）与近白（0xF0F4F8）；场地色只出现在被吃掉场地的收卷、轮身、场纹崩开与地面钢屑上。
 * 拍子：起 spin（收色成轮，提交前）／空转 falter → 碎 tear（压碎场地）→ 滚 roll（贴地碾行）→
 *       屑 chips（真实滚过的每一段地面）→ 击 impact／停 skid。
 * 范围：impact 的贴地环与 tear 的崩开半径用 `data.scale`（判定半径 / 0.5）给出，玩家看出这一滚能咬住多大的圈。
 * 运动：tear 的土块向上崩、roll 的钢屑贴地向外甩、chips 的碎屑在原地落下、impact 的碎片由内向外炸。
 * 数：`data.scraper`（物攻派生的钢屑数量）驱动滚动与地面钢屑，`data.fields`（被压碎的场地数）决定 tear 的强度，
 *   `data.fieldColor`（被吃掉场地的主色）染色轮身与钢屑。
 */
const SteelrollerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        spin: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 12, shape: { kind: "cylinder", radius: 0.4, length: 0.7 },
                    direction: "inward", speed: [0.03, 0.14], spread: 20,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "sin",
                    color: { data: "fieldColor", fallback: 0xB8BEC8 }, alpha: [0.75, 0], light: "full", maxParticles: 80
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.44 },
                    direction: "inward", speed: [0.02, 0.08], spread: 10,
                    lifetime: [9, 15], size: [0.07, 0.01],
                    color: 0x8A8F96, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 50
                }
            ]
        },
        falter: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "stall", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [9, 15], size: [0.2, 0.05],
                    color: 0x6E6A64, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        tear: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "crush", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "scraper", fallback: 18 } },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1.0 } },
                    direction: "up", speed: [0.08, 0.3], spread: 26,
                    gravity: 0.05,
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0xA89070, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "spark", bind: "point", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "fields", fallback: 1 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.1, 0.3],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: { data: "fieldColor", fallback: 0xD8E8D0 }, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        roll: {
            duration: { data: "travel", fallback: 20 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wheel", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 24, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08], spread: 30,
                    lifetime: [5, 9], size: [0.26, 0.05],
                    color: 0xC8CED6, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "scraper", fallback: 18 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], spread: 14,
                    lifetime: [6, 11], size: [0.08, 0.01],
                    color: 0x9AA0A8, alpha: [0.55, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 140
                },
                {
                    name: "aura", bind: "source", offset: [0, 0.28, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 7, shape: { kind: "cylinder", radius: 0.42, length: 0.5 },
                    direction: "outward", speed: [0.01, 0.05], spread: 24,
                    lifetime: [7, 12], size: [0.16, 0.03], sizeMode: "sin",
                    color: { data: "fieldColor", fallback: 0xB8BEC8 }, alpha: [0.55, 0], light: "full", maxParticles: 50
                }
            ]
        },
        chips: {
            duration: 22,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "shard", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "scraper", fallback: 4 } },
                    shape: { kind: "circle", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.12], spread: 34,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [6, 11], size: [0.08, 0.01],
                    color: 0x9AA0A8, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "tint", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 1 },
                    shape: { kind: "circle", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [5, 9], size: [0.1, 0.02],
                    color: { data: "fieldColor", fallback: 0xB8BEC8 }, alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "smash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xE8EEF4, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "shard", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.36], spread: 22,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0xB8BEC8, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ground", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [10, 16], size: [0.5, 0.18],
                    color: 0x8A9098, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        skid: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dust", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "circle", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9A9078, alpha: [0.5, 0], gravity: 0.03, light: "world", maxParticles: 40
                },
                {
                    name: "scrape", bind: "point", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 5 },
                    shape: { kind: "line", length: 0.7 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [6, 10], size: [0.2, 0.05],
                    color: 0xC8CED6, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_steelroller", 1, SteelrollerDefinition);
