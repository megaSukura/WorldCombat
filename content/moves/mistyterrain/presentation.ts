/**
 * 薄雾场地 / mistyterrain 的客户端表现。
 *
 * 一句话：施法者脚边腾起雾絮、把雾压到地面 → 落点炸开一圈雾环、薄雾贴着地皮漫满一块地 →
 * 站上去的活体被雾裹住，异常落不下来（雾墙一缩）、龙招打进来被雾吃掉一半、已有的异常被雾洗掉。
 * 色相家族：雾青白 0xBFE3EF 作主体、近白 0xE8F6FA 作细节、灰蓝 0x8FC7DB 只给挡下与净化的强调。
 * 起击收：起 windup 22t ／击 surge 46t ／持 field 每 5 刻续期 ／击 jolt 22t ／击 ward 22t ／击 veil 22t ／击 cleanse 26t。
 * 持续状态：field 是贴地滚动的雾点与淡淡的边圈，低密度、贴脚边，不遮视线；边圈画出「站哪会被护住」。
 * 机制驱动：薄雾半径决定边圈与雾点的实际大小（data.scale = 半径/3.2），雾点数量直接读雾点密度。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 起雾 smokeorb   球面内聚    0.15-0.4 12-20 0.6→0 ≤70
 * surge  雾环 giantring_white 贴地外扩 0.5-0.9 14-24 0.5→0 ≤40
 * surge  雾团 smoke      圆面上浮    0.12-0.4 18-30 0.45→0 ≤180
 * surge  雾点 powder     圆面上浮    0.05-0.02 12-22 0.5→0 ≤160
 * field  边圈 ripple_white 环上脉冲  0.4-0.8  20-34 0.28→0 ≤40
 * field  雾点 smoke      圆面缓浮    0.1-0.3  20-32 0.3→0 ≤180
 * jolt   入场絮雾 aura_white 球面外散 0.15-0.04 10-20 0.8→0 ≤30
 * ward   挡下 giantring_white 环面向外 0.5-0.9 8-16 0.85→0 ≤30
 * veil   削龙 giantring_white 环面向外 0.4-0.8 8-16 0.7→0 ≤30
 * cleanse 洗异常 smallsparkle 球面上浮 0.08-0.02 12-22 0.9→0 ≤30
 */
const MistyterrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 22, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.16, 0.05],
                    color: 0xBFE3EF, alpha: [0.6, 0], light: "world", maxParticles: 70 }
            ]
        },
        surge: {
            duration: 46,
            exit: { stop: 24, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 28, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.18, 0.3],
                    lifetime: [14, 24], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0xBFE3EF, alpha: [0.5, 0], light: "world", maxParticles: 40 },
                { name: "bank", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [18, 30], size: [0.16, 0.4],
                    color: 0xBFE3EF, alpha: [0.45, 0], light: "world", maxParticles: 180 },
                { name: "motes", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 60, interval: 4, repeats: 6 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 22], size: [0.05, 0.02],
                    color: 0xE8F6FA, alpha: [0.5, 0], light: "world", maxParticles: 160 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/ripple_white",
                    rate: 7, shape: { kind: "ring", radius: 2.9 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 34], size: [0.4, 0.8], sizeMode: "sin",
                    color: 0x8FC7DB, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 40 },
                { name: "motes", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [20, 32], size: [0.12, 0.3],
                    color: 0xBFE3EF, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 180 }
            ]
        },
        jolt: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "rise", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: { data: "surge", fallback: 10 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 20], size: [0.15, 0.04],
                    color: 0xE8F6FA, alpha: [0.8, 0], light: "full", maxParticles: 30 }
            ]
        },
        ward: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "wall", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.1, 0.2],
                    lifetime: [8, 16], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x8FC7DB, alpha: [0.85, 0], light: "full", maxParticles: 30 }
            ]
        },
        veil: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "eat", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.08, 0.18],
                    lifetime: [8, 16], size: [0.4, 0.8], sizeMode: "sin",
                    color: 0xBFE3EF, alpha: [0.7, 0], light: "world", maxParticles: 30 }
            ]
        },
        cleanse: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                { name: "wash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xE8F6FA, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mistyterrain", 1, MistyterrainDefinition);
