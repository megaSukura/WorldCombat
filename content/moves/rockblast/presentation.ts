/**
 * 岩石爆击 / rockblast 的客户端表现。
 *
 * 一句话：施法者脚下地面裂开、一撮石块浮起，随后一块接一块「咚、咚」地抛出去，沿一道低弧砸在目标身上，
 *   每次砸落都崩出一圈石屑；没砸中的石头落在地上，留下一撮碎石与尘。
 * 色相家族：石灰褐（large_rock／earth 原色，0xA98C6A 偏色）＋近白碎点（tinydust 原色）＋一点impact 亮边。
 * 拍子：起 charge（掀地聚石）→ 射 volley（一块接一块）→ 击 hit（石屑崩开）／ 地 ground（落地碎石）→ 收。
 * 范围：本招是单体抛物连发，画面靠每块石头的弧线标出「这一条抛物线周围会被砸到」，没有地面轮廓。
 * 运动：每块石头沿服务端算出的低弧（`LivingActions.ballistic`）飞出，画出的石头本体由原生实体渲染，
 *   粒子补它身后的尘与旋转的碎点；落地向外崩石屑。
 * 数：`data.chips`（物攻换算的碎岩量）绑定命中崩屑量，`data.shot` / `data.shots` 让画面读出演到第几块、
 *   还剩几块，`data.intensity`（单石威力 / 25）放大整幕，`data.scale`（石块判定 / 0.28）让大个子的石头更大。
 */
const RockblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "uproot", bind: "source", offset: [0, 0.05, 0.2], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 22, shape: { kind: "circle", radius: 0.85 },
                    direction: "inward", speed: [0.04, 0.16], gravity: -0.02,
                    lifetime: [7, 13], size: [0.12, 0.03],
                    color: 0xA98C6A, alpha: [0.9, 0], light: "world", maxParticles: 48
                },
                {
                    name: "gravel", bind: "source", offset: [0, 0.35, 0.2], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.18, 0.05],
                    alpha: [0.85, 0], light: "world", maxParticles: 26
                },
                {
                    name: "choke", bind: "source", offset: [0, 0.1, 0.2], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.04, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.015],
                    alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "stone", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    trail: { minDistance: 0.24 }, rate: 34,
                    direction: "outward", speed: [0.0, 0.03], spin: 6,
                    lifetime: [4, 9], size: [0.34, 0.1],
                    alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fall", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.32 }, rate: 18,
                    direction: "outward", speed: [0.01, 0.06], gravity: 0.05, drag: 0.92,
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xA98C6A, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [4, 9], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 12
                },
                {
                    name: "chips", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "chips", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.26], spread: 26, spin: 8,
                    gravity: 0.08, drag: 0.92,
                    lifetime: [8, 16], size: [0.22, 0.06],
                    color: 0xA98C6A, alpha: [0.9, 0], light: "world", maxParticles: 46
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 15], size: [0.05, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        ground: {
            duration: 18,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "splat", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "chips", fallback: 8 }, at: 0 },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], spin: 7,
                    gravity: 0.1, drag: 0.88,
                    lifetime: [9, 17], size: [0.18, 0.05],
                    color: 0xA98C6A, alpha: [0.8, 0], light: "world", maxParticles: 34
                },
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rockblast", 1, RockblastDefinition);
