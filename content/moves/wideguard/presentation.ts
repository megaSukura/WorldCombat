/**
 * 广域防守 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者按地，一排石灰色的光板从脚边立起、横着摊开成一面宽墙，罩住身边的伙伴；
 *   成片拍过来的攻击撞在墙上被卸成一片碎光，墙磨穿时整排光板一起落。
 *
 * 色相家族：石黄灰（0xC9C3AE）为主体，近白（0xEDEAE0）做高光与碎光，深石（0x6E685C）做尘与余韵；没有第二个色相。
 * 层次：聚板（起）／宽墙环与板面（击）／贴身屏幕（持续）／卸力碎光（事件）／落板（收）。
 * 起击收：brace（起）→ raise（击）→ hold（持续）→ block（事件）→ fall（收）。
 * 范围：地环与板面绑落点、fit none，半径按 `data.scale`（实际遮蔽半径 / 3.6）推出，画出来的圈就是墙真罩到的范围。
 * 运动：起手光板向内聚；立墙时环向外推远、板面自地面升起；卸力时碎光沿来袭方向弹开；落板时向下沉散。
 * 数：光板数绑 `data.plates`（防御派生），光点量绑 `data.motes`（防御派生），尺寸与范围绑 `data.scale`（体型与配置派生）。
 * 持续状态：持续层贴地、低密度，让出目标本体视线。
 */
const WideGuardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "brace_plate", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: 8, shape: { kind: "sphere", radius: 1.2 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 8,
                    lifetime: [10, 16], size: [0.3, 0.08],
                    color: 0xEDEAE0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        raise: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "raise_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.36, 0.14],
                    color: 0xC9C3AE, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "raise_screen", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "plates", fallback: 10 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [16, 26], size: [0.5, 0.16],
                    color: 0xEDEAE0, alpha: [0.75, 0], light: "full", maxParticles: 50
                },
                {
                    name: "raise_rock", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 3.0 },
                    direction: "up", speed: [0.04, 0.14], gravity: 0.02, drag: 0.92,
                    lifetime: [12, 20], size: [0.3, 0.08],
                    color: 0xC9C3AE, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "hold_screen", bind: "target", fit: "body", height: 0.35, offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.006, 0.03],
                    lifetime: [14, 22], size: [0.34, 0.1], sizeMode: "sin",
                    color: 0xC9C3AE, alpha: [0.26, 0], alphaMode: "sin", light: "world", maxParticles: 18
                },
                {
                    name: "hold_mote", bind: "target", fit: "body", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 2, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [14, 22], size: [0.07, 0.01],
                    color: 0xEDEAE0, alpha: [0.22, 0], light: "world", maxParticles: 14
                }
            ]
        },
        block: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "block_shatter", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "away", speed: [0.08, 0.26], drag: 0.88, spin: 18,
                    lifetime: [8, 16], size: [0.24, 0.05],
                    color: 0xEDEAE0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "block_glint", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xC9C3AE, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fall_screen", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.03, drag: 0.9,
                    lifetime: [16, 28], size: [0.34, 0.1],
                    color: 0x6E685C, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fall_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0x6E685C, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wideguard", 1, WideGuardDefinition);
