/**
 * 彗星拳 / meteormash —— 客户端表现。
 *
 * 一句话：拳上聚起流星火花 → 冲进拳程时拳锋拖出火尾 → 一拳砸下，拳锋炸开钢白闪光与火舌、碎石迸起 →
 *   接触点按真实地材迸出碎屑并留下一圈短陨星烫印 → 砸实的反震让施法者身上升起一道钢白光环。
 * 色相家族：钢白与冷灰（fist / impact_steel / star 为主体，0xB8BEC8、0xEDF2FA）为骨架，
 * 流星火橙（0xFF8A3A、0xFFC24A）只出现在拳锋与火舌——钢铁与火焰是这一招的含义，两个色相各司其职。
 * 拍子：起 windup（聚火）→ 冲 charge（火尾）→ 砸 smash（拳锋下扫）→ hit（逐个震开）→ 撞 crash（地材碎屑与烫印）→ 涌 surge／空 miss。
 * 范围：smash 的拳锋沿 `data.path` 的真实下扫轨迹；crash 的碎屑与烫印半径按 `data.scorch`（落点半径）画出，接触点才出现。
 * 运动：拳锋沿 `data.path` 从前上方扫到前下方；碎石受重力下落，火星向上迸散。
 * 数：`data.flare`（攻击与等级换算）绑定火星与碎石量，`data.hits`（实际震到人数）影响 crash 的强度，
 *   `data.intensity`（本次威力比例）缩放发射量；碎屑颜色按 `data.block`（真实接触方块的 id）取对应地材色，未命中方块用中性灰。
 */
const MeteormashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "windup_fire", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0xFF8A3A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "windup_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.05, 0.01],
                    color: 0x8C8A82, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "charge_trail", bind: "source", offset: [0, 0.5, 0], height: 0.5, trail: { minDistance: 0.14 },
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 30, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [7, 13], size: [0.16, 0.02],
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 80
                },
                {
                    name: "charge_gust", bind: "source", offset: [0, 0.3, 0], height: 0.3, trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "sphere", radius: 0.25 },
                    direction: "away", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8C8A82, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        smash: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fist_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flare", fallback: 22 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.1, 0.36], drag: 0.9,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFF8A3A, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "fist_core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 8, shape: { kind: "polyline" },
                    direction: "away", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.28, 0.05],
                    color: 0xEDF2FA, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.36], spread: 22,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEDF2FA, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "hit_fire", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "flare", fallback: 22 } },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.12, 0.4], gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xFFC24A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 140
                }
            ]
        },
        crash: {
            duration: 30,
            exit: { stop: 11, drain: 22 },
            emitters: [
                {
                    name: "crash_debris", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "flare", fallback: 22 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "scorch", fallback: 1.4 } },
                    direction: "up", speed: [0.3, 0.85], spread: 28,
                    gravity: 0.09, drag: 0.95,
                    lifetime: [16, 30], size: [0.26, 0.05],
                    color: { attribute: "block", colors: {
                        "minecraft:stone": 0x8C8A82, "minecraft:cobblestone": 0x8C8A82, "minecraft:deepslate": 0x6E6E70,
                        "minecraft:dirt": 0x8A6A4A, "minecraft:coarse_dirt": 0x8A6A4A, "minecraft:grass_block": 0x6F8A4A,
                        "minecraft:sand": 0xE0D2A0, "minecraft:red_sand": 0xC06A3A, "minecraft:gravel": 0x9A948A,
                        "minecraft:netherrack": 0x8A4038, "minecraft:blackstone": 0x4A4048, "minecraft:basalt": 0x5A5A62,
                        "minecraft:andesite": 0x8A8A86, "minecraft:granite": 0xA06050, "minecraft:diorite": 0xB8B8B4,
                        "minecraft:snow_block": 0xF0F4F8, "minecraft:terracotta": 0xA8654A, "minecraft:sandstone": 0xD8C890
                    }, fallback: 0x8C8A82 },
                    alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "crash_scorch", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "flare", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "scorch", fallback: 1.4 } },
                    direction: "up", speed: [0.01, 0.04], spread: 12,
                    gravity: 0.01, drag: 0.9,
                    lifetime: { data: "scorchTicks", fallback: 120 }, size: [0.5, 0.1], sizeMode: "sin",
                    color: 0x4A4038, alpha: [0.5, 0], alphaMode: "sin", light: "world", maxParticles: 60
                },
                {
                    name: "crash_shock", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 40, shape: { kind: "ring", radius: { data: "scorch", fallback: 1.4 } },
                    direction: "outward", speed: [0.03, 0.14], spread: 8,
                    lifetime: [10, 18], size: [0.36, 0.8],
                    color: 0xC9A24A, alpha: [0.7, 0], light: "world", maxParticles: 100
                },
                {
                    name: "crash_smoke", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 26, shape: { kind: "circle", radius: { data: "scorch", fallback: 1.4 } },
                    direction: "up", speed: [0.02, 0.1], spread: 12,
                    gravity: 0.01, drag: 0.9,
                    lifetime: [14, 26], size: [0.24, 0.03],
                    color: 0x6E6A62, alpha: [0.45, 0], light: "world", maxParticles: 90
                }
            ]
        },
        surge: {
            duration: 26,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "surge_ring", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 26, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xEDF2FA, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "surge_sparks", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 22, shape: { kind: "cylinder", radius: 0.7, length: 1.4 },
                    direction: "up", speed: [0.06, 0.24], drag: 0.9,
                    lifetime: [9, 17], size: [0.13, 0.02],
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "miss_scuff", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "flare", fallback: 12 } },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.88,
                    lifetime: [9, 16], size: [0.06, 0.02],
                    color: 0x6E6A62, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_meteormash", 1, MeteormashDefinition);
