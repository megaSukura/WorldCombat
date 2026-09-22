/**
 * 长嚎 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者仰头，一圈暖橘的声浪从喉咙里荡开、贴着地面铺成一圈圈扩大的音环；被吼到的伙伴身上升起一道道
 *   向上的斗志光点，攻击被抬起来；嗥声散去时斗志光点缓缓落下。
 *
 * 色相家族：号角橙（0xE8A54B）为主体，亮金（0xFFE0A0）做高光与斗志，暗棕（0x8A5A2B）做余韵；没有第二个色相。
 * 层次：聚声（起）／音环与升起的斗志（击）／贴身的斗志光环（持续）／落声（收）。
 * 起击收：draw（起）→ howl（击）→ rally（持续）→ fade（收）。
 * 范围：音环绑落点、fit none，半径按 `data.scale`（实际声浪半径 / 4）推出，画出来的圈就是嗥声真吼到的范围。
 * 运动：起手声点向喉部收；吼出时音环一圈圈向外推、斗志光点向上涌；持续期贴身缓缓上浮；收声时向下沉散。
 * 数：声点量绑 `data.motes`（物攻与等级派生），斗志等级绑 `data.levels`（配置派生），尺寸与范围绑 `data.scale`（体型与配置派生）。
 * 持续状态：持续层贴地、低密度，让出目标本体视线。
 */
const HowlDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "draw_breath", bind: "source", fit: "body", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 10, shape: { kind: "sphere", radius: 0.8 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 10,
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xFFE0A0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 34
                }
            ]
        },
        howl: {
            duration: 40,
            exit: { stop: 14, drain: 24 },
            emitters: [
                {
                    name: "howl_ring", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [16, 26], size: [0.42, 0.2],
                    color: 0xE8A54B, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "howl_boost", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "up", speed: [0.05, 0.18], drag: 0.9, spin: 14,
                    lifetime: [16, 28], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xFFE0A0, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "howl_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.01, drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.02],
                    color: 0x8A5A2B, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        },
        rally: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "rally_spirit", bind: "target", fit: "body", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 26], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xE8A54B, alpha: [0.36, 0], alphaMode: "sin", light: "full", maxParticles: 20
                },
                {
                    name: "rally_glint", bind: "target", fit: "body", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 2, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 28], size: [0.09, 0.02],
                    color: 0xFFE0A0, alpha: [0.24, 0], light: "full", maxParticles: 14
                }
            ]
        },
        fade: {
            duration: 28,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fade_spirit", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.03, drag: 0.92,
                    lifetime: [18, 30], size: [0.16, 0.04],
                    color: 0x8A5A2B, alpha: [0.4, 0], light: "world", maxParticles: 36
                },
                {
                    name: "fade_ring", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.26, 0.08],
                    color: 0x8A5A2B, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_howl", 1, HowlDefinition);
