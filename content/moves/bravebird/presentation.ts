/**
 * 勇鸟猛攻 / bravebird 的客户端表现。
 *
 * 一句话：收翅屈腿弹起一小段，再从最高点沿一条斜线钉出去，翅膀切开空气拉出一条风线，撞上目标的一刻风羽
 * 在接触面炸开，最后在落点砸下一圈尘环。
 * 色相家族：天空蓝白（0xCFE6F7 / 0xF2F7FC）为主，风线是最亮的近白，青蓝只给冲击核心一点。
 * 拍子：起 fold（收翅）→ 腾 climb（弹起）→ 冲 dive（斜线）→ 击 impact（风羽炸开）→ 收 land（落地尘环）。
 * 范围：dive 的风线绑施法者、随它扫过整条俯冲线；impact 绑命中点，画的就是被穿过的那一下。
 * 运动：风羽从身体向外后方掠；俯冲时速度线沿运动方向拉长；落地尘环贴地向外扩。
 * 数：`data.feathers`（速度与物攻派生）决定风羽与命中的总量，`data.intensity`（威力 / 115）抬高密度与亮度，
 * `data.scale`（判定半径 / 0.6）放大身架与风线宽度，`data.high`（高掠式）抬高弹起表现的高度。
 */
const BravebirdDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fold: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "tuck", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [8, 14], size: [0.16, 0.05],
                    color: 0xCFE6F7, alpha: [0.5, 0], light: "full", maxParticles: 44
                },
                {
                    name: "crouch", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.38 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xD8E4EC, alpha: [0.4, 0], gravity: 0.03, drag: 0.93, light: "world", maxParticles: 34
                }
            ]
        },
        climb: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "updraft", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 22, shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0xEAF4FC, alpha: [0.55, 0], light: "full", maxParticles: 90
                },
                {
                    name: "plume", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    orient: "velocity",
                    rate: 14, shape: { kind: "line", length: { data: "height", fallback: 0.6 } },
                    direction: "shape", speed: [0.1, 0.28],
                    lifetime: [6, 10], size: [0.16, 0.04],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        dive: {
            duration: 48,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "streak", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    orient: "direction",
                    rate: 44, shape: { kind: "line", length: 0.5 },
                    direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.2 },
                    lifetime: [5, 9], size: [0.24, 0.06],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 260
                },
                {
                    name: "feather_stream", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "feathers", fallback: 26 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "away", speed: [0.06, 0.2], spin: 6,
                    lifetime: [7, 13], size: [0.16, 0.04],
                    color: 0xCFE6F7, alpha: [0.55, 0], light: "world", maxParticles: 180
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "feathers", fallback: 26 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.07, 0.28], spread: 16,
                    lifetime: [7, 13], size: [0.44, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 100
                },
                {
                    name: "gust", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "feathers", fallback: 26 } },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.3],
                    gravity: 0.02, drag: 0.9, spin: 8,
                    lifetime: [10, 18], size: [0.18, 0.04],
                    color: 0xCFE6F7, alpha: [0.6, 0], light: "world", maxParticles: 160
                }
            ]
        },
        land: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "touchdown", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24], spread: 8,
                    lifetime: [10, 17], size: [0.36, 0.08],
                    color: 0xD8E4EC, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "settle", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "feathers", fallback: 26 } },
                    shape: { kind: "hemisphere", radius: 0.44, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [9, 16], size: [0.06, 0.02],
                    color: 0xD8E4EC, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bravebird", 1, BravebirdDefinition);
