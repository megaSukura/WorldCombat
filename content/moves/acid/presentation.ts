/**
 * 溶解液 / acid —— 客户端表现。
 *
 * 一句话：施法者口边鼓起一囊冒泡的强酸 → 一团酸glob低弧抛出、一路滴落 → 落地炸开溅绿、泼到周围敌人身上 →
 * 地面留下一滩持续冒泡的腐蚀酸池。
 * 色相家族：酸绿（0x5B8C22 / 0x9BD34A）为主，近黄绿（0xD6F08A）只给溅点；气泡收在灰绿。
 * 拍子：起 windup（鼓酸）→ 泼 throw（低弧）→ 击 splash（炸开）→ 留 pool（酸池冒泡）。
 * 范围：酸池发射范围直接读取真实半径；轮廓与持续冒泡由场地效果拥有。
 * 运动：酸glob沿抛物线飞行（服务端重力），落地后酸滴向外抛、贴地摊开。
 * 数：酸滴数绑定 `data.drops`（特攻与等级换算），强度绑定 `data.intensity`（单发威力 / 40）。
 */
const AcidDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "charge_bubbles", bind: "source", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0x9BD34A, alpha: [0.85, 0], light: "world", maxParticles: 30
                },
                {
                    name: "charge_ooze", bind: "source", offset: [0, 0.35, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 8, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x5B8C22, alpha: [0.8, 0], light: "world", maxParticles: 20
                }
            ]
        },
        throw: {
            duration: 0,
            exit: { drain: 14 },
            emitters: [
                {
                    name: "glob_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalball",
                    rate: 30, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.24, 0.05],
                    color: 0x8FCB3A, alpha: [0.95, 0], light: "world", maxParticles: 30
                },
                {
                    name: "glob_drip", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    trail: { minDistance: 0.35 }, rate: { data: "drops", fallback: 12 },
                    direction: "down", speed: [0.0, 0.06], spread: 20,
                    gravity: 0.04, drag: 0.96,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0x9BD34A, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        splash: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "splash_core", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalball",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD6F08A, alpha: [1, 0], light: "full", bloom: 0.25, maxParticles: 8
                },
                {
                    name: "splash_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [10, 18], size: [0.3, 0.9],
                    color: 0x5B8C22, alpha: [0.75, 0], light: "world", maxParticles: 8
                },
                {
                    name: "splash_drops", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3], spread: 32,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 18], size: [0.1, 0.02],
                    color: 0x9BD34A, alpha: [0.85, 0], light: "world", maxParticles: 90
                }
            ]
        },
        pool: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "pool_bubbles", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "drops", fallback: 18 }, shape: { kind: "circle", radius: { data: "pool", fallback: 2.2 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 12], size: [0.14, 0.03],
                    color: 0x9BD34A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "pool_ooze", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 16, shape: { kind: "circle", radius: { data: "pool", fallback: 2.2 } },
                    direction: "up", speed: [0.0, 0.015],
                    lifetime: [8, 12], size: [0.2, 0.08],
                    color: 0x5B8C22, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_acid", 1, AcidDefinition);

WorldCombatClient.scene("world_combat:acid_boundary", 1, function (frame) {
    const entry: CombatSceneEntry<{ radius: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const point = entry.position;
    frame.ring(point[0], point[1] + 0.04, point[2], entry.data.radius, 0xAA9BD34A);
});
