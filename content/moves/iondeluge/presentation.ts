/**
 * 等离子浴 / Ion Deluge 的客户端表现。
 *
 * 一句话：施法者把一团电荷压向地面 → 一圈青色电环从落点向外铺到浴场边缘，里面浮着密密麻麻的带电粒子，
 *         持续噼啪；走进来的人身上会被一层电膜罩住，走出去时电膜碎成小火花脱落。
 * 色相家族：electric cyan 0x8FE8FF 作场地主体；暖白 0xDFFBFF 作边缘高光；黄白 0xFFF3C4 只给落点强调。
 * 起击收：起 windup 16t ／击 field 46t ／持 field 续期 ／击 ionize 20t ／收 shed 18t。
 * 持续状态：field 贴地低密度呼吸，边界用一圈环画清「站哪里会被电离」，不遮挡战场。
 * 机制驱动：浴场半径决定地面环的实际大小（data.scale = 半径/3.0），粒子密度来自本招算出的 ionDensity。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 强调 electricity_yellow 球面外散          0.2-0.06  10-18 0.9→0  ≤40
 * field 轮廓 giantring_white    环上浮、sin         半径3.0   24-40 0.5→0  ≤40
 * field 主体 electricity_white  圆面内上浮＋spin     0.12-0.04 20-34 0.4→0  ≤160
 * field 细节 accessory_spark    圆面内上浮          0.05-0.01 16-28 0.5→0  ≤180
 * field 尘   tinydust           圆面内上浮          0.05-0.01 14-26 0.25→0 ≤160
 * ionize 强调 electricity_yellow 球面外散           0.22-0.05 10-20 1→0    ≤30
 * ionize 细节 accessory_spark   环外散             0.06-0.02 8-16  0.9→0  ≤30
 * shed 细节 smallsparkle        球面外散            0.06-0.01 8-14  0.7→0  ≤24
 */
const IonDelugeSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                { name: "gather", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 18, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.2, 0.06],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40 }
            ]
        },
        field: {
            duration: 46,
            exit: { stop: 16, drain: 30 },
            emitters: [
                { name: "boundary", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    rate: 8, shape: { kind: "circle", radius: 3.0, thickness: 0.98 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [24, 40], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x8FE8FF, alpha: [0.5, 0], alphaMode: "sin", light: "full", maxParticles: 40 },
                { name: "ions", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "density", fallback: 28 }, shape: { kind: "circle", radius: 2.9 },
                    direction: "up", speed: [0.01, 0.05], spin: 14,
                    lifetime: [20, 34], size: [0.12, 0.04],
                    color: 0x8FE8FF, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 160 },
                { name: "sparks", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: { data: "density", fallback: 28 }, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xDFFBFF, alpha: [0.5, 0], light: "full", maxParticles: 180 },
                { name: "dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 26], size: [0.05, 0.01],
                    color: 0xDFFBFF, alpha: [0.25, 0], light: "full", maxParticles: 160 }
            ]
        },
        ionize: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 20 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0x8FE8FF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 30 },
                { name: "skin", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xDFFBFF, alpha: [0.9, 0], light: "full", maxParticles: 30 }
            ]
        },
        shed: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "peel", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xDFFBFF, alpha: [0.7, 0], light: "world", maxParticles: 24 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_iondeluge", 1, IonDelugeSceneDefinition);
