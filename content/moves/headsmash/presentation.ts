/**
 * 双刃头锤 / headsmash 的客户端表现。
 *
 * 一句话：低头沿一条直线把自己砸出去，整颗头撞实的一刻从命中点迸开成片的石屑与灰白冲击，
 * 反震顺着原路回到自己身上；冲空则一头栽地，脚下炸开一圈碎石。
 * 色相家族：岩灰（0xA88E6A）与冷白（0xEAE6DC）；土褐只在贴地碎石里出现，饱和色只在冲击核心一点。
 * 拍子：起 windup（刨地蓄势）→ 击 charge（直线冲刺）→ impact（命中峰值）＋ recoil（反震）／ crash（栽地）。
 * 范围：charge 的冲刺线与石块沿 `data.path` 直线铺开；impact/crash 绑受力点，画的就是砸到哪。
 * 运动：速度线沿冲撞方向掠过；命中后石屑沿冲撞方向退去；反震的碎屑从自己身上朝反方向散开。
 * 数：`data.hits`（威力派生）决定命中石屑数，`data.intensity`（威力 / 120）抬高密度与亮度，
 * `data.scale`（判定半径 / 0.55）放大头部与尘环，`data.loss`（冲空实际掉血）驱动栽地那圈的密度。
 */
const HeadsmashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "paw", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1], spread: 12,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x8F8779, alpha: [0.5, 0], gravity: 0.03, drag: 0.93, light: "world", maxParticles: 34
                },
                {
                    name: "harden", bind: "source", offset: [0, 0.7, 0], height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 6, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0xA88E6A, alpha: [0.55, 0], light: "world", maxParticles: 16
                }
            ]
        },
        charge: {
            duration: 46,
            exit: { stop: 28, drain: 14 },
            emitters: [
                {
                    name: "rush", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 46, shape: { kind: "box", size: [0.34, 0.28, 0.34] },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.22 },
                    lifetime: [5, 9], size: [0.2, 0.06],
                    color: 0xEAE6DC, alpha: [0.72, 0], light: "full", maxParticles: 260
                },
                {
                    name: "plough", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 28, shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8F8779, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 220
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "skull", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "hits", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.26], spread: 14,
                    lifetime: [8, 14], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "shards", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.3], spin: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [12, 22], size: [0.24, 0.06],
                    color: 0xA88E6A, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 0.52 },
                    direction: "outward", speed: [0.08, 0.22], spread: 8,
                    lifetime: [10, 18], size: [0.36, 0.08],
                    color: 0xCFC7BC, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        recoil: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "back_shock", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 8 },
                    shape: { kind: "hemisphere", radius: 0.42, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.24],
                    lifetime: [9, 16], size: [0.16, 0.04],
                    color: 0xD65A3C, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "strain", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 34 },
                    shape: { kind: "ring", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x9FA8B4, alpha: [0.6, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 90
                }
            ]
        },
        crash: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "faceplant", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "loss", fallback: 10 } },
                    shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.3], spread: 18,
                    lifetime: [9, 16], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8E0CF, alpha: [1, 0], light: "world", bloom: 0.3
                },
                {
                    name: "rockfall", bind: "source", offset: [0, 0.3, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.32], spin: 14,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [14, 26], size: [0.22, 0.05],
                    color: 0xA88E6A, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "tremor", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.5, 1.2], sizeMode: "sin",
                    color: 0x8F8779, alpha: [0.4, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_headsmash", 1, HeadsmashDefinition);
