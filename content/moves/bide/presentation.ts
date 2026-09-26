/**
 * 忍耐 / bide 的客户端表现。
 *
 * 一句话：收住架势后，一层骨白色的力场裹住施法者，挨到的每一记都被吸进壳里、壳随账本越来越亮；
 *   时间一到，壳炸开来，一道余烬红的重力沿最后来击的方向砸回打人者身上。
 * 色相家族：骨白 0xEAD9B0 作主体、暖白 0xFFF6E6 作高光，余烬红 0xE06A3C 只出现在还手与壳的裂口。
 * 拍子：起（windup 收势）→ 忍（brace 壳与吸力，absorb 每一记入账）→ 还（release 壳炸／strike 命中）→ 收（whiff／broken）。
 * 范围：release 的地面圈半径绑服务端 data.reach（真实返还射程），玩家看到圈就知道这口能吐到多远。
 * 运动：absorb 的碎片朝施法者收束；release 的碎块从中心向外炸开，strike 在被打者身上再炸一次。
 * 数：壳的密度随 data.intensity（账本／上限）升高，入账与还手的粒子数绑 data.motes（账本与伤害派生）。
 */
const BideDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "settle_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [9, 15], size: [0.26, 0.08],
                    color: 0xEAD9B0, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "settle_dust", bind: "source", offset: [0, 0.1, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xFFF6E6, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        brace: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "shell", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 7, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.16, 0.04],
                    color: 0xEAD9B0, alpha: [0.5, 0.05], alphaMode: "sin", light: "full", maxParticles: 26
                },
                {
                    name: "shell_glints", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0xFFF6E6, alpha: [0.55, 0], light: "full", maxParticles: 20
                },
                {
                    name: "brace_ring", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 3, shape: { kind: "ring", radius: 1.0 },
                    direction: "up", speed: [0.004, 0.012],
                    lifetime: [24, 40], size: [0.12, 0.04],
                    color: 0xEAD9B0, alpha: [0.16, 0.02], alphaMode: "sin", light: "world", maxParticles: 18
                }
            ]
        },
        absorb: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "absorb_flash", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFF6E6, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "absorb_pull", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xEAD9B0, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        release: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "burst", bind: "source", height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 30 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [7, 14], size: [0.5, 0.06], sizeMode: "index",
                    color: 0xFFF6E6, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "release_link", bind: "path", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 90, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.08, 0.24], spread: 10,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE06A3C, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "release_spark", bind: "path", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 30, trail: { minDistance: 0.3 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.04, 0.14],
                    lifetime: [7, 14], size: [0.08, 0.01], sizeMode: "index",
                    color: 0xFFF6E6, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "out_ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 4 }, shape: { kind: "ring", radius: { data: "reach", fallback: 6 } },
                    direction: "outward", speed: [0.06, 0.2], spread: 8,
                    lifetime: [14, 26], size: [0.5, 1.1], sizeMode: "linear",
                    color: 0xE06A3C, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "ember", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "circle", radius: 1.2, thickness: 0.85 },
                    direction: "outward", speed: [0.15, 0.5], spread: 18,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xE06A3C, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.35], spread: 20,
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFF6E6, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "hit_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.4, 0.9], sizeMode: "linear",
                    color: 0xE06A3C, alpha: [0.7, 0], light: "full", maxParticles: 12
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "whiff_puff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0xEAD9B0, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        broken: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "break_ring", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [8, 16], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xEAD9B0, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "break_dust", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.18], drag: 0.9,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xE06A3C, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bide", 1, BideDefinition);
