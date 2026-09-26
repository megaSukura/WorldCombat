/**
 * 苹果酸 / appleacid —— 客户端表现。
 *
 * 一句话：手里掂着一颗酸苹果 → 苹果沿弧线抛出去 → 在真落点炸成一圈酸浆、主目标与周围一起被泡软 →
 * 落点留下一滩冒泡的酸浆，走进去的人先被浸到发酵、留在里面反复被咬、发酵越深泡越密。
 * 色相家族：酸苹果的黄绿（0x9EC44A / 0xCFE07A），近白只给砸中的那一下。
 * 拍子：起 windup（掂果）→ 掷 cast（真弹体拖尾）→ 爆 burst（真落点炸开）→ 击 hit／叠酸 stack（主目标，只有新苹果吃到发酵才出现）
 *   → 留 patch（冒泡，泡强度绑成熟进度）→ 浸 soak／patch_hit（迟到者）。
 * 范围：burst 的溅射圈半径直接绑定服务端的 `data.splash`，patch 的泡密度绑定 `data.bubble`（成熟进度换算）。
 * 运动：苹果沿弧线飞向目标（真弹体锚点同步）；酸浆的酸泡在原地升起。
 * 数：苹果粒数与酸浆密度绑定 `data.cores`（特攻与等级换算），强弱绑定 `data.intensity`（砸击威力 / 62）。
 */
const AppleAcidDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "charge_juice", bind: "source", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    rate: 14, shape: { kind: "sphere", radius: 0.38 },
                    direction: "inward", speed: [0.03, 0.12], gravity: 0.04,
                    lifetime: [8, 15], size: [0.12, 0.02],
                    color: 0x9EC44A, alpha: [0.9, 0], light: "world", maxParticles: 24
                },
                {
                    name: "charge_seeds", bind: "source", offset: [0, 0.3, 0], height: 0.58,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 8, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.1], spin: 12,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xCFE07A, alpha: [0.8, 0], light: "world", maxParticles: 16
                }
            ]
        },
        cast: {
            duration: 60,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "cast_trail", bind: "projectile", offset: [0, 0.15, 0], trail: { minDistance: 0.22 },
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    rate: { data: "cores", fallback: 12 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "velocity", speed: [0.02, 0.1], spread: 12, gravity: 0.05,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x9EC44A, alpha: [0.85, 0], light: "world", maxParticles: 80
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "burst_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "splash", fallback: 2.2 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0x9EC44A, alpha: [0.7, 0], light: "world", maxParticles: 6
                },
                {
                    name: "burst_splash", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "cores", fallback: 12 } },
                    shape: { kind: "sphere", radius: { data: "splash", fallback: 2.2 } },
                    direction: "outward", speed: [0.1, 0.34], gravity: 0.06,
                    lifetime: [8, 16], size: [0.16, 0.02],
                    color: 0xCFE07A, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "burst_impact", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: 8, size: [0.3, 0.6], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 6
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_acid", bind: "target", offset: [0, 0.12, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "cores", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.05,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x9EC44A, alpha: [0.9, 0], light: "world", maxParticles: 36
                }
            ]
        },
        stack: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "stack_flash", bind: "target", offset: [0, 0.12, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 8, size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "stack_acid", bind: "target", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "cores", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.3], gravity: 0.04,
                    lifetime: [8, 18], size: [0.15, 0.02],
                    color: 0xCFE07A, alpha: [1, 0], light: "full", maxParticles: 44
                }
            ]
        },
        patch: {
            duration: 120,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "patch_pool", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 5, shape: { kind: "circle", radius: 1.4 },
                    direction: "up", speed: [0.0, 0.03],
                    lifetime: [18, 32], size: [0.3, 0.05],
                    color: 0x9EC44A, alpha: [0.32, 0], light: "world", maxParticles: 60
                },
                {
                    name: "patch_bubbles", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: { data: "bubble", fallback: 3 }, shape: { kind: "circle", radius: 1.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 26], size: [0.06, 0.01],
                    color: 0xCFE07A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        soak: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "soak_splash", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "cores", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.04,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9EC44A, alpha: [0.8, 0], light: "world", maxParticles: 30
                }
            ]
        },
        patch_hit: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "patch_bite", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "cores", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xCFE07A, alpha: [0.8, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.06,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x9EC44A, alpha: [0.6, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_appleacid", 1, AppleAcidDefinition);
