/**
 * 求雨 / raindance 的客户端表现。
 *
 * 一句话：施法者头顶旋起一小团暗云、落下第一滴雨 → 云铺开成一大片雨幕，雨点斜着砸满整个雨区地面、
 * 溅起环环涟漪 → 雨里的人身上炸开一串水花、身上的火被浇成一缕白汽。
 * 色相家族：雨蓝 0x6FB7E8 作主体、亮蓝 0x9BD2F5 作边缘、近白 0xEAF7FF 只给水花高光；灭火的白汽用中性灰。
 * 起击收：起 windup 22t ／击 burst 48t ／持 field 每 5 刻续期 ／击 drench 22t ／击 douse 20t。
 * 持续状态：field 是落满整片雨区的斜雨与地面涟漪，低饱和、贴地与高空各一层，让玩家一眼读出站哪里会被淋到；
 * 雨幕虽密但不画在视线正前方，战斗中仍看得清目标。
 * 机制驱动：雨区半径决定雨幕与涟漪的实际大小（data.scale = 半径/9），雨点数量直接读本招算出的 rainDensity。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 云   smokeorb        升腾＋内收   0.5-0.25 30-50 0.5→0 ≤60
 * windup 雨点 rainsplash      下落         0.06-0.02 8-16  0.8→0 ≤30
 * burst  波   largering       贴地外扩     3.2-9.0  20-34 0.6→0 ≤40
 * burst  雨幕 rainsplash      斜向下落     0.10-0.03 16-28 0.7→0 ≤400
 * field  雨幕 rainsplash      斜向下落     0.08-0.02 14-26 0.45→0 ≤360
 * field  涟漪 water_ripple    贴地外扩＋脉冲 0.5-1.4 18-30 0.28→0 ≤120
 * field  水气 tinydust        贴地升腾     0.05-0.01 16-28 0.18→0 ≤160
 * drench 水花 smallbubble     球面外散＋重力 0.12-0.03 10-20 0.9→0 ≤70
 * douse  白汽 smoke           升腾         0.35-0.08 20-34 0.55→0 ≤40
 */
const RainDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                { name: "cloud", bind: "source", offset: [0, 1.9, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 12, interval: 2, repeats: 6 }, shape: { kind: "sphere", radius: 0.9 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [30, 50], size: [0.5, 0.25],
                    color: 0x8A93A8, alpha: [0.5, 0], light: "world", maxParticles: 60 },
                { name: "first", bind: "source", offset: [0, 1.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 10, shape: { kind: "circle", radius: 1.4 },
                    direction: "down", speed: [0.12, 0.3], gravity: 0.05,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x9BD2F5, alpha: [0.8, 0], light: "full", maxParticles: 30 }
            ]
        },
        burst: {
            duration: 48,
            exit: { stop: 26, drain: 30 },
            emitters: [
                { name: "wave", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 34, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.22, 0.34],
                    lifetime: [20, 34], size: [3.2, 0.6],
                    color: 0x9BD2F5, alpha: [0.6, 0], light: "full", maxParticles: 40 },
                { name: "curtain", bind: "point", offset: [0, 11, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "circle", radius: 8.6 },
                    direction: "down", speed: [0.26, 0.46], gravity: 0.05,
                    lifetime: [16, 28], size: [0.10, 0.03],
                    color: 0x6FB7E8, alpha: [0.7, 0], light: "full", maxParticles: 400 },
                { name: "haze", bind: "point", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 60, interval: 4, repeats: 6 }, shape: { kind: "circle", radius: 3.2 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 24], size: [0.06, 0.01],
                    color: 0xEAF7FF, alpha: [0.4, 0], light: "full", maxParticles: 120 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "curtain", bind: "point", offset: [0, 11, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "circle", radius: 8.6 },
                    direction: "down", speed: [0.24, 0.42], gravity: 0.05,
                    lifetime: [14, 26], size: [0.08, 0.02],
                    color: 0x6FB7E8, alpha: [0.45, 0], alphaMode: "sin", light: "full", maxParticles: 360 },
                { name: "ripples", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 12, shape: { kind: "circle", radius: 8.2 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [18, 30], size: [0.5, 1.4], sizeMode: "sin",
                    color: 0x9BD2F5, alpha: [0.28, 0], alphaMode: "sin", light: "full", maxParticles: 120 },
                { name: "mist", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "circle", radius: 8.0 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xEAF7FF, alpha: [0.18, 0], light: "full", maxParticles: 160 }
            ]
        },
        drench: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "splash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.16], gravity: 0.035, drag: 0.9,
                    lifetime: [10, 20], size: [0.12, 0.03],
                    color: 0x9BD2F5, alpha: [0.9, 0], light: "full", maxParticles: 70 },
                { name: "beads", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xEAF7FF, alpha: [0.9, 0], light: "full", maxParticles: 40 }
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

WorldCombatParticles.scene("world_combat:move_raindance", 1, RainDanceDefinition);
