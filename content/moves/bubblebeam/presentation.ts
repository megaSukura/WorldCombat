/**
 * 泡沫光线 / bubblebeam 的客户端表现。
 *
 * 一句话：口边堆起一团泡，随后整团泡沫涌出去、沿途散成一片浮起的小泡；命中处「啪」地炸开，
 *   泡沫沿准线继续漫开一层，被糊到的人身上不停往上冒泡、直到泡沫自己爆掉。
 * 色相家族：泡沫青（0x8FE0F0）与近白（0xEAFBFF）；大面积低饱和的泡面 + 小面积高亮的泡核心。
 * 拍子：起 charge（堆泡）→ 涌 stream（泡沫团 + 泡尾）→ 击 burst（炸开）／ 空 splat → 漫 douse／foam → 收 cling／pop。
 * 范围：foam 的地面/锥面层用作者参考半径 2.0 格、按 `data.scale`（溅沫半径 / 2.0）缩放，与服务端锥面判定同一片；
 *   玩家看泡沫雾铺到哪，就知道站哪会被糊到。
 * 运动：泡沫团沿准线飞、小泡带轻微上浮（浮力）向外散；命中向外炸开，落点泡沫向外漫。
 * 数：`data.bubbles`（特攻＋等级换算的泡数）绑定各层发射量；`data.stages` / `data.slowed` 让掉速那一下更亮；
 *   `data.intensity`（泡沫威力 / 65）放大整幕，`data.scale`（判定 / 0.28）让大个子的泡沫团更大。
 */
const BubblebeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "foam_gather", bind: "source", offset: [0, 0.5, 0.25], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: { data: "bubbles", fallback: 22 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 14], size: [0.13, 0.03],
                    color: 0x8FE0F0, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.55, 0.25], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 14, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        stream: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "slug", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    trail: { minDistance: 0.26 }, rate: 34,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [7, 12], size: [0.32, 0.14],
                    color: 0x8FE0F0, alpha: [0.9, 0], light: "full", maxParticles: 36
                },
                {
                    name: "drift", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    trail: { minDistance: 0.22 }, rate: 24,
                    direction: "velocity", speed: [0.01, 0.06], spread: 26,
                    drag: 0.95,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xEAFBFF, alpha: [0.75, 0], light: "world", maxParticles: 80
                },
                {
                    name: "motes", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    trail: { minDistance: 0.32 }, rate: 16,
                    direction: "velocity", speed: [0.02, 0.09], spread: 32,
                    drag: 0.94,
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0xEAFBFF, alpha: [0.65, 0], light: "full", maxParticles: 70
                }
            ]
        },
        burst: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "pop", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "bubbles", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.22], spread: 24,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "swarm", bind: "point", fit: "none", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    burst: { count: { data: "bubbles", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.24], spread: 30,
                    drag: 0.94,
                    lifetime: [9, 16], size: [0.14, 0.03],
                    color: 0x8FE0F0, alpha: [0.85, 0], light: "full", maxParticles: 110
                },
                {
                    name: "film", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.2], spread: 12,
                    drag: 0.92,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xEAFBFF, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        douse: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "coat", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.18], spread: 28,
                    drag: 0.93,
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0x8FE0F0, alpha: [0.85, 0], light: "full", maxParticles: 40
                }
            ]
        },
        foam: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "spread", bind: "point", fit: "none", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    shape: { kind: "ring", radius: 2.0 },
                    burst: { count: { data: "bubbles", fallback: 22 }, at: 0 },
                    direction: "outward", speed: [0.04, 0.18], spread: 10,
                    lifetime: [10, 18], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x8FE0F0, alpha: [0.7, 0], light: "world", maxParticles: 150
                },
                {
                    name: "crest", bind: "point", fit: "none", offset: [0, 0.24, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    shape: { kind: "ring", radius: 2.0 },
                    burst: { count: 20, at: 0 },
                    direction: "outward", speed: [0.05, 0.22], spread: 8,
                    lifetime: [8, 14], size: [0.3, 0.07],
                    color: 0xEAFBFF, alpha: [0.55, 0], light: "full", maxParticles: 60
                }
            ]
        },
        splat: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "spent", bind: "point", fit: "none", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.15], spread: 28,
                    drag: 0.92,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0x8FE0F0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        cling: {
            duration: 0,
            emitters: [
                {
                    name: "bubbles", bind: "target", height: 0.6, offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 6, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.08, 0.02],
                    color: 0x8FE0F0, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        pop: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "burst_pop", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.2], spread: 30,
                    drag: 0.93,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xEAFBFF, alpha: [0.85, 0], light: "full", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bubblebeam", 1, BubblebeamDefinition);
