/**
 * 章鱼桶炮 / octazooka 的客户端表现。
 *
 * 一句话：一口墨在口中聚成球，随后按节奏连喷数股漆黑的墨弹；每股各有一个炮口收缩与真实弹体，
 *       打中目标时溅开，降准成功那一次才在脸上罩墨；首碰方块只留一小块装饰墨。
 * 色相家族：墨黑（0x14141C）与冷灰蓝（0x3A3A5A），高光收在近白（墨面反光）。
 * 拍子：起 gather（口中蓄墨）→ 每股一次 jet（炮口收缩，`data.shot` 区分第几股）与 flight（弹体飞出）、
 *       splash（命中溅墨）→ 收 face（降准成功才罩脸）与 stain（首碰方块的装饰墨）与 settle（余墨散尽）。
 * 范围：stain 的墨印盘与 splash 的溅散半径都按 `data.scale`（碰撞箱比）铺开，不画危险圈。
 * 运动：每股墨弹沿服务端方向直线飞行、拖墨滴；命中处墨点向外抛落。
 * 数：墨滴数绑定 `data.drops`（特攻与等级换算），炮口收缩粒子数绑定 `data.muzzle`（drops 派生），
 *     命中强度绑定 `data.intensity`（每股威力 / 20）。
 */
const OctazookaDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "ink_ball", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalball",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.08], sizeMode: "sin",
                    color: 0x14141C, alpha: [0.85, 0.15], light: "world", maxParticles: 26
                },
                {
                    name: "draw", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [7, 12], size: [0.09, 0.02],
                    color: 0x3A3A5A, alpha: [0.8, 0], light: "world", maxParticles: 34
                }
            ]
        },
        jet: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalball",
                    burst: { count: { data: "muzzle", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "inward", speed: [0.1, 0.24],
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "sin",
                    color: 0x14141C, alpha: [0.95, 0], light: "world", maxParticles: 30
                }
            ]
        },
        flight: {
            emitters: [
                {
                    name: "bolt", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalball",
                    trail: { minDistance: 0.28 }, rate: 26,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.24, 0.14],
                    color: 0x14141C, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "drip_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.18 }, rate: { data: "drops", fallback: 20 },
                    direction: "velocity", speed: [0.0, 0.04], spread: 24,
                    gravity: 0.025, drag: 0.93,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x3A3A5A, alpha: [0.75, 0], light: "world", maxParticles: 120
                }
            ]
        },
        splash: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "ink_burst", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "drops", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.1, 0.36], spread: 30,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.17, 0.03], sizeMode: "index",
                    color: 0x14141C, alpha: [0.95, 0], light: "world", maxParticles: 120
                },
                {
                    name: "spray_mist", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "drops", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 28,
                    gravity: 0.01, drag: 0.88,
                    lifetime: [12, 22], size: [0.24, 0.06],
                    color: 0x1E1E2C, alpha: [0.4, 0], light: "world", render: "translucent", maxParticles: 60
                }
            ]
        },
        face: {
            duration: 70,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "ink_mask", bind: "target", offset: [0, 0.9, 0], height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash", spriteFrom: "random",
                    rate: 3, shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.0, 0.012],
                    lifetime: [16, 30], size: [0.15, 0.05],
                    color: 0x14141C, alpha: [0.85, 0.15], light: "world", maxParticles: 14
                },
                {
                    name: "ink_drips", bind: "target", offset: [0, 0.8, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 2, shape: { kind: "sphere", radius: 0.18 },
                    direction: "down", speed: [0.0, 0.02],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0x3A3A5A, alpha: [0.7, 0], light: "world", maxParticles: 12
                }
            ]
        },
        stain: {
            duration: 0,
            exit: { stop: 10, drain: 26 },
            emitters: [
                {
                    name: "mark", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash", spriteFrom: "random",
                    burst: { count: { data: "drops", fallback: 10 } },
                    shape: { kind: "circle", radius: 0.4 },
                    orient: "direction", direction: "shape", speed: [0.0, 0.02], spread: 20,
                    gravity: 0.02, drag: 0.88,
                    lifetime: [16, 28], size: [0.16, 0.04], sizeMode: "index",
                    color: 0x14141C, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "drops", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x3A3A5A, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_octazooka", 1, OctazookaDefinition);
