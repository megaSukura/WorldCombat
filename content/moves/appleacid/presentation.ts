/**
 * 苹果酸 / appleacid —— 客户端表现。
 *
 * 一句话：手里掂着一颗酸苹果 → 苹果沿弧线抛出去 → 命中单体目标时酸花炸开、目标身上浮起一层发酵 →
 * 发酵没退时再命中，白闪破裂、酸花更盛，那层发酵随之散去。
 * 色相家族：酸苹果的黄绿（0x9EC44A / 0xCFE07A），近白只给破裂的那一下。
 * 拍子：起 windup（掂果）→ 掷 cast（真弹体拖尾）→ 命中 hit（发酵中的目标改走 stack，白闪破裂）
 *   → 持续 ferment（目标身上的酸蚀滴落，由服务端 owned 托管效果逐刻续期，消费/到期即收）→ 落空 miss（落点只溅一下）。
 * 范围：hit / stack 的酸花半径绑定 `data.scale`（苹果判定半径派生）。
 * 数：粒子密度绑定 `data.cores`（特攻与等级换算）、强弱绑定 `data.intensity`（砸击威力 / 62）。
 * 发酵标记绑在目标身上（bind: target），没有地面池、没有场伤环。
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
        ferment: {
            duration: 0,
            emitters: [
                {
                    name: "ferment_drip", bind: "target", offset: [0, 0.15, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 3, shape: { kind: "sphere", radius: 0.22 },
                    direction: "down", speed: [0.0, 0.03], gravity: 0.03,
                    lifetime: [14, 26], size: [0.12, 0.03],
                    color: 0x9EC44A, alpha: [0.5, 0], light: "world", maxParticles: 16
                },
                {
                    name: "ferment_bubble", bind: "target", offset: [0, 0.25, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 2, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xCFE07A, alpha: [0.45, 0], light: "world", maxParticles: 12
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
