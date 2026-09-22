/**
 * 终极冲击 / gigaimpact 的客户端表现。
 *
 * 一句话：施法者压低身体后整条直线撞出去，撞实的一刻在命中点炸开中性白灰的冲击波；撞完自己定在原地，
 * 身上冒起一圈低伏的灰白晕眩，标明「力竭」这段无法行动的时间。
 * 色相家族：冷白与银灰为主（impact_normal 原色亮帧、tinydust/earth 灰阶），只在撞击核心给一点点近白；
 * 与同族爆炸烈焰的橙红、流星突击的翠绿在色相上分开。
 * 拍子：起（windup 0–8t，压低聚势）→ 击（drive → impact）→ 收（exhaust 起、recharge 维持整段力竭）。
 * 范围：drive 的尘环贴施法者脚下，impact 的爆圈与碎屑绑命中点；recharge 的晕环贴施法者脚边，画的就是代价落在谁身上。
 * 运动：速度线随身体沿冲撞方向掠过，脚下草屑向后抛；命中后尘土沿顶开方向退去；力竭时晕环原地慢慢转。
 * 数：`data.scale`（判定半径 / 0.55）放大尘环、爆圈与粒子尺寸；`data.count`（本击威力派生的碎屑数）决定
 * impact / exhaust 的爆发数量；`data.seconds`（力竭秒数）决定晕眩维持的密度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const GigaimpactDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "crouch_dust", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [5, 11], size: [0.05, 0.02],
                    color: 0xB9B2AA, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "compress", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [6, 12], size: [0.1, 0.04], sizeMode: "sin",
                    color: 0xF2F6FF, alpha: [0.4, 0], light: "full", maxParticles: 18
                }
            ]
        },
        drive: {
            duration: 50,
            exit: { stop: 40, drain: 12 },
            emitters: [
                {
                    name: "dash_lines", bind: "source", offset: [0, 0.42, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 46, shape: { kind: "box", size: [0.34, 0.3, 0.34] },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.22 },
                    lifetime: [5, 9], size: [0.2, 0.06],
                    color: 0xEAF1FA, alpha: [0.72, 0], light: "full", maxParticles: 280
                },
                {
                    name: "kicked_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 30, shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.17],
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8F8779, alpha: [0.5, 0], light: "world", maxParticles: 220
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.05, 0.26],
                    lifetime: [7, 12], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "edge_ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 32, at: 1, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.38, 0.1],
                    color: 0xDCE4EE, alpha: [0.6, 0], light: "world"
                },
                {
                    name: "grit", bind: "target", height: 0.36,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 90 } },
                    shape: { kind: "sphere", radius: 0.56 },
                    direction: "outward", speed: [0.08, 0.36],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xCFC7BC, alpha: [0.7, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 200
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "stumble", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 18], size: [0.22, 0.06],
                    color: 0x6E6A64, alpha: [0.3, 0], light: "world", maxParticles: 70
                }
            ]
        },
        exhaust: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "settle_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "count", fallback: 24 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.32, 0.1],
                    color: 0xC9D2DC, alpha: [0.5, 0], light: "world"
                },
                {
                    name: "strain", bind: "source", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.04],
                    color: 0xAEB6C0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "dizzy_ring", bind: "source", offset: [0, 1.5, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 5, shape: { kind: "ring", radius: 0.24 },
                    direction: "shape", speed: [0.01, 0.03], spin: 8,
                    lifetime: [16, 26], size: [0.09, 0.02],
                    color: 0xCFD6DF, alpha: [0.4, 0], light: "full", maxParticles: 28
                },
                {
                    name: "ground_haze", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.02],
                    color: 0x9AA0A8, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gigaimpact", 1, GigaimpactDefinition);
