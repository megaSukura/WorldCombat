/**
 * 真气拳 / focuspunch 的客户端表现。
 *
 * 一句话：施法者低身收势，四周的气一点点收进拳里、越聚越亮（收得越久越多）→ 收满的一刻拳面炸开一圈光，
 * 身体一步踏出、把攒了整段时间的力道砸在目标身上；收势被打断时，气从拳上散成一缕灰烟。
 * 色相家族：暖橙（0xE6A23C）与近白金（0xFFE8B0）；饱和只出现在拳面的强调层。
 * 拍子：起 brace（长收势，duration 由机制 `windup` 给出）→ 放 release（收满）→ 击 strike（命中）／散 broken（被打断）／空 whiff（踏空）。
 * 范围：strike 的爆环半径用 `data.scale`（判定半径 / 0.5）给出，玩家看出这一拳能咬住多大的圈。
 * 运动：brace 的气由外向内收、越收越快；release 从拳面向外一顶；strike 的碎片由内向外炸。
 * 数：`data.gather`（物攻与等级派生的聚气速率）决定收势粒子速率，`data.count`（拳力派生）决定命中碎片数，
 *   `data.power` 抬高亮度；画面里的数量与机制里的数一致。
 */
const FocuspunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 38 },
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "intake", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { curve: [[0, 4], [0.35, { data: "gather", fallback: 12 }], [1, { data: "gather", fallback: 12 }]] },
                    shape: { kind: "sphere", radius: 0.9 },
                    direction: "inward", speed: [0.03, 0.16], spread: 20,
                    lifetime: [8, 15], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xE6A23C, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.6, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 6, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0xFFE8B0, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "footing", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.07], spread: 10,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC08A5A, alpha: [0.45, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 40
                }
            ]
        },
        release: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 4 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [6, 10], size: [0.42, 0.08], sizeMode: "index",
                    color: 0xFFF4D0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 12
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [8, 12], size: [0.36, 0.14],
                    color: 0xE6A23C, alpha: [0.7, 0], light: "full"
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xF2A44C, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "count", fallback: 22 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.14, 0.42], spread: 26,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFF0C0, alpha: [0.95, 0], light: "full", maxParticles: 160
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [10, 15], size: [0.42, 0.16],
                    color: 0xC87A2E, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        broken: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "scatter", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [9, 15], size: [0.2, 0.06],
                    color: 0x8A8578, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "leak", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xE6D8B0, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dust", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xA89070, alpha: [0.5, 0], gravity: 0.03, light: "world", maxParticles: 34
                },
                {
                    name: "streak", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 5 },
                    shape: { kind: "line", length: 0.6 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xC8B8A0, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_focuspunch", 1, FocuspunchDefinition);
