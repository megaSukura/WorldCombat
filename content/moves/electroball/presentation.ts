/**
 * 电球 / electroball 的客户端表现。
 *
 * 一句话：一颗电团在手心被电火花一层层裹大、越充越亮，然后笔直飞出去、身后拖一串电弧，撞上目标整颗炸开一圈电花。
 * 色相家族：亮黄与近白（electricity_yellow 0xFFE14D／electricity_white／impact_electric），电蓝只做极少量点缀（0x9FE8FF）。
 * 拍子：起（charge 聚电）→ 飞（flight 电团掠出）→ 击（burst 炸电）／空（fade 散电）。
 * 范围：这一招只作用在电团飞过的一条直线上；flight 各层绑 `projectile` 锚点沿弹道铺开，画面即那条弹道。
 * 运动：charge 的电花向里收成一颗球；flight 的核沿 projectile 高速直行、电弧留在身后（trail）；burst 向外炸。
 * 数：`data.sparks`（特攻与载荷派生）决定电花与电弧量，`data.scale`（速度差载荷派生）决定电团体积，
 *   `data.intensity`（威力派生）抬高命中亮度——发射用预计目标载荷，burst 用命中时的实际载荷。
 *   flight 是没有固定寿命的持续段（duration 0），由动作在命中、撞方块或飞满射程时 stop/finish。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ElectroballDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.9, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 16, shape: { kind: "sphere", radius: 0.42 }, direction: "inward", speed: [0.03, 0.16], spin: 12,
                    lifetime: [5, 11], size: { data: "scale", fallback: 1 },
                    color: 0xFFE14D, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "core", bind: "source", offset: [0, 0.9, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    lifetime: [6, 12], size: { data: "scale", fallback: 1 },
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 24
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "orb", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 30, shape: { kind: "sphere", radius: 0.16 }, direction: "velocity", speed: [0.02, 0.1], spin: 16,
                    lifetime: [5, 10], size: { data: "scale", fallback: 1 },
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "arcs", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 26, shape: { kind: "sphere", radius: 0.12 }, direction: "velocity", speed: [0.02, 0.14], spin: 20,
                    lifetime: [4, 9], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "wake", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    trail: { minDistance: 0.18 },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "sparks", fallback: 12 }, shape: { kind: "sphere", radius: 0.1 }, direction: "outward", speed: [0.01, 0.06],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9FE8FF, alpha: [0.5, 0], light: "full", maxParticles: 80
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "blast", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.08, 0.32], spread: 22,
                    lifetime: [6, 12], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "spray", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.4 }, direction: "outward", speed: [0.1, 0.4], spread: 28,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 80
                }
            ]
        },
        fade: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.03, 0.12], spread: 20,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xFFF6C8, alpha: [0.4, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_electroball", 1, ElectroballDefinition);
