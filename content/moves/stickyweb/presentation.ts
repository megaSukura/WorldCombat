/**
 * 黏黏网 / stickyweb 的客户端表现。
 *
 * 一句话：口边先拢起一缕黏丝，随后一团丝被抛出去、落地摊成一张贴地的网，网线挂在地面上微微发亮；
 * 有东西踩上去时那一处被丝缠住、丝向上收，网还留在原地。
 * 色相家族：丝白偏米（0xF2EAC0）为主、虫绿（0xA8C46A）只出现在丝屑与踩中高光的小面积上。
 * 拍子：起（windup 拢丝）→ 抛（throw 抛出 / spread 摊开）→ 黏（snare 踩中 / hum 持续）→ 收（hum 自然淡出）。
 * 范围：spread 与 hum 都是 `bind:"point"`、`fit:"none"`，用 `data.radius` 画 ring 与 circle，圈就是会被黏住的那块地。
 * 运动：丝团抛出时沿速度走；摊开时网线贴地向外铺；踩中时丝向上收缠住目标；持续时网线极慢地起伏。
 * 数：`data.strands`（特攻派生）决定网线密度，`data.stages`（减速级数）决定踩中时丝的缠绕量，`data.scale`（半径/参考 2.6）控制尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const StickyWebDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "silk", bind: "source", offset: [0, 0.5, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 14, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.09], spin: 14,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xF2EAC0, alpha: [0.7, 0], maxParticles: 40
                }
            ]
        },
        throw: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wad", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 22, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.07], spread: 18, spin: 22,
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0xF2EAC0, alpha: [0.85, 0], maxParticles: 50
                },
                {
                    name: "wisps", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 2, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0, 0.02],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xA8C46A, alpha: [0.45, 0], maxParticles: 40
                }
            ]
        },
        spread: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "open_ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [10, 18], size: [0.22, 0.48],
                    color: 0xF2EAC0, alpha: [0.55, 0], maxParticles: 70
                },
                {
                    name: "mesh", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "strands", fallback: 18 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.03, 0.1], spin: 12,
                    lifetime: [14, 24], size: [0.22, 0.05],
                    color: 0xF2EAC0, alpha: [0.7, 0], maxParticles: 120
                },
                {
                    name: "dew", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 20 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xFFFFFF, alpha: [0.4, 0], light: "full", maxParticles: 30
                }
            ]
        },
        hum: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "web_ring", bind: "point", offset: [0, 0.07, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 12, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.003, 0.02],
                    lifetime: [14, 24], size: [0.16, 0.36],
                    color: 0xF2EAC0, alpha: [0.24, 0], maxParticles: 50
                },
                {
                    name: "strands", bind: "point", offset: [0, 0.09, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: { data: "strands", fallback: 18 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.002, 0.02], spin: 8,
                    lifetime: [16, 28], size: [0.18, 0.36],
                    color: 0xF2EAC0, alpha: [0.32, 0], maxParticles: 110
                },
                {
                    name: "glints", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.001, 0.01],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xFFFFFF, alpha: [0.35, 0], light: "full", maxParticles: 24
                }
            ]
        },
        snare: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "bind", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 2, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.06, 0.18],
                    lifetime: [8, 16], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF2EAC0, alpha: [0.9, 0], maxParticles: 40
                },
                {
                    name: "coils", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "strands", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xA8C46A, alpha: [0.8, 0], maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stickyweb", 1, StickyWebDefinition);
