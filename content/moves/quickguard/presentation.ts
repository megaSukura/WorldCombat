/**
 * 快速防守 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者按地，一排青白色的快板从身前斜撑起来、横着摊开成一面短墙，罩住身边的伙伴；
 *   贴速度打来的先制攻击撞在墙上被磕成一片碎光，墙磨穿时整排板向下落。
 *
 * 色相家族：青白（0xBFE3FF）为主体，近白（0xEDF6FF）做高光与碎光，深蓝（0x5B7FA6）做落板与余韵；没有第二个色相。
 * 层次：聚板（起）／快板环与板面（击）／贴身短墙（持续）／磕开碎光（事件）／落板（收）。
 * 起击收：brace（起）→ raise（击）→ hold（持续）→ block／ward（事件）→ fall（收）。
 * 范围：地环与板面绑落点、fit none，半径按 `data.scale`（实际遮蔽半径 / 3.2）推出，画出来的圈就是板真罩到的范围。
 * 运动：起手光板向内聚；架板时环向外推远、板面自地面升起；磕开时碎光沿来袭方向弹开；落板时向下沉散。
 * 数：快板数绑 `data.plates`（速度派生），光点量绑 `data.motes`（速度派生），尺寸与范围绑 `data.scale`（体型与配置派生）。
 * 持续状态：持续层贴地、低密度，让出目标本体视线。
 */
const QuickGuardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "brace_line", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 10, shape: { kind: "sphere", radius: 1.0 },
                    direction: "inward", speed: [0.04, 0.12], drag: 0.9, spin: 6,
                    lifetime: [8, 14], size: [0.24, 0.06],
                    color: 0xEDF6FF, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 36
                }
            ]
        },
        raise: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "raise_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.3, 0.12],
                    color: 0xBFE3FF, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "raise_panel", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "plates", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.15], drag: 0.9,
                    lifetime: [14, 24], size: [0.44, 0.14],
                    color: 0xEDF6FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "raise_spark", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xBFE3FF, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        hold: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hold_panel", bind: "target", fit: "body", height: 0.35, offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.006, 0.03],
                    lifetime: [14, 22], size: [0.3, 0.1], sizeMode: "sin",
                    color: 0xBFE3FF, alpha: [0.24, 0], alphaMode: "sin", light: "world", maxParticles: 16
                },
                {
                    name: "hold_mote", bind: "target", fit: "body", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.06, 0.01],
                    color: 0xEDF6FF, alpha: [0.2, 0], light: "world", maxParticles: 14
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "block_burst", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "plates", fallback: 8 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "away", speed: [0.1, 0.3], drag: 0.88, spin: 16,
                    lifetime: [8, 16], size: [0.3, 0.06],
                    color: 0xEDF6FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "block_spark", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [6, 14], size: [0.12, 0.02],
                    color: 0xBFE3FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                }
            ]
        },
        ward: {
            duration: 20,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "ward_flash", bind: "target", fit: "body", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xEDF6FF, alpha: [0.9, 0], light: "full", bloom: 0.28, maxParticles: 30
                },
                {
                    name: "ward_ring", bind: "target", fit: "body", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.24, 0.06],
                    color: 0xBFE3FF, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fall_line", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [14, 24], size: [0.2, 0.05],
                    color: 0x5B7FA6, alpha: [0.4, 0], light: "world", maxParticles: 34
                },
                {
                    name: "fall_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.22, 0.06],
                    color: 0x5B7FA6, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_quickguard", 1, QuickGuardDefinition);
