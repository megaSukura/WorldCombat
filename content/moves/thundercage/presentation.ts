/**
 * 雷电囚笼 / thundercage 的客户端表现。
 *
 * 一句话：施法者身前先收束出一团噼啪的电丝，随后一道电矢飞向目标，命中处「哐」地立起一圈竖着的电弧栅栏，
 * 把目标围在中间；目标撞向栅栏时那一段电弧炸亮、把它弹回，笼内每隔一会儿也整圈劈一道电。
 * 色相家族：电黄（0xE8E24A）为主、近白（0xF8FFE0）做电芯高光、电青（0xBFF2FF）只在接触点上。
 * 拍子：起（charge 聚电）→ 掷（cast 电矢）→ 驻（enclose 立笼 / cage 电栅 / arc 越界 / zap 笼内电击）→ 收（release / shatter）；碰墙走 scatter。
 * 范围：enclose 与 cage 都是 `bind: "point"`、`fit: "none"`，用 `data.radius` 画电栅半径、`data.height` 封顶沿——画出来的圈就是栏杆的位置。
 * 运动：电栅沿局部 +Y 竖直竖起并自转，粒子在笼壁上下窜动；越界时 `link` 用 `data.path` 沿实际接触把那一根栅连到人；
 *   抗推突破时走 shatter，整圈电栅从突破面炸开散去，不再拖出远程连人线。
 * 数：`data.bars`（特攻派生）决定电栅根数与密度，`data.flow`（根数派生）决定笼壁电丝量，
 *   `data.count`（电击威力派生）决定电击那下的电花量，`data.intensity`（威力 / 18）抬高亮度，
 *   `data.push`（推回距离）驱动越界电弧的射程感，`data.scale`（半径 / 1.6）控制粒子尺寸。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ThundercageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 13,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "weave", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 24, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.1], spin: 16,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xE8E24A, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "core", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xF8FFE0, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        cast: {
            duration: 46,
            exit: { stop: 28, drain: 14 },
            emitters: [
                {
                    name: "bolt", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 40, shape: { kind: "sphere", radius: 0.17 },
                    direction: "velocity", speed: [0.02, 0.1], spread: 12, trail: { minDistance: 0.22 },
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xE8E24A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 150
                },
                {
                    name: "sparks", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 2, interval: 1, repeats: 14 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09], spread: 24,
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xF8FFE0, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        enclose: {
            duration: 28,
            exit: { stop: 13, drain: 16 },
            emitters: [
                {
                    name: "rise", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 30, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "up", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.24, 0.6],
                    color: 0xF8FFE0, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "bars", bind: "point", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "bars", fallback: 12 }, interval: 2, repeats: 3 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.6 }, length: 2.4 },
                    direction: "up", speed: [0.02, 0.1], spread: 8, spin: 20,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xE8E24A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 140
                }
            ]
        },
        cage: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "wall", bind: "point", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "flow", fallback: 28 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.6 }, length: 2.4, thickness: 1 },
                    direction: "up", speed: [0.01, 0.07], spread: 6, spin: 22,
                    lifetime: [8, 16], size: [0.11, 0.02],
                    color: 0xE8E24A, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 220
                },
                {
                    name: "base", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 8, shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [12, 20], size: [0.3, 0.6], sizeMode: "sin",
                    color: 0xBFF2FF, alpha: [0.4, 0], light: "full", maxParticles: 80
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.5, 0], height: 0.3, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 20, shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.6 }, length: 2.2 },
                    direction: "up", speed: [0.02, 0.09], spin: 10,
                    gravity: -0.004, drag: 0.95,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xF8FFE0, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 160
                },
                {
                    name: "top", bind: "point", offset: [0, { data: "height", fallback: 2.4 }, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 10, shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.22, 0.4], sizeMode: "sin",
                    color: 0xF8FFE0, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        arc: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "jolt", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.3], spread: 18,
                    lifetime: [5, 10], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 70
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xE8E24A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "link", bind: "path", fit: "none", offset: [0, 0, 0], shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 24, direction: "away", speed: [0.02, 0.1], spread: 8,
                    lifetime: [4, 8], size: [0.12, 0.02],
                    color: 0xF8FFE0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        zap: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "strike", bind: "target", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "count", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [5, 11], size: [0.14, 0.03],
                    color: 0xF8FFE0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 70
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.3, 0], height: 0.15, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 26 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.6 }, length: 2.2 },
                    direction: "up", speed: [0.03, 0.14], spin: 14,
                    gravity: -0.003, drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xBFF2FF, alpha: [0.5, 0], light: "full", maxParticles: 80
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 11], size: [0.07, 0.01],
                    color: 0x9AA84A, alpha: [0.4, 0], light: "full", maxParticles: 30
                }
            ]
        },
        scatter: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "sparks", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [6, 11], size: [0.09, 0.01],
                    color: 0xE8E24A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        shatter: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 30 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.6 }, length: { data: "height", fallback: 2.4 }, thickness: 1 },
                    direction: "outward", speed: [0.1, 0.4], spin: 16,
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0xF8FFE0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "sparks", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xBFF2FF, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thundercage", 1, ThundercageDefinition);
