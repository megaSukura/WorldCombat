/**
 * 龙卷风 / twister 的客户端表现。
 *
 * 一句话：在选定地点立起一道向上的青色旋涡，贴地一圈风环随半径铺开，圈里的尘屑与叶片被卷着上升打转，
 * 每隔一小段整圈炸开一记龙属风刃；被卷懵的人头上晃星；到点后旋涡收束散去。
 * 色相家族：龙青（0x7FE6D0）与近白（0xDFFFF6）为主，叶绿只在被卷起的杂物上出现。
 * 拍子：起（windup 旋身聚风）→ 击（rise 升起、vortex 持续、strike 逐段风刃）→ 收（fade 收束）。
 * 范围：vortex 的基座圆环按 `data.radius` 画出旋涡真实半径，站在圈里才会被卷。
 * 运动：柱体沿 local +Y 上升并自转，尘屑与叶片向外甩后被风带起，龙属风刃整圈外扩。
 * 数：`data.flow`（半径派生）决定柱体密度，`data.marks`（命中人数派生）决定风刃碎光量，
 * `data.intensity`（风刃威力 / 16）抬高亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const TwisterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "swirl", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.09], spin: 8,
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0x7FE6D0, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "gather", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    gravity: -0.004, drag: 0.93,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xBFE8E0, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        rise: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "base", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.02, 0.12],
                    lifetime: [14, 24], size: [0.6, 1.1], sizeMode: "linear",
                    color: 0x8FE8DA, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "column", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 120 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.4 }, length: 3.4 },
                    direction: "up", speed: [0.04, 0.18], spread: 8, spin: 12,
                    gravity: -0.006, drag: 0.96,
                    lifetime: [10, 20], size: [0.24, 0.05],
                    color: 0x7FE6D0, alpha: [0.3, 0], light: "world", maxParticles: 380
                }
            ]
        },
        vortex: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "column", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 120 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.4 }, length: 3.6 },
                    direction: "up", speed: [0.05, 0.2], spread: 8, spin: 12,
                    gravity: -0.006, drag: 0.96,
                    lifetime: [10, 20], size: [0.24, 0.05],
                    color: 0x7FE6D0, alpha: [0.32, 0], light: "world", maxParticles: 420
                },
                {
                    name: "base", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 8, shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [12, 20], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x8FE8DA, alpha: [0.4, 0], light: "world", maxParticles: 80
                },
                {
                    name: "debris", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 120 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.4 }, length: 1.2 },
                    direction: "outward", speed: [0.04, 0.22], spread: 24,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x9A8A72, alpha: [0.5, 0], light: "world", maxParticles: 180
                },
                {
                    name: "leaves", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 26, shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.4 }, length: 1.4 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30, spin: 16,
                    gravity: 0.03, drag: 0.93,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0x8FBF6A, alpha: [0.6, 0], light: "world", maxParticles: 120
                },
                {
                    name: "motes", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 34, shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.4 }, length: 3.2 },
                    direction: "up", speed: [0.05, 0.18], spin: 8,
                    gravity: -0.004, drag: 0.95,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xCFFBF2, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 160
                }
            ]
        },
        strike: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slash", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "marks", fallback: 8 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 14,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xE0FFF8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "gust", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "marks", fallback: 8 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.04, 0.18], spread: 20, spin: 10,
                    lifetime: [8, 15], size: [0.2, 0.04],
                    color: 0x9FEFE2, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        flinch: {
            duration: 24,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "stagger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xDFFFF6, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        fade: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "subside", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 30, shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.4 }, length: 2.6 },
                    direction: "up", speed: [0.03, 0.12], spin: 6,
                    gravity: -0.004, drag: 0.95,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0x8FE8DA, alpha: [0.3, 0], light: "world", maxParticles: 140
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x9A8A72, alpha: [0.4, 0], light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_twister", 1, TwisterDefinition);
