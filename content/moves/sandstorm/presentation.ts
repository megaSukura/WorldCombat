/**
 * 沙暴 / sandstorm 的客户端表现。
 *
 * 一句话：施法者脚下一圈回旋的沙先立起来 → 沙幕在落点炸开、一条顺风的沙带朝下风推去 →
 * 幕里一条条顺风窄带扫过，带内没掩体的人身上拉出一道同向沙线被磨白，岩石之躯嵌起暖褐的光，
 * 躲到掩体背风面的人只看到稀薄飞沙擦过。
 * 色相家族：土黄 0xD8B26A 作主体、深褐 0xB08A4A 作边缘、近白 0xF4E4C0 只给高光；不引入第二个色相。
 * 起击收：起 windup 24t ／击 burst 48t ／持 field 绑在沙幕效果上 ／击 gust 随磨蚀间隔 ／击 scour 20t ／击 harden 20t ／击 lee 18t。
 * 持续状态：field 贴地、低 alpha 的顺风飞沙加一层薄尘幕；沙幕本来就该挡住视线，密度按机制给足，
 * 地面一圈沙环始终把「站哪里会被磨到」画出来。
 * 机制驱动：沙幕半径决定飞沙与沙环的大小（data.scale = 半径/9），飞沙数量直接读本招算出的 grainDensity，
 * 条带宽窄与推进读 gustWidth/gustStep（data.width / data.band），每趟磨蚀的沙砾数量由这一趟实际伤害派生（data.grains）；
 * `orient:"direction"` 与 `direction:"shape"` 让所有顺风层真的沿服务端定格的风向流动。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 回沙 swirlingwind     沿环内收＋上旋 0.5-0.1 12-20 0.55→0 ≤120
 * burst  沙环 largering        贴地外扩       3.0-0.6 20-34 0.6→0  ≤40
 * burst  前沿 swirlingwind     顺风推进       0.5-0.12 12-24 0.6→0 ≤400
 * burst  沙尘 tinydust         向上翻涌      0.14-0.03 14-26 0.55→0 ≤360
 * field  飞沙 tinydust         顺风掠过      0.12-0.03 10-20 0.5→0  ≤500
 * field  尘幕 smoke            缓慢外涌      0.5-0.2  16-30 0.28→0 ≤300
 * field  沙环 largering        贴地脉冲      0.5-0.9  24-40 0.25→0 ≤40
 * gust   条带 swirlingwind     顺风窄带推进  0.5-0.12 12-24 0.6→0 ≤420
 * gust   快沙 tinydust         顺风掠过      0.12-0.03 8-16 0.5→0  ≤260
 * scour  沙砾 earth            向外炸开      0.2-0.05  8-16 0.85→0 ≤40
 * scour  沙线 tinydust         顺风拉线      0.14-0.03 8-14 0.7→0  ≤30
 * harden 暖光 xsboost          球面外散      0.14-0.03 10-20 0.9→0 ≤70
 * grit   甩沙 tinydust         顺风擦过      0.1-0.02  10-18 0.4→0  ≤40
 * lee    掩体沙 tinydust       顺风擦过      0.1-0.02  12-22 0.3→0  ≤40
 */
const SandstormDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "rate", fallback: 26 }, shape: { kind: "ring", radius: 1.0, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.04, 0.16], spin: 45,
                    lifetime: [12, 20], size: [0.5, 0.1], sizeMode: "index",
                    color: 0xD8B26A, alpha: [0.55, 0], light: "world", maxParticles: 120 }
            ]
        },
        burst: {
            duration: 48,
            exit: { stop: 26, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 32, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.24, 0.4],
                    lifetime: [20, 34], size: [3.0, 0.6],
                    color: 0xD8B26A, alpha: [0.6, 0], light: "world", maxParticles: 40 },
                { name: "front", bind: "point", offset: [0, 0.7, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "density", fallback: 30 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: { data: "width", fallback: 2.6 } },
                    orient: "direction", direction: "shape", speed: [0.18, 0.44], spin: 40, drag: 0.97,
                    lifetime: [12, 24], size: [0.5, 0.12], sizeMode: "index",
                    color: 0xD8B26A, alpha: [0.6, 0], light: "world", maxParticles: 400 },
                { name: "dust", bind: "point", offset: [0, 1.0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "density", fallback: 30 }, interval: 3, repeats: 12 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: 3 },
                    direction: "outward", speed: [0.06, 0.22], gravity: -0.004, drag: 0.97,
                    lifetime: [14, 26], size: [0.14, 0.03],
                    color: 0xF4E4C0, alpha: [0.55, 0], light: "world", maxParticles: 360 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "streaks", bind: "point", offset: [0, 0.6, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "density", fallback: 30 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: 2.6 },
                    orient: "direction", direction: "shape", speed: [0.16, 0.46], drag: 0.98, spin: 30,
                    lifetime: [10, 20], size: [0.12, 0.03],
                    color: 0xD8B26A, alpha: [0.5, 0], light: "world", maxParticles: 500 },
                { name: "haze", bind: "point", offset: [0, 0.35, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 26, shape: { kind: "circle", radius: { data: "radius", fallback: 9 } },
                    direction: "outward", speed: [0.02, 0.1], gravity: -0.002, drag: 0.95,
                    lifetime: [16, 30], size: [0.5, 0.2], sizeMode: "index",
                    color: 0xC8A860, alpha: [0.28, 0], light: "world", maxParticles: 300 },
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 6, shape: { kind: "ring", radius: { data: "radius", fallback: 9 } },
                    direction: "up", speed: [0.004, 0.012],
                    lifetime: [24, 40], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0xF4E4C0, alpha: [0.25, 0], alphaMode: "sin", light: "world", maxParticles: 40 }
            ]
        },
        gust: {
            duration: 44,
            exit: { stop: 18, drain: 26 },
            emitters: [
                { name: "band", bind: "point", offset: [0, 0.7, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "density", fallback: 30 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: { data: "width", fallback: 2.6 } },
                    orient: "direction", direction: "shape", speed: [0.2, 0.48], spin: 40, drag: 0.97,
                    lifetime: [12, 24], size: [0.5, 0.12], sizeMode: "index",
                    color: 0xD8B26A, alpha: [0.6, 0], light: "world", maxParticles: 420 },
                { name: "grit", bind: "point", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "density", fallback: 30 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: { data: "width", fallback: 2.6 } },
                    orient: "direction", direction: "shape", speed: [0.22, 0.5], drag: 0.98,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xF4E4C0, alpha: [0.5, 0], light: "world", maxParticles: 260 }
            ]
        },
        scour: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                { name: "grit", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "grains", fallback: 12 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.02, spin: 60,
                    lifetime: [8, 16], size: [0.2, 0.05],
                    color: 0xD8B26A, alpha: [0.85, 0], light: "world", maxParticles: 40 },
                { name: "line", bind: "target", offset: [0, 0.5, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 1 }, shape: { kind: "line", length: 1.6 },
                    orient: "direction", direction: "shape", speed: { data: "drift", fallback: 0.18 }, drag: 0.99,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xF4E4C0, alpha: [0.7, 0], light: "world", maxParticles: 30 }
            ]
        },
        harden: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                { name: "embed", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0xE8C46A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70 }
            ]
        },
        grit: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                { name: "shrug", bind: "target", offset: [0, 0.6, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, interval: 3, repeats: 3 },
                    shape: { kind: "cylinder", radius: 0.6, length: 1.2 },
                    orient: "direction", direction: "shape", speed: [0.12, 0.3], drag: 0.98,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xF4E4C0, alpha: [0.4, 0], light: "world", maxParticles: 40 }
            ]
        },
        lee: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "slip", bind: "target", offset: [0, 0.6, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "density", fallback: 6 }, interval: 3, repeats: 4 },
                    shape: { kind: "cylinder", radius: 0.7, length: 1.4 },
                    orient: "direction", direction: "shape", speed: [0.14, 0.34], drag: 0.98,
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xC8A860, alpha: [0.3, 0], light: "world", maxParticles: 40 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sandstorm", 1, SandstormDefinition);
