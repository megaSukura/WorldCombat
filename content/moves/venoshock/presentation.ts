/**
 * 毒液冲击 / venoshock 的客户端表现。
 *
 * 一句话：口边凝起一泼发亮的毒液，沿弧线甩出去砸在目标身上炸开一摊毒水；目标体内若已有毒，那摊毒会二次翻涌成更大的反应。
 * 色相家族：毒紫与毒绿（chemicalball / poisonbubble / acidsplash），反应的强调用 impact_poison 的亮帧。
 * 拍子：起（gather 0–6t）→ 击（投射物飞行、splash 命中炸开）→ 收（react 二次反应、fizzle 落空）。
 * 范围：gather 绑施法者口边，splash / react / fizzle 落在命中点——画出的就是判定落点。
 * 运动：毒液沿下坠弧线飞（投射物自带外观），命中向外炸开、气泡向上冒，落空时溅成一小摊。
 * 数：`data.splashCount`（本次威力 / 65 派生的水花数）与 `data.reactCount`（中毒目标时的反应量）直接决定爆发粒子数，
 * `data.intensity` 同时抬高亮度与发射量。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const VenoshockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "brew", bind: "source", offset: [0, 0.9, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 15, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xA855F7, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "fumes", bind: "source", offset: [0, 1.0, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 12, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.07, 0.03],
                    color: 0x9BE86B, alpha: [0.8, 0], light: "full", maxParticles: 34
                }
            ]
        },
        splash: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "splashCount", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "goo", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.07, 0.26],
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x8A3FB5, alpha: [0.8, 0], gravity: 0.04, drag: 0.9, light: "full", maxParticles: 150
                },
                {
                    name: "bubbles", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 40 },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0x9BE86B, alpha: [0.7, 0], gravity: -0.01, light: "full", maxParticles: 160
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.3, 0.12],
                    color: 0x7ED957, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        react: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "eruption", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "reactCount", fallback: 0 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [7, 14], size: [0.4, 0.06], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "gush", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 46 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [12, 22], size: [0.2, 0.05],
                    color: 0x6DD400, alpha: [0.85, 0], gravity: 0.04, drag: 0.9, light: "full", maxParticles: 190
                },
                {
                    name: "haze", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 24 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [14, 26], size: [0.26, 0.08],
                    color: 0x5B2A78, alpha: [0.4, 0], light: "world", maxParticles: 90
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "scatter", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0x8A3FB5, alpha: [0.6, 0], gravity: 0.05, light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_venoshock", 1, VenoshockDefinition);
