/**
 * 蟹钳锤 / crabhammer 的客户端表现。
 *
 * 一句话：钳口高举过顶、海水在钳面上聚成一层薄膜 → 钳子垂直砸下，落点炸开深青浪花并沿地面荡开一圈水浪 →
 *   裂甲档位下目标的架势被敲裂、溅起碎屑 → 什么都没砸到就只留一地水花。
 * 色相家族：深海青（0x1F8FA8 主体、0x5FC4D4 亮面）＋浪白（0xEAFBFF）只出现在浪尖与命中，比水流尾的浅蓝更深一档。
 * 拍子：起 hoist（举钳聚水）→ 砸 slam（落点爆开）→ 裂 crack（敲裂架势）＋ shock（地面水环）→ 收 miss。
 * 范围：shock 的地面圈按 `data.radius`（水环半径）铺开，画出的就是会被掀到的那圈。
 * 运动：slam 的浪花从落点向外上抛再落回；shock 的水环贴地向外扩，裂甲碎屑贴目标炸开。
 * 数：`data.splash`（体重与物攻换算）决定浪花与碎屑量，`data.scale`（水环半径换算）决定圈与爆开的尺度，
 *   `data.intensity`（砸击威力换算）抬高密度与亮度。
 */
const CrabhammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        hoist: {
            duration: { data: "windup", fallback: 16 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 1.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 30, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.04, 0.16], spin: 8,
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x5FC4D4, alpha: [0.7, 0], light: "world", maxParticles: 110
                },
                {
                    name: "film", bind: "source", offset: [0, 1.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble_krabby",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.18, 0.04],
                    color: 0xEAFBFF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 50
                }
            ]
        },
        slam: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "crush", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.12, 0.42], spread: 24,
                    lifetime: [7, 13], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "spray", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.14, 0.46], spread: 30,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [12, 22], size: [0.24, 0.05],
                    color: 0x5FC4D4, alpha: [0.9, 0], light: "world", maxParticles: 140
                },
                {
                    name: "ground", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [12, 20], size: [0.7, 1.5], sizeMode: "sin",
                    color: 0x1F8FA8, alpha: [0.45, 0], light: "world", maxParticles: 6
                }
            ]
        },
        crack: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "splinter", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28, spin: 10,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [11, 20], size: [0.16, 0.03],
                    color: 0xB9D4DC, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "crackshine", bind: "target", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        shock: {
            duration: 26,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "wave", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [12, 22], size: [0.4, 1.1], sizeMode: "sin",
                    color: 0x5FC4D4, alpha: [0.6, 0], light: "world", maxParticles: 8
                },
                {
                    name: "foam", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.06, 0.22], spread: 22,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "haze", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.08],
                    lifetime: [16, 28], size: [0.3, 0.5],
                    color: 0x1F8FA8, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "puddle", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.3, 0.8],
                    color: 0x5FC4D4, alpha: [0.4, 0], light: "world", maxParticles: 4
                },
                {
                    name: "drops", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.05, 0.16], spread: 20,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 17], size: [0.07, 0.02],
                    color: 0xEAFBFF, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crabhammer", 1, CrabhammerDefinition);
