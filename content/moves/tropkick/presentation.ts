/**
 * 热带踢 / tropkick 的客户端表现。
 *
 * 一句话：施法者沉身、脚边火星与被卷起的草叶向脚踝收 → 抬腿踢出一道橙绿弧线、拖着火星 → 踢中的那一下炸开
 *   草绿冲击与向上的火星，落点地面烧出一圈焦痕（攻击下降）。
 * 色相家族：南国热浪的橙（0xE8B87A 主体、0xFFD08A 亮面）与草叶绿（0x9BE86A 细节），焦痕用暗褐，击点近白。
 * 拍子：沉 wind 0–6t ／ 踢 kick ／ 中 hit ／ 焦 scorch ／ 空 miss。
 * 范围：scorch 在落点地面上铺出半径 `data.scorch` 的焦痕（画面就是被烤到的那块地）；hit 绑目标点，
 *   尺寸按 `data.scale`（判定半径 / 0.48）缩放。
 * 运动：wind 的火星与草叶向脚踝内收；kick 拖着沿起脚方向的风痕向上抡；hit 的火星向上喷（挑飞式更高）；
 *   scorch 的焦痕贴地展开、余烬向上飘。
 * 数：`data.embers`（物攻与速度派生的火星数）驱动 wind／kick／hit／scorch 发射量，`data.launch`（是否挑飞式）
 *   抬高 hit 向上火星的初速，`data.intensity`（威力 / 62）抬高密度。
 */
const TropKickSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "flame", bind: "source", offset: [0, 0.18, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 16 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.18], spin: 14,
                    lifetime: [6, 12], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xE8B87A, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "leaf", bind: "source", offset: [0, 0.14, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 16, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.14], spin: 20,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x9BE86A, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        kick: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "arc", bind: "source", offset: [0, 0.4, 0], height: 0.3, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 34, trail: { minDistance: 0.22 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0.02, 0.1], spin: 16,
                    lifetime: [4, 9], size: [0.26, 0.07], sizeMode: "index",
                    color: 0xE8B87A, alpha: [0.75, 0], light: "full", maxParticles: 100
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.35, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 16 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "velocity", speed: [0.05, 0.2], spread: 26, gravity: 0.03,
                    lifetime: [5, 10], size: [0.09, 0.01],
                    color: 0xFFD08A, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "embers", fallback: 16 }, at: 0 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.12, 0.34],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xffffff, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "rise", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 16 }, interval: 2 },
                    shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "up", speed: [0.1, 0.4], spread: 18, gravity: -0.02,
                    lifetime: [7, 13], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "press", bind: "target", offset: [0, 0.1, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.12, 0.3],
                    lifetime: [9, 16], size: [0.4, 0.85], sizeMode: "sin",
                    color: 0x9BE86A, alpha: [0.55, 0], light: "full", maxParticles: 18
                }
            ]
        },
        scorch: {
            duration: 34,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "mark", bind: "point", offset: [0, 0.0, 0], orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1, at: 0, interval: 4 },
                    shape: { kind: "ring", radius: { data: "scorch", fallback: 1.1 } },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [14, 22], size: { data: "scorch", fallback: 1.1 },
                    color: 0x7A5236, alpha: [0.55, 0], light: "world", maxParticles: 12
                },
                {
                    name: "ember", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 16 }, interval: 2 },
                    shape: { kind: "ring", radius: { data: "scorch", fallback: 1.1 } },
                    direction: "up", speed: [0.03, 0.16], gravity: -0.01,
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0xE8B87A, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.16, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "embers", fallback: 14 } }, shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.16], gravity: 0.05, spin: 20,
                    lifetime: [10, 17], size: [0.1, 0.02],
                    color: 0x9BE86A, alpha: [0.6, 0], light: "full", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tropkick", 1, TropKickSceneDefinition);
