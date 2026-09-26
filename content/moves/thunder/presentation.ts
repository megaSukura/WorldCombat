/**
 * 打雷 / thunder 的客户端表现。
 *
 * 一句话：施法者头顶攒起雷云，目标脚下亮起一圈预告环；雷落的一刻，一柱炽白雷光从天空贯到落点，
 * 贴地炸开电环，被劈到的目标身上蹦出麻痹火花。
 * 色相家族：电青偏白为主（electricity_white / glowingsparkle_cyan），highlight 用原色亮帧 impact_electric。
 * 拍子：起（charge 聚雷 / mark 落点预告）→ 击（strike 雷柱与地环）→ 收（impact 感电火花、miss 余电）。
 * 范围：mark 的预告环与 strike 的贴地电环都按 `data.scale`（落点半径 / 2.0）铺满，玩家看圈就知道站哪会被劈。
 * 运动：雷柱从空中贯下、地环向外扩、火花向外蹦散，miss 只在地面小范围闪一下，roof 的余电贴在遮蔽物上。
 * 数：`data.bursts`（命中人数换算的碎电数）决定落雷碎电与尘量，`data.intensity`（本击威力 / 100）抬高亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ThunderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 24, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [4, 9], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFFF27A, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "crackle", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 14, shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [4, 9], size: [0.2, 0.06],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        mark: {
            duration: 26,
            exit: { stop: 0, drain: 4 },
            emitters: [
                {
                    name: "target_ring", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 14, shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.14, 0.06], sizeMode: "sin",
                    color: 0xBEEBFF, alpha: [0.35, 0], light: "full", maxParticles: 40
                },
                {
                    name: "target_mark", bind: "point", offset: [0, 2.0, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 8, shape: { kind: "box", size: [0.12, 4, 0.12] },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xE8FBFF, alpha: [0.4, 0], light: "full", maxParticles: 50
                }
            ]
        },
        strike: {
            duration: 34,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "bolt_column", bind: "point", offset: [0, 4.5, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 130, shape: { kind: "box", size: [0.7, 9, 0.7] },
                    direction: "shape", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.24, 0.06], sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 420
                },
                {
                    name: "ground_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.5, 1.4],
                    color: 0xBFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 26
                },
                {
                    name: "flash", bind: "point", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [6, 12], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 70
                },
                {
                    name: "cinders", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "bursts", fallback: 20 } },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.55, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.28],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 16], size: [0.14, 0.04],
                    color: 0xCCF5FF, alpha: [0.8, 0], light: "full", maxParticles: 200
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xE8FBFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 50
                },
                {
                    name: "numb", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "sparks", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0xFFE066, alpha: [0.85, 0], light: "full", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.18, 0.05],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        roof: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "blocked", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 22 },
                    shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.04, 0.18],
                    lifetime: [6, 12], size: [0.18, 0.05],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.3, 0.1],
                    color: 0x8E9AA6, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thunder", 1, ThunderDefinition);
