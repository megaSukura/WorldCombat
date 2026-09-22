/**
 * 浸水 / soak 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手里聚起一汪水，几道水柱沿视线冲到对手身上把它浇透，脚下炸开一圈水花、荡出几圈水纹，
 *   地面留下一小块发亮的湿泥；水干了，从它身上滴下水珠。
 *
 * 色相家族：水蓝（0x4FA8E8 主体／0x5AA8E8 水流）与浅青（0xA8D8F0 雾）撑起全部层次，近白只给水花核心。
 * 层次：聚（起手，水汽在手里内收）→ 浇（水柱沿视线冲、柱身下灌＋雾）→ 落（水花炸开、水纹荡开、雾点下沉）
 *   → 干／落空。
 * 起击收：gather（聚）→ pour（浇）→ splash（落）→ dry（干）。
 * 范围：splash 的水花与水纹半径直接绑 `data.splash`（实际漫流半径），画出的那圈就是判定圈；湿泥铺在同一块地面。
 * 运动：水柱沿 source→target 的 polyline 冲过去，落点处柱身向下灌、水花向外炸开后受重力下沉，水纹贴地扩散。
 * 数：水流条数读 `data.streaks`（特攻派生）、水花圈数读 `data.ripples`（速度派生），水柱与雾的尺寸随 `data.scale`。
 */
const SoakDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "pool", bind: "source", offset: [0, 0.25, 0.3], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 15, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [9, 15], size: [0.1, 0.02], spin: 8,
                    color: 0x5AA8E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "glow", bind: "source", offset: [0, 0.25, 0.3], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xC8E8FF, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        pour: {
            duration: 40,
            exit: { stop: 22, drain: 18 },
            emitters: [
                {
                    name: "flow", bind: "path", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    shape: { kind: "polyline" },
                    rate: { data: "streaks", fallback: 12 }, direction: "shape", speed: [0.08, 0.22], spread: 14,
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x5AA8E8, alpha: [0.9, 0], light: "full", maxParticles: 110
                },
                {
                    name: "column", bind: "point", offset: [0, 1.8, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet_head",
                    rate: 18, shape: { kind: "cylinder", radius: 0.38, length: 3.4 },
                    direction: "down", speed: [0.1, 0.3], gravity: 0.03,
                    lifetime: [8, 14], size: [0.3, 0.08],
                    color: 0x4FA8E8, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "haze", bind: "point", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.24, 0.06],
                    color: 0xA8D8F0, alpha: [0.32, 0], light: "world", maxParticles: 26
                }
            ]
        },
        splash: {
            duration: 30,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "ripples", fallback: 8 } },
                    shape: { kind: "sphere", radius: { data: "splash", fallback: 1.6 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 40, gravity: 0.03,
                    lifetime: [10, 20], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x4FA8E8, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "splash", fallback: 1.6 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.3, 0.9], sizeMode: "index",
                    color: 0xC8E8FF, alpha: [0.55, 0], light: "full", maxParticles: 8
                },
                {
                    name: "mist", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "streaks", fallback: 12 } },
                    shape: { kind: "sphere", radius: { data: "splash", fallback: 1.6 } },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.006, drag: 0.92,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xC8E8FF, alpha: [0.5, 0], light: "full", maxParticles: 80
                }
            ]
        },
        dry: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "drip", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02,
                    lifetime: [14, 22], size: [0.12, 0.02],
                    color: 0x8FC8E8, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9, gravity: 0.01,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x9FC0D8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_soak", 1, SoakDefinition);
