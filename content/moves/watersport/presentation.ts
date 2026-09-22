/**
 * 玩水 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把水从身下泼开，落点炸起一圈水环、水贴着地皮铺满一片洼地，水面不断冒起水花与涟漪；
 * 站进去的人被浇得透湿，身上的火被沤成一缕白汽，地面明火也被水一格一格按熄。
 *
 * 色相家族：水蓝 0x4FA8E0 作主体，亮蓝 0x9BD2F5 作边缘，近白 0xEAF7FF 只给水花高光；灭火白汽用中性灰。
 * 一个效果一个色相家族。持续层贴在地面、低密度，让玩家一眼读出「站哪里会被泡湿」，也不挡视线。
 * 层次：起手水光（起）／水环＋水幕（铺开）／贴地水花与涟漪（持续）／泡湿水花（事件）／沤熄白汽（事件）。
 * 起击收：windup（聚水）→ splash（铺开）→ field（持续）→ drench（泡湿）→ douse（沤熄）。
 * 数：水花量绑定服务端算出的 data.density；水洼半径与涟漪尺度绑定 data.scale；火招削弱系数传进 data.fire 供强调层取用。
 */
const WaterSportDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "gather", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 10, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.24, 0.06], sizeMode: "sin",
                    color: 0x9BD2F5, alpha: [0.7, 0], light: "full", maxParticles: 26 }
            ]
        },
        splash: {
            duration: 46,
            exit: { stop: 22, drain: 30 },
            emitters: [
                { name: "wave", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 34, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.2, 0.34], gravity: 0.03,
                    lifetime: [18, 30], size: [0.6, 1.2], sizeMode: "sin",
                    color: 0x9BD2F5, alpha: [0.6, 0], light: "full", maxParticles: 50 },
                { name: "sheet", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "density", fallback: 20 }, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.02, 0.09], gravity: 0.04,
                    lifetime: [14, 26], size: [0.08, 0.02],
                    color: 0x4FA8E0, alpha: [0.6, 0], light: "full", maxParticles: 200 },
                { name: "beads", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 40, interval: 5, repeats: 4 }, shape: { kind: "circle", radius: 2.9 },
                    direction: "up", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [12, 22], size: [0.1, 0.03],
                    color: 0xEAF7FF, alpha: [0.7, 0], light: "full", maxParticles: 140 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "puddle", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 12, shape: { kind: "circle", radius: 2.9 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [18, 30], size: [0.5, 1.3], sizeMode: "sin",
                    color: 0x9BD2F5, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 120 },
                { name: "drops", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "density", fallback: 20 }, shape: { kind: "circle", radius: 2.8 },
                    direction: "up", speed: [0.01, 0.05], gravity: 0.03,
                    lifetime: [12, 24], size: [0.06, 0.02],
                    color: 0x4FA8E0, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 200 },
                { name: "vapor", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 26], size: [0.05, 0.01],
                    color: 0xEAF7FF, alpha: [0.18, 0], light: "full", maxParticles: 140 }
            ]
        },
        drench: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "soak", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 20], size: [0.3, 0.06],
                    color: 0x9BD2F5, alpha: [0.9, 0], light: "full", maxParticles: 60 },
                { name: "drip", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.04,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xEAF7FF, alpha: [0.85, 0], light: "full", maxParticles: 36 }
            ]
        },
        douse: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "steam", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.05, 0.14], drag: 0.94,
                    lifetime: [20, 34], size: [0.35, 0.08],
                    color: 0xCBD2DB, alpha: [0.55, 0], light: "world", maxParticles: 40 },
                { name: "ash", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0xEAF7FF, alpha: [0.5, 0], light: "full", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_watersport", 1, WaterSportDefinition);
