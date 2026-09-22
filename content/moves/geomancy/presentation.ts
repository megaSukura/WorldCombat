/**
 * 大地掌控 / geomancy 的客户端表现。
 *
 * 一句话：脚下地纹张开、苔绿的光点顺裂缝升起 → 立定蓄力、光点沿纹路越聚越密 → 地纹炸开、金色能量沿柱
 *   反冲回身体；被睡得／冻住时地纹熄灭、能量散掉。色相家族：地脉绿 0x8FD46A 为主体，能量金 0xFFE9A0
 *   落在强调层，暗绿 0x4E7A3A 作余韵。
 * 拍子：起（gather 0–14t）→ 张（plant 0–30t）→ 汲（channel 持续）→ 爆（release 0–40t）／崩（collapse 0–26t）。
 * 范围：地纹环绑脚点、fit none，半径按 `data.scale`（实际阵心半径 / 2.4）推出——画面里的环就是阵真正罩到的范围。
 * 运动：plant 地纹向外张、尘土上腾；channel 光点沿地纹向上升（速度按 `data.rise`）；release 金环向外一推、
 *   能量沿柱向身体反冲；collapse 光点原地沉落变暗。
 * 数：光点数量绑 `data.runes`（特攻与等级派生），威力强弱绑 `data.intensity`。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const GeomancyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "outline", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 8, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0x4E7A3A, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        plant: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "mark", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "runes", fallback: 20 }, at: 1 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [14, 24], size: [0.5, 1.1], sizeMode: "index",
                    color: 0x8FD46A, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "turf", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.03, 0.12],
                    gravity: 0.05, lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x4E7A3A, alpha: [0.5, 0], light: "world", maxParticles: 50
                },
                {
                    name: "sprout", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.2, 0.04],
                    color: 0xFFE9A0, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        channel: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "rise", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 26, shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.03, { data: "rise", fallback: 0.06 }],
                    lifetime: [14, 24], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8FD46A, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "glow_dust", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 26], size: [0.05, 0.01],
                    color: 0xFFE9A0, alpha: [0.5, 0], light: "full", maxParticles: 50
                }
            ]
        },
        release: {
            duration: 40,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "blast", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "runes", fallback: 20 }, at: 1 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [14, 24], size: [0.5, 1.2], sizeMode: "index",
                    color: 0xFFE9A0, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "column", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "runes", fallback: 20 } },
                    shape: { kind: "cylinder", radius: 0.4, length: 2.2 },
                    direction: "up", speed: [0.1, 0.32],
                    lifetime: [12, 22], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x8FD46A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "flare", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [8, 16], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xFFE9A0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 30
                }
            ]
        },
        collapse: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fizzle", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.01, 0.05],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x4E7A3A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dim", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 18], size: [0.3, 0.08],
                    color: 0x4E7A3A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_geomancy", 1, GeomancyDefinition);
