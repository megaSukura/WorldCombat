/**
 * 泡沫 / bubble 的客户端表现。
 *
 * 一句话：口边先越冒越多地堆起小泡，随后一大群泡泡沿准线扇形铺出去、一路噗噗破掉，糊到的人身上
 *   炸开一圈泡、脚下不停往上冒泡。
 * 色相家族：泡青（0xBFEFFF）与近白（0xEAFBFF）；大面积半透明的泡面 + 小面积高亮的破泡核心。
 * 拍子：起 gather（堆泡）→ 吹 fan（泡群铺开）→ 击 target（糊上炸开）／ 破 pop → 收 linger／clear。
 * 范围：fan 用 `data.path`（与服务端同一个扇形多边形）画成面，玩家看泡群铺到哪就知道站哪会被糊到。
 * 运动：泡泡沿扇形各飞各的（投射物外观本身就是一颗泡），面层带轻微上浮；命中处向外炸开，打滑期间脚边持续上冒。
 * 数：`data.bubbles`（特攻＋等级换算的泡数）绑定发射量，`data.puffs`／`data.volleys` 说明这一口分几轮，
 *   `data.intensity`（泡泡威力 / 40）放大整幕，`data.sudsed`／`data.stages` 让打滑那一下更亮。
 */

const BubbleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "collect", bind: "source", offset: [0, 0.35, 0.35], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: { data: "bubbles", fallback: 24 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xBFEFFF, alpha: [0.75, 0], light: "full", maxParticles: 60
                },
                {
                    name: "froth", bind: "source", offset: [0, 0.32, 0.35], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 16, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 44
                }
            ]
        },
        fan: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "sheet", bind: "path", fit: "none", shape: { kind: "polygon" },
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: { data: "bubbles", fallback: 24 },
                    direction: "up", speed: [0.02, 0.1], spread: 20,
                    drag: 0.95,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xBFEFFF, alpha: [0.7, 0], light: "full", maxParticles: 220
                },
                {
                    name: "mist", bind: "path", fit: "none", shape: { kind: "polygon" },
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: { data: "bubbles", fallback: 24 },
                    direction: "up", speed: [0.02, 0.12], spread: 24,
                    drag: 0.94,
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xEAFBFF, alpha: [0.6, 0], light: "full", maxParticles: 240
                }
            ]
        },
        target: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "pop", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "bubbles", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.22], spread: 24,
                    lifetime: [6, 11], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "swarm", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    burst: { count: { data: "bubbles", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    drag: 0.94,
                    lifetime: [9, 16], size: [0.13, 0.03],
                    color: 0xBFEFFF, alpha: [0.85, 0], light: "full", maxParticles: 120
                }
            ]
        },
        pop: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "bubbles", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.16], spread: 30,
                    drag: 0.92,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "suds", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: { data: "density", fallback: 7 }, shape: { kind: "circle", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.08, 0.02],
                    color: 0xBFEFFF, alpha: [0.5, 0], light: "full", maxParticles: 22
                }
            ]
        },
        clear: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "burst_pop", bind: "target", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], spread: 30,
                    drag: 0.93,
                    lifetime: [8, 14], size: [0.11, 0.02],
                    color: 0xEAFBFF, alpha: [0.85, 0], light: "full", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bubble", 1, BubbleDefinition);
