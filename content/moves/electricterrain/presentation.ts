/**
 * 电气场地 / electricterrain 的客户端表现。
 *
 * 一句话：施法者身上窜起短促电弧、把电流按进地里 → 落点炸开一圈电环、电弧贴着地皮爬满一块地 →
 * 站上去的活体脚下迸起火花、被电流包住，睡着的人被电醒时爆出一团白光。
 * 色相家族：电青 0x8FE8FF 作地面主体、暖白 0xDFFBFF 作边缘、黄白 0xFFF3C4 只给强调；电醒用近白高光。
 * 起击收：起 windup 20t ／击 surge 46t ／持 field 每 5 刻续期 ／击 jolt 20t ／击 awake 22t。
 * 持续状态：field 是贴地爬行的电弧与边圈，低密度、贴脚边，不遮视线；边圈画出「站哪里会带电」。
 * 机制驱动：电场半径决定边圈与电弧的实际大小（data.scale = 半径/3），电弧数量直接读本招算出的 fieldDensity，
 * 入场合电的亮度读 surge。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 电弧 electricity_yellow 球面外散   0.2-0.06 10-18 0.9→0 ≤40
 * surge  边环 giantring_white   贴地外扩   0.5-0.9  14-24 0.6→0 ≤40
 * surge  电弧 electricity_white 圆面内上浮＋spin 0.12-0.04 16-28 0.6→0 ≤200
 * surge  火花 accessory_spark  圆面内上浮 0.06-0.02 12-22 0.6→0 ≤160
 * field  边圈 giantring_white  环上脉冲   0.5-0.9  20-34 0.32→0 ≤40
 * field  电弧 electricity_white 圆面内上浮＋spin 0.10-0.03 18-30 0.4→0 ≤180
 * field  尘   tinydust         圆面内上浮 0.05-0.01 14-26 0.2→0 ≤140
 * jolt   入场合电 electricity_yellow 球面外散 0.22-0.05 10-20 1→0 ≤30
 * jolt   皮下火花 paralysis_spark 环外散 0.06-0.02 8-16 0.9→0 ≤30
 * awake  电醒 electricity_white 球面外散 0.24-0.06 12-22 1→0 ≤30
 * awake  高光 smallsparkle     上浮       0.08-0.02 10-18 0.9→0 ≤30
 */
const ElectricTerrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 18, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.2, 0.06],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40 }
            ]
        },
        surge: {
            duration: 46,
            exit: { stop: 24, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 30, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.18, 0.28],
                    lifetime: [14, 24], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x8FE8FF, alpha: [0.6, 0], light: "full", maxParticles: 40 },
                { name: "arcs", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.01, 0.05], spin: 14,
                    lifetime: [16, 28], size: [0.12, 0.04],
                    color: 0x8FE8FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 200 },
                { name: "sparks", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 60, interval: 4, repeats: 6 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.06, 0.02],
                    color: 0xDFFBFF, alpha: [0.6, 0], light: "full", maxParticles: 160 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    rate: 8, shape: { kind: "ring", radius: 2.9 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 34], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x8FE8FF, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 40 },
                { name: "arcs", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.01, 0.05], spin: 14,
                    lifetime: [18, 30], size: [0.10, 0.03],
                    color: 0x8FE8FF, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 180 },
                { name: "dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 26], size: [0.05, 0.01],
                    color: 0xDFFBFF, alpha: [0.2, 0], light: "full", maxParticles: 140 }
            ]
        },
        jolt: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "surge", fallback: 10 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0xFFF3C4, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 30 },
                { name: "skin", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xDFFBFF, alpha: [0.9, 0], light: "full", maxParticles: 30 }
            ]
        },
        awake: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "wake", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 22], size: [0.24, 0.06],
                    color: 0xFFF3C4, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 30 },
                { name: "lift", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.04, 0.1],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xDFFBFF, alpha: [0.9, 0], light: "full", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_electricterrain", 1, ElectricTerrainDefinition);
