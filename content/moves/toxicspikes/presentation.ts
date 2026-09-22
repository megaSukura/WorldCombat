/**
 * 毒菱 / toxicspikes 的客户端表现。
 *
 * 一句话：手心先搅起一团毒雾，随后一排毒菱被撒出去、落地插成一片泛着紫光的毒菱；有敌人踩上去时那一处
 * 涌起毒泡，毒属性的身体走进来时毒菱和毒雾被它吸回身里、整片熄灭。
 * 色相家族：毒紫（0x9B4FBE）为主、酸绿（0x8FD46A）只出现在毒泡与尖端的小面积上——毒与酸液是一家。
 * 拍子：起（windup 聚毒）→ 撒（throw 抛出 / lay 插开）→ 毒（poison 踩中 / absorb 被吸掉 / hum 持续）→ 收（hum 自然淡出）。
 * 范围：lay 与 hum 都是 `bind:"point"`、`fit:"none"`，用 `data.radius` 画 ring 与 circle，圈就是会中毒的那块地。
 * 运动：毒菱抛出时沿速度走；落地时菱角向外插开、毒雾下沉；踩中时毒泡向上涌；被吸掉时毒雾与毒泡向体内收。
 * 数：`data.fumes`（特攻派生）决定毒气与毒泡密度，`data.layers`（1/2 层）决定尖端亮度与是否剧毒，`data.scale`（半径/参考 2.2）控制尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const ToxicSpikesDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fumes", bind: "source", offset: [0, 0.45, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.09], spin: 10,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x9B4FBE, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        throw: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spikes", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    rate: 24, shape: { kind: "sphere", radius: 0.14 },
                    direction: "velocity", speed: [0.02, 0.08], spread: 20, spin: 28,
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0x9B4FBE, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "trail", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 2, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0, 0.02],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x8FD46A, alpha: [0.5, 0], light: "full", maxParticles: 40
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
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.24, 0.5],
                    color: 0x9B4FBE, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "caltrops", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    burst: { count: { data: "fumes", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.03, 0.14], spread: 14, spin: 36,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x9B4FBE, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "miasma", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 34 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0x8FD46A, alpha: [0.5, 0], maxParticles: 100
                }
            ]
        },
        hum: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 12, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.004, 0.03],
                    lifetime: [14, 22], size: [0.16, 0.36],
                    color: 0x9B4FBE, alpha: [0.26, 0], light: "full", maxParticles: 60
                },
                {
                    name: "spikes", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/caltrop",
                    rate: { data: "fumes", fallback: 16 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.004, 0.03], spread: 16, spin: 16,
                    lifetime: [14, 26], size: [0.14, 0.3],
                    color: 0x9B4FBE, alpha: [0.35, 0], light: "full", maxParticles: 110
                },
                {
                    name: "bubbles", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 10, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0x8FD46A, alpha: [0.4, 0], light: "full", maxParticles: 50
                }
            ]
        },
        poison: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 2, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.22], spread: 22,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x9B4FBE, alpha: [1, 0], light: "full", maxParticles: 40
                },
                {
                    name: "rise", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "fumes", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x8FD46A, alpha: [0.8, 0], light: "full", maxParticles: 50
                }
            ]
        },
        absorb: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "drain", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: { data: "fumes", fallback: 14 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.06, 0.18], spin: 24,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x9B4FBE, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8FD46A, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_toxicspikes", 1, ToxicSpikesDefinition);
