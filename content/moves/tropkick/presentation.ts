/**
 * 热带踢 / tropkick 的客户端表现。
 *
 * 一句话：施法者沉身、脚边火星与被卷起的草叶向脚踝收 → 一记低平的侧踢贴着地面扫出橙绿弧线、拖着火星 →
 *   踢中的那一下热纹沿腿散开、草绿冲击与火星上溅（攻击下降）→ 回身收脚时脚边扬起一小撮尘叶。
 * 色相家族：南国热浪的橙（0xE8B87A 主体、0xFFD08A 亮面）与草叶绿（0x9BE86A 细节），击点近白。
 * 拍子：沉 wind 0–6t ／ 踢 kick（低平）／ 中 hit ／ 收 retract ／ 空 miss。
 * 范围：kick／hit 绑施法者与目标；收脚后撤由服务端给的实际位移 `data.moved` 决定 retract 尘量。
 * 运动：wind 的火星与草叶向脚踝内收；kick 的火星沿低平方向扫出；hit 的热纹沿腿横向铺开、火星上溅；
 *   retract 的尘叶在脚下扬起——后撤多少就带起多少。
 * 数：`data.embers`（物攻与速度派生的火星数）驱动 wind／kick／hit／retract 发射量，`data.moved`（实际后撤格数）
 *   决定 retract 的尘量，`data.intensity`（威力 / 62）抬高密度。
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
                    name: "arc", bind: "source", offset: [0, 0.2, 0], height: 0, orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 34, trail: { minDistance: 0.22 }, shape: { kind: "line", length: 0.7 },
                    direction: "shape", speed: [0.02, 0.1], spin: 16,
                    lifetime: [4, 9], size: [0.24, 0.07], sizeMode: "index",
                    color: 0xE8B87A, alpha: [0.75, 0], light: "full", maxParticles: 100
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.16, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 16 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "velocity", speed: [0.05, 0.2], spread: 24, gravity: 0.03,
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
                    name: "heatline", bind: "target", offset: [0, 0.2, 0], height: 0, orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 16 }, interval: 2 }, shape: { kind: "line", length: 0.9 },
                    direction: "shape", speed: [0.06, 0.22], spread: 12,
                    lifetime: [7, 13], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
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
        retract: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scuff", bind: "source", offset: [0, 0.12, 0], height: 0.05,
                    burst: { count: { data: "moved", fallback: 1 }, interval: 1 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.16], gravity: 0.05,
                    lifetime: [9, 15], size: [0.08, 0.02],
                    color: 0xC9CFD6, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.14, 0], height: 0.06,
                    burst: { count: { data: "moved", fallback: 1 }, interval: 1 },
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.16], gravity: 0.05, spin: 18,
                    lifetime: [9, 15], size: [0.1, 0.02],
                    color: 0x9BE86A, alpha: [0.55, 0], light: "full", maxParticles: 40
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
