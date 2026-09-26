/**
 * 分担痛楚 / painsplit 的客户端表现。
 *
 * 一句话：一条细红的痛线在两者之间牵起；谁的生命更高，就从谁身上抽出一股与实际失血相称的红光，沿真实方向送到被治疗者，
 * 在两端各落一圈落定光。部分抵抗时那股光更细，抽血被拒绝时痛线从中间断开、没有回流。
 * 色相家族：痛楚红橙（smallfadeorb / energyorb / xsboost）为主，近白高光（mediumring）落在得到治疗的一端。
 * 拍子：量（reach 细线与两端心跳）→ 抽（drain 失血方爆开、红光沿 data.direction 流向受治者）→ 落（settle 到达端脉冲）／断（refused 空断）／平（flat）。
 * 范围与位置：`reach` 沿 data.path 的施法者—目标顶点铺开；`drain` 绑在失血者的真实位置，用 `data.direction` 指向受治者，
 *   线的长度就是两者实际距离 `data.span`；`settle` 绑在受治者的真实位置。判定走到哪两个身体，画面就画在哪两个身体。
 * 数：`data.flow`（实际失血 / 双方较大上限 派生的流动粒子数）驱动失血爆点与流向密度，抽得越多越密；
 *   `data.arrive`（实际治疗量派生）驱动到达端的回填光；`data.scale` 按体型放大光点。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PainsplitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        reach: {
            duration: 22,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.08, 0.015],
                    color: 0xFF8A72, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "beatSelf", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xFF6B5A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "beatFoe", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xFF6B5A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        drain: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline", closed: false },
                    rate: 10, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.07, 0.015],
                    color: 0xE06450, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 50
                },
                {
                    name: "loss", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "flow", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [7, 13], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFF6B5A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "flow", bind: "point", orient: "direction", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    shape: { kind: "line", length: { data: "span", fallback: 4 } },
                    rate: { data: "flow", fallback: 14 },
                    direction: "shape", speed: [0.16, 0.4], spread: 12,
                    lifetime: [6, 12], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xFFB199, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 110
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "arrival", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "arrive", fallback: 8 }, at: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "sin",
                    color: 0xFFD9D0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "landing_ring", bind: "point", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "ring", radius: 0.55, arcDegrees: 360 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.3, 0.06],
                    color: 0xFFC9BC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        refused: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.012],
                    color: 0x8C5A52, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        flat: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "level", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xB9AFA0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8C5A52, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_painsplit", 1, PainsplitDefinition);
