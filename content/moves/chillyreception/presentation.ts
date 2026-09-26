/**
 * 冷笑话 / chillyreception 的客户端表现。
 *
 * 一句话：施法者头顶先浮起几缕悬着的话音与问号 → 话音落下，一圈尴尬的冷场从脚下推开、身边被真正打断的
 * 敌人头上冒出问号、身上结起霜，雪花静静落下来 → 施法者在实际退场点化开、留下一撮白气。
 * 色相家族：冷灰蓝 0x9AA8B8 画「尴尬与安静」，冰白 0xEAF6FF／0xF2FAFF 画雪与霜；白是中性色，只算一个色相加上中性。
 * 起击收：起 windup 26t（先静止一拍、后化雪）／击 burst 44t ／持 field 绑在雪区效果上 ／击 silence 24t ／击 bow 26t。
 * 持续状态：field 是稀疏缓慢的落雪加一层贴地薄雾，密度低、让出视线；一圈冷灰环画出「站哪里会被冷场罩住」。
 * 机制驱动：冷场半径决定问号、冷场环与雾的大小（data.scale = 半径/7），雪花数量直接读本招算出的 snowDensity，
 *   burst 的强度读被真正打断的敌人数（data.hushed）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup  悬停话音 thought_trail_small 静止一拍     0.06-0.01 14-22 0.5→0 ≤80
 * windup  问号     question            头顶浮动     0.2-0.1  12-22 0.6→0 ≤20
 * windup  化雪     powdered_snow       先静后散     0.2-0.06  10-18 0.5→0 ≤40
 * burst   冷场环   mediumring          贴地外扩     2.4-0.5  22-36 0.5→0 ≤40
 * burst   白气     tinydust            贴地外涌     0.06-0.02 14-26 0.4→0 ≤160
 * field   雪花     icy_snow            缓慢下落     0.1-0.02 18-34 0.45→0 ≤200
 * field   冷场环   largering           贴地脉冲     0.4-0.8  26-44 0.22→0 ≤34
 * silence 问号     question            头顶浮动＋下压 0.24-0.08 14-26 0.75→0 ≤40
 * silence 结霜     icy_snow            向内收束     0.12-0.03 12-22 0.7→0 ≤40
 * bow     化开     powdered_snow       向外散开     0.3-0.1  14-26 0.6→0 ≤80
 */
const ChillyReceptionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                { name: "bubble", bind: "source", offset: [0, 1.9, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: 10, at: 1, interval: 6, repeats: 2 },
                    shape: { kind: "point" }, direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 22], size: [0.06, 0.01],
                    color: 0x9AA8B8, alpha: [0.5, 0], light: "world", maxParticles: 80 },
                { name: "prompt", bind: "source", offset: [0, 2.0, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: { data: "punchline", fallback: 0 }, at: 1 },
                    shape: { kind: "point" }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.2, 0.1], sizeMode: "index",
                    color: 0x9AA8B8, alpha: [0.6, 0], light: "full", maxParticles: 20 },
                { name: "melt", bind: "source", offset: [0, 1.6, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 18, at: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.004, drag: 0.96,
                    lifetime: [10, 18], size: [0.2, 0.06], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.5, 0], light: "world", maxParticles: 40 }
            ]
        },
        burst: {
            duration: 44,
            exit: { stop: 24, drain: 28 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 28, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.18, 0.3],
                    lifetime: [22, 36], size: [2.4, 0.5],
                    color: 0x9AA8B8, alpha: [0.5, 0], light: "world", maxParticles: 40 },
                { name: "breath", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40, interval: 3, repeats: 8 }, shape: { kind: "circle", radius: { data: "radius", fallback: 7 } },
                    direction: "outward", speed: [0.04, 0.16], gravity: -0.002, drag: 0.96,
                    lifetime: [14, 26], size: [0.06, 0.02],
                    color: 0xEAF6FF, alpha: [0.4, 0], light: "world", maxParticles: 160 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "flakes", bind: "point", offset: [0, 2.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 8 }, length: 4 },
                    direction: "down", speed: [0.02, 0.1], gravity: 0.001, drag: 0.99,
                    lifetime: [18, 34], size: [0.1, 0.02],
                    color: 0xF2FAFF, alpha: [0.45, 0], light: "world", maxParticles: 200 },
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 5, shape: { kind: "ring", radius: { data: "radius", fallback: 8 } },
                    direction: "up", speed: [0.003, 0.01],
                    lifetime: [26, 44], size: [0.4, 0.8], sizeMode: "sin",
                    color: 0x9AA8B8, alpha: [0.22, 0], alphaMode: "sin", light: "world", maxParticles: 34 }
            ]
        },
        silence: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "blank", bind: "target", offset: [0, 1.4, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: 4, interval: 4, repeats: 5 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 26], size: [0.24, 0.08], sizeMode: "index",
                    color: 0x9AA8B8, alpha: [0.75, 0], light: "full", maxParticles: 40 },
                { name: "frost", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0xEAF6FF, alpha: [0.7, 0], light: "full", maxParticles: 40 }
            ]
        },
        bow: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                { name: "vanish", bind: "point", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 30 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.006, drag: 0.94,
                    lifetime: [14, 26], size: [0.3, 0.1], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.6, 0], light: "world", maxParticles: 80 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_chillyreception", 1, ChillyReceptionDefinition);
