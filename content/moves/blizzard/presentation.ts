/**
 * 暴风雪 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：指定处先卷起一圈寒风，随后整片范围被翻涌的白风雪幕罩住，一阵阵地朝外扑打；被扑到的人身上炸开
 *   一撮厚霜，风雪停后地面留下一层积雪。
 * 色相家族：冰蓝 0xBFE9FF／0x8FD0EC 与近白 0xF2FAFF 为主；一个冷色相。
 * 层次：聚风（gather）→ 风雪幕（storm）→ 扑击（impact）→ 积雪（settle）。
 * 范围：storm 的每一层都用 `data.radius` 撑开——画面里那团风雪的大小就是判定圈的大小，半径随机制变。
 * 运动：外圈风雪沿圈快速回旋并贴地朝外涌，内层雪粒被风裹着上下翻飞、缓慢外移；扑击时霜团向外炸开、下沉。
 * 数：`data.rate`（每阵威力与阵数派生）决定风雪幕的密度与吞吐，`data.impactCount`（每阵威力派生）决定扑击
 *   霜团数，`data.rakes`／`data.interval` 决定脉冲节奏，`data.progress` 让画面读出这场风雪还剩多少。
 * 遮挡是目的：这一片白毛风本来就该挡住视线，密度按机制给足。
 * 参照节：视觉语言第二、三、四、五、六、七、九节。
 */
const BlizzardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "cold_wind", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 48, shape: { kind: "ring", radius: { data: "radius", fallback: 4.2 }, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.06, 0.2], spin: 40,
                    lifetime: [10, 18], size: [0.5, 0.1], sizeMode: "index",
                    color: 0xBFE9FF, alpha: [0.4, 0], light: "world", maxParticles: 120
                },
                {
                    name: "snow_gather", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 30, shape: { kind: "sphere", radius: { data: "radius", fallback: 4.2 } },
                    direction: "inward", speed: [0.02, 0.1], gravity: 0.01,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xEAF6FF, alpha: [0.5, 0], light: "world", maxParticles: 140
                }
            ]
        },
        storm: {
            duration: { data: "stormTicks", fallback: 70 },
            exit: { stop: 400, drain: 24 },
            emitters: [
                {
                    name: "whiteout", bind: "point", offset: [0, 1.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    rate: { data: "rate", fallback: 120 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 4.2 }, length: 3.2, thickness: 0.35 },
                    direction: "outward", speed: [0.04, 0.18], gravity: -0.004, drag: 0.94, spin: 30,
                    lifetime: [14, 26], size: [0.6, 0.14], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.32, 0], light: "world", maxParticles: 420
                },
                {
                    name: "vortex", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "rate", fallback: 120 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4.2 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.26], spin: 60, drag: 0.94,
                    lifetime: [10, 18], size: [0.5, 0.1], sizeMode: "index",
                    color: 0xBFE9FF, alpha: [0.4, 0], light: "world", maxParticles: 360
                },
                {
                    name: "snow", bind: "point", offset: [0, 1.0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "rate", fallback: 120 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 4.2 }, length: 3.6 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.006, drag: 0.95,
                    lifetime: [12, 22], size: [0.18, 0.03],
                    color: 0xEAF6FF, alpha: [0.55, 0], light: "world", maxParticles: 400
                },
                {
                    name: "frost_glint", bind: "point", offset: [0, 1.0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "rate", fallback: 120 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 4.2 }, length: 4 },
                    direction: "outward", speed: [0.1, 0.3], spin: 40,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0x8FD0EC, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 320
                }
            ]
        },
        impact: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "snow_burst", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "impactCount", fallback: 22 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 50
                },
                {
                    name: "gust_ring", bind: "target", offset: [0, 0.08, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.24, 0.02],
                    color: 0x8FD0EC, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        settle: {
            duration: 34,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "snow_floor", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 90, shape: { kind: "circle", radius: { data: "radius", fallback: 4.2 }, thickness: 0 },
                    direction: "up", speed: [0.0, 0.04], gravity: 0.006, drag: 0.95,
                    lifetime: [14, 24], size: [0.14, 0.02],
                    color: 0xCFEAF8, alpha: [0.4, 0], light: "world", maxParticles: 180
                },
                {
                    name: "calm", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "ring", radius: { data: "radius", fallback: 4.2 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], spin: 20,
                    lifetime: [14, 24], size: [0.4, 0.08], sizeMode: "index",
                    color: 0xBFE9FF, alpha: [0.22, 0], light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_blizzard", 1, BlizzardDefinition);
