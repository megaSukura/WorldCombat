/**
 * 青草场地 / grassyterrain 的客户端表现。
 *
 * 一句话：施法者脚下泛起一圈绿光、把草种按进土里 → 草叶成圈从落点涌出、铺满一块地 →
 * 站上去的活体脚下冒出草根与上浮的绿芒，被草托着慢慢回血；密植时还从草里飞起种子去喂幼苗。
 * 色相家族：草绿 0x7CCB5A 作主体、嫩绿 0x9FE07A 作边缘、近白 0xEDF8DC 只给叶片高光与治疗。
 * 起击收：起 windup 24t ／击 sprout 46t ／持 field 每 5 刻续期 ／击 root 20t ／击 heal 30t ／击 growth 30t。
 * 持续状态：field 是贴地草叶边圈与缓慢呼吸的绿芒，低密度、贴脚边，不遮视线；边圈画出「站哪里被托住」。
 * 机制驱动：草地半径决定边圈与草叶的实际大小（data.scale = 半径/3），草叶数量直接读本招算出的 bloomDensity。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 聚种 xsseed        升腾＋内收   0.10-0.02 10-18 0.9→0 ≤40
 * sprout 波   glowingsparkle 贴地外扩     0.12-0.02 22-34 0.85→0 ≤80
 * sprout 草叶 leaf          向上破土     0.24-0.10 26-44 0.9→0 ≤120
 * sprout 芽   sprout        向上         0.32-0.12 18-30 0.9→0 ≤20
 * field  边圈 leaf          向上         0.14-0.04 40-70 0.22→0 ≤50
 * field  呼吸 sparkle       环上上浮     0.11-0.02 26-44 0.4→0 ≤40
 * field  尘   tinydust      上浮         0.05-0.01 30-55 0.14→0 ≤30
 * root   草根 sprout        向上         0.24-0.10 16-26 0.9→0 ≤20
 * heal   绿芒 glowingsparkle 上浮         0.12-0.02 16-28 0.9→0 ≤30
 * growth 种子 xsseed         下落         0.10-0.02 14-26 0.9→0 ≤30
 */
const GrassyTerrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                { name: "seed", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: 16, interval: 3, repeats: 5 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [10, 18], size: [0.10, 0.02],
                    color: 0x9FE07A, alpha: [0.9, 0], light: "full", maxParticles: 40 }
            ]
        },
        sprout: {
            duration: 46,
            exit: { stop: 24, drain: 30 },
            emitters: [
                { name: "wave", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 40, at: 1 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.14, 0.2],
                    lifetime: [22, 34], size: [0.12, 0.02],
                    color: 0x9FE07A, alpha: [0.85, 0], light: "full", maxParticles: 80 },
                { name: "blades", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 30, repeats: 2, interval: 5 }, shape: { kind: "circle", radius: 2.8, thickness: 0.9 },
                    direction: "up", speed: [0.05, 0.1], gravity: 0.018, drag: 0.96,
                    lifetime: [26, 44], size: [0.24, 0.10],
                    color: 0x86C96A, alpha: [0.9, 0], light: "full", maxParticles: 120 },
                { name: "sprouts", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 5, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.1, 0.16],
                    lifetime: [18, 30], size: [0.32, 0.12],
                    color: 0xEDF8DC, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 20 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 2.7, thickness: 0.9 },
                    direction: "up", speed: [0.005, 0.02], spin: 8,
                    lifetime: [40, 70], size: [0.14, 0.04],
                    color: 0x8FCF6E, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 50 },
                { name: "breathe", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 16, interval: 40, repeats: 15, at: 25 }, shape: { kind: "ring", radius: 2.9 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [26, 44], size: [0.11, 0.02],
                    color: 0xB9E890, alpha: [0.4, 0], light: "full", maxParticles: 40 },
                { name: "motes", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "circle", radius: 2.5 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [30, 55], size: [0.05, 0.01],
                    color: 0xDCEFBF, alpha: [0.14, 0], light: "full", maxParticles: 30 }
            ]
        },
        root: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "grip", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.05, 0.1],
                    lifetime: [16, 26], size: [0.24, 0.10],
                    color: 0x8FCF6E, alpha: [0.9, 0], light: "full", maxParticles: 20 }
            ]
        },
        heal: {
            duration: 30,
            exit: { stop: 8, drain: 20 },
            emitters: [
                { name: "uptake", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.07],
                    lifetime: [16, 28], size: [0.12, 0.02],
                    color: 0xA9E87A, alpha: [0.9, 0], light: "full", maxParticles: 30 },
                { name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: 12, size: [0.30, 0.05], sizeMode: "index",
                    color: 0xEAF9D5, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 6 }
            ]
        },
        growth: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                { name: "sprinkle", bind: "point", offset: [0, 0.9, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: 20 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "down", speed: [0.06, 0.12],
                    lifetime: [14, 26], size: [0.10, 0.02],
                    color: 0xB6E88A, alpha: [0.9, 0], light: "full", maxParticles: 30 },
                { name: "lift", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 3, at: 3 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.05, 0.10],
                    lifetime: [18, 30], size: [0.26, 0.10],
                    color: 0x8FCF6E, alpha: [1, 0], light: "full", maxParticles: 6 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_grassyterrain", 1, GrassyTerrainDefinition);
