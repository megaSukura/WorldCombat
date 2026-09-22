/**
 * 超级角击 / megahorn 的客户端表现。
 *
 * 一句话：后腿刨起一圈土，角尖压低攒起一线金光，随后整条又长又窄的金带沿正面捅出去；
 * 被扎中的目标身上炸开虫系冲击与碎屑，角要么留在伤口里把它按住，要么被猛甩出来、把人挑上空中。
 * 色相家族：琥珀金（0xD9A63A）作主体、橄榄绿（0x9AB24A）作细节、暖白（0xF6E6B8）作强调；中性尘屑收尾。
 * 拍子：起 charge（刨地蓄势）→ 击 thrust（窄带捅出）与 pierce（扎实）→ 收 pin（钉住）或 toss（挑飞）。
 * 范围：thrust 的窄带用 `data.path`（与服务端 trace 同一条角的走向）填成多边形，玩家一眼看出只有这条窄带会被扎到。
 * 运动：窄带沿 `data.direction` 直线捅出，碎屑沿同方向被带出；toss 的尘土随目标向上再落下。
 * 数：窄带粒子量绑 `data.shards`（物攻换算）、命中爆点绑同一个值；窄带长度与体积绑 `data.scale`（射程换算）。
 */
const MegahornDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "paw", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spread: 18,
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0xB9A06A, alpha: [0.5, 0], gravity: 0.05, drag: 0.94, light: "world", maxParticles: 34
                },
                {
                    name: "aim", bind: "source", offset: [0, 0.55, 0.34], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.16, 0.04],
                    color: 0xF0D060, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 22
                },
                {
                    name: "hone", bind: "source", offset: [0, 0.55, 0.34], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 5, shape: { kind: "line", length: 0.7 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xD9A63A, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        thrust: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shock", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    shape: { kind: "polygon" }, burst: { count: { data: "shards", fallback: 16 } },
                    direction: "shape", orient: "direction", speed: [0.02, 0.1], spread: 12,
                    lifetime: [6, 10], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xF6E6B8, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    shape: { kind: "polyline" }, burst: { count: 10 },
                    direction: "shape", orient: "direction", speed: [0.1, 0.28],
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xD9A63A, alpha: [0.7, 0], light: "world", maxParticles: 44
                },
                {
                    name: "tracks", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xB9A06A, alpha: [0.5, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        pierce: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shatter", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "barbs", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xD9A63A, alpha: [0.85, 0], light: "world", maxParticles: 46
                },
                {
                    name: "powder", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0x9AB24A, alpha: [0.55, 0], gravity: 0.05, drag: 0.94, light: "world", maxParticles: 32
                }
            ]
        },
        pin: {
            duration: 40,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hold", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.24, 0.06],
                    color: 0xE0C86A, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "grip", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xB9A06A, alpha: [0.55, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        toss: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [6, 12], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xF6E6B8, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "clods", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [9, 18], size: [0.1, 0.03],
                    color: 0xB9A06A, alpha: [0.6, 0], gravity: 0.08, drag: 0.94, light: "world", maxParticles: 40
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 11], size: [0.16, 0.03],
                    color: 0xF0D060, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.55, 0.5], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 14, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.4, angleDegrees: 16 },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [5, 10], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xD9A63A, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_megahorn", 1, MegahornDefinition);
