/**
 * 撒菱 / spikes 的客户端表现。
 *
 * 一句话：手心先拢起一把碎屑，随后碎片被撒出去、贴地插成一圈朝上的尖刺；它平时只是低低的尖刺反光，
 * 有东西踩上或真的在刺地里走出一步时，那个真实的脚印点才向上崩起石屑与一点血光，脚步之外不亮。
 * 色相家族：土石（0xC9B48C 偏暖的岩屑）为主、石灰白（0xE7DFCE）做高光，血光用暗红（0xA8302A）只落在脚印上。
 * 拍子：起（windup 拢屑）→ 撒（throw 抛出 / lay 插开）→ 驻（hum 低鸣，静止）→ 扎（tread 入口 / step 走动）→ 空（miss）。
 * 范围：lay 与 hum 都是 `bind:"point"`、`fit:"none"`，用 `data.radius` 画 ring 与 circle，圈就是会被扎的那块地。
 * 运动：碎片抛出时沿速度走；落地时尖刺从中心向外插开、尘向下沉；踩中时石屑向上崩，走动时脚印点小范围冒刺光。
 * 数：`data.shards`（物攻派生）决定尖刺与碎屑密度，`data.layers`（层数）经 `intensity` 加密真实图案，
 *   `data.step` 的命中另带 `data.intensity`（按当次威力）放大崩屑，`data.scale`（半径/参考 2.4）控制尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SpikesDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.45, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1], spin: 12,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xC9B48C, alpha: [0.7, 0], maxParticles: 50
                }
            ]
        },
        throw: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shard", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 26, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.02, 0.08], spread: 20, spin: 26,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xD9CDB4, alpha: [0.85, 0], maxParticles: 60
                },
                {
                    name: "dust", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 3, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0, 0.02],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xC9B48C, alpha: [0.5, 0], maxParticles: 40
                }
            ]
        },
        lay: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "open_ring", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 36 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.22, 0.5],
                    color: 0xE7DFCE, alpha: [0.6, 0], maxParticles: 70
                },
                {
                    name: "prickle", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 22 }, interval: 2, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.03, 0.14], spread: 12, spin: 40,
                    lifetime: [10, 20], size: [0.18, 0.03],
                    color: 0xC9B48C, alpha: [0.9, 0], maxParticles: 160
                },
                {
                    name: "settle", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xD9CDB4, alpha: [0.5, 0], maxParticles: 100
                }
            ]
        },
        hum: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 5, shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 22], size: [0.16, 0.32],
                    color: 0xC9B48C, alpha: [0.2, 0], maxParticles: 40
                },
                {
                    name: "barbs", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 8, shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.002, 0.02], spread: 18, spin: 10,
                    lifetime: [16, 28], size: [0.14, 0.26],
                    color: 0xE7DFCE, alpha: [0.24, 0], maxParticles: 70
                },
                {
                    name: "glint", bind: "point", offset: [0, 0.14, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.001, 0.015],
                    lifetime: [10, 18], size: [0.05, 0.02],
                    color: 0xFFFFFF, alpha: [0.3, 0], light: "full", maxParticles: 18
                }
            ]
        },
        tread: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "jab", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "shards", fallback: 16 }, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.08, 0.24], spread: 18,
                    lifetime: [6, 12], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xE7DFCE, alpha: [1, 0], maxParticles: 40
                },
                {
                    name: "burst", bind: "target", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.2], spin: 40,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xC9B48C, alpha: [0.85, 0], maxParticles: 50
                }
            ]
        },
        step: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "prick", bind: "target", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 8 } },
                    shape: { kind: "circle", radius: 0.2 },
                    direction: "up", speed: [0.05, 0.16], spread: 20, spin: 36,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xC9B48C, alpha: [0.8, 0], maxParticles: 30
                },
                {
                    name: "grit", bind: "target", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xD9CDB4, alpha: [0.5, 0], maxParticles: 20
                },
                {
                    name: "wound", bind: "target", height: 0.02,
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: 3, interval: 2, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.04, 0.12], spread: 24,
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xA8302A, alpha: [0.85, 0], maxParticles: 12
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "thud", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xC9B48C, alpha: [0.5, 0], maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spikes", 1, SpikesDefinition);
