/**
 * 蛮力 / superpower 的客户端表现。
 *
 * 一句话：施法者沉肩扎马、脚边尘土被吸拢、拳边亮起暖光 → 整个人贴地压身冲出、身后甩下两道速度线与翻起的土 →
 *   真实撞上身体炸开拳劲与碎土，一个定向拳图沿真实冲撞方向短伸出去（尘土颜色读接触地面/墙面材质）→
 *   撞墙或冲空只扬一蓬同色灰 → 命中冲过头的重心一沉、身体落下疲劳灰气。
 * 色相家族：拳劲的暖橙（impact_fighting / bigfist / xsfadeorblite）为主体，土褐（earth / tinydust / quickattack_dashlines）作地面尘，无第二色相。
 * 拍子：起 charge（扎马蓄势）→ 冲 rush（贴地冲刺）→ 击 impact（撞实、定向拳图）／撞墙 wall（扬灰）→ 收 slump（身体落下疲劳）／失 miss（扑空）。
 * 范围：本招是单体直线突进，画面靠冲刺轨迹与冲击点标出「这条线 + 真实接触处」会被打到；拳图朝向与尘量绑 `data.direction`、`data.dust`，颜色绑 `data.materialTint`。
 * 运动：冲刺沿身体运动方向拖出速度线；冲击向外崩碎土与拳劲，拳图沿冲撞方向伸出；疲劳灰气从身体缓慢下坠、跟随施法者。
 * 数：impact 的尘量绑 `data.dust`（威力派生）、拳劲与冲刺绑 `data.intensity`（威力 / 120）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SuperpowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wind_in", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 34
                },
                {
                    name: "fist_glow", bind: "source", offset: [0, 0.55, 0.28], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.14, 0.03],
                    color: 0xE8A24A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        rush: {
            duration: 0,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "dashline", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    trail: { minDistance: 0.28 }, rate: 26,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.24, 0.08],
                    color: 0xC9B27A, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "kicked", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 22, shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.08, drag: 0.92,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 70
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    // 单个定向拳图：沿 data.direction（真实的冲撞方向）从接触点短伸出去。
                    name: "fist", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    orient: "direction", direction: "shape",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "line", length: 0.55 },
                    speed: [0.08, 0.2],
                    lifetime: [7, 12], size: [0.5, 0.08], sizeMode: "index",
                    alpha: [1, 0], light: "full", maxParticles: 14
                },
                {
                    name: "hit", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "dust", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.06, 0.28], spread: 30,
                    lifetime: [6, 12], size: [0.28, 0.04], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.2], gravity: 0.07, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: { data: "materialTint", fallback: 0x8C7448 }, alpha: [0.6, 0], light: "world", maxParticles: 70
                }
            ]
        },
        wall: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.18], spread: 40, gravity: 0.07, drag: 0.9,
                    lifetime: [9, 16], size: [0.08, 0.01],
                    color: { data: "materialTint", fallback: 0x8C7448 }, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        },
        slump: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "fatigue", fallback: 18 } },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x9A968C, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_superpower", 1, SuperpowerDefinition);
