/**
 * 硬压 / hardpress 的客户端表现。
 *
 * 一句话：施法者抬臂，头顶聚起一层青灰的气压；一腕自上方砸下，落点炸开一圈钢色冲击，尘土与碎屑被压得向外翻，
 *   被压中的目标身上再炸开一团钝钢亮光。
 * 色相家族：钢青（0xB8C8D6）主体、近白（0xEAF2F8）强调、暗青（0x66788A）余韵；单一色相。
 * 拍子：起 brace（抬手聚气）→ 击 press（压柱落地）＋ impact（目标受击）→ 收（碎屑与浮尘散去）。
 * 范围：press 的落地环按 `data.scale`（压顶半径 / 0.7）铺开，画出的圈就是会被压到的那块地。
 * 运动：压柱沿竖直方向自上下落；碎屑沿球面外抛带重力；尘土缓慢上浮。
 * 数：`data.motes`（物攻与体重派生）决定压柱点与碎屑量，`data.intensity`（本击威力 / 90）抬高命中亮度，
 *   `data.sink` 只用于竖直柱的纵向铺开。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HardpressDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0, 0], height: 1.2, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12], drag: 0.9, spin: 12,
                    lifetime: [7, 14], size: [0.1, 0.02],
                    color: 0xEAF2F8, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "pressure", bind: "source", offset: [0, 0, 0], height: 1.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08], spin: 8,
                    lifetime: [8, 16], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xB8C8D6, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        press: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "column", bind: "point", fit: "none", offset: [0, 1.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 90, shape: { kind: "cylinder", radius: { data: "scale", fallback: 1 }, length: 2.4 },
                    direction: "down", speed: [0.18, 0.5],
                    lifetime: [3, 6], size: [0.26, 0.08],
                    color: 0xDCE8F2, alpha: [0.55, 0], light: "full", maxParticles: 220
                },
                {
                    name: "shock", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.45, 1.35],
                    color: 0xB8C8D6, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "debris", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.26], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.13, 0.03], sizeMode: "index",
                    color: 0x8A8578, alpha: [0.65, 0], light: "world", maxParticles: 160
                },
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xEAF2F8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xEAF2F8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "chips", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x8A8578, alpha: [0.7, 0], light: "world", maxParticles: 100
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "disperse", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.03, drag: 0.92,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0x8A8578, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hardpress", 1, HardpressDefinition);
