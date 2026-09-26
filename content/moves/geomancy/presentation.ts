/**
 * 大地掌控 / geomancy 的客户端表现。
 *
 * 一句话：脚下地纹张开、由暗转亮 → 立定蓄力、光点沿纹路越聚越密（进度就是实际吸取时间）→ 地纹炸开、
 *   三股能量沿柱反冲入身；被睡冻或窗口提前清除时地纹熄灭、能量散掉；爆发后地纹余光按本身寿命退去。
 * 色相家族：地脉绿 0x8FD46A 为主体，能量金 0xFFE9A0 落在强调层，暗绿 0x4E7A3A 作余韵，
 *   特防白 0xF7F3C2 作三股能量里的第三色。
 * 拍子：起（gather 0–14t）→ 张（plant 0–30t）→ 汲（channel 跑满 data.absorb）→ 爆（release 0–40t）
 *   → 余（residue 0–data.linger）／崩（collapse 0–26t）。
 * 范围：地纹环绑脚点、fit none，半径按 `data.scale`（实际阵心半径 / 2.4）推出——画面里的环就是阵真正罩到的范围。
 * 进度：channel 的 moment 时长绑 `data.absorb`；rate 曲线随 moment 进度由疏到密、颜色由暗绿经地脉绿到能量金，
 *   所以画面越亮、光点越多，就代表吸取越接近满。
 * 运动：plant 地纹向外张、尘土上腾；channel 光点沿地纹向上升（速度按 `data.rise`）；release 金环向外一推、
 *   三股能量沿柱向身体收束；collapse 光点四散坠落变暗；residue 余光原地明灭退去。
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
            duration: { data: "absorb", fallback: 30 },
            exit: { drain: 12 },
            emitters: [
                {
                    name: "rune", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: { curve: [[0, 2], [0.5, 9], [1, 17]] },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.28, 0.04], sizeMode: "index",
                    color: { gradient: [[0, 0x4E7A3A], [0.55, 0x8FD46A], [1, 0xFFE9A0]] },
                    alpha: [0.55, 0], light: "full", maxParticles: 80
                },
                {
                    name: "rise", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { curve: [[0, 3], [0.5, 12], [1, 26]] },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.03, { data: "rise", fallback: 0.06 }],
                    lifetime: [14, 24], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8FD46A, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 110
                },
                {
                    name: "glow_dust", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { curve: [[0, 2], [1, 10]] },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 26], size: [0.05, 0.01],
                    color: 0xFFE9A0, alpha: [0.5, 0], light: "full", maxParticles: 60
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
                    name: "strand_spa", bind: "source", offset: [-0.42, 0, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "runes", fallback: 20 }, at: 1, repeats: 4, interval: 4 },
                    shape: { kind: "cylinder", radius: 0.5, length: 1.8, thickness: 1 }, direction: "inward",
                    speed: [0.12, 0.3],
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "index",
                    color: 0xFFE9A0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "strand_spd", bind: "source", offset: [0.4, 0, 0.32], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "runes", fallback: 20 }, at: 1, repeats: 4, interval: 4 },
                    shape: { kind: "cylinder", radius: 0.5, length: 1.8, thickness: 1 }, direction: "inward",
                    speed: [0.12, 0.3],
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x8FD46A, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "strand_spe", bind: "source", offset: [-0.2, 0, -0.42], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "runes", fallback: 20 }, at: 1, repeats: 4, interval: 4 },
                    shape: { kind: "cylinder", radius: 0.5, length: 1.8, thickness: 1 }, direction: "inward",
                    speed: [0.12, 0.3],
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "index",
                    color: 0xF7F3C2, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
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
        residue: {
            duration: { data: "linger", fallback: 40 },
            exit: { drain: 14 },
            emitters: [
                {
                    name: "glow", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: { curve: [[0, 8], [1, 1]] },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x8FD46A, alpha: [0.4, 0], light: "world", maxParticles: 46
                },
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { curve: [[0, 6], [1, 1]] },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xFFE9A0, alpha: [0.45, 0], light: "full", maxParticles: 34
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
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.05,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x4E7A3A, alpha: [0.5, 0], light: "world", maxParticles: 34
                },
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.32, 0.08],
                    color: 0x4E7A3A, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_geomancy", 1, GeomancyDefinition);
