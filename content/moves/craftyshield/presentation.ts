/**
 * 戏法防守 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抬手勾勒，一片紫罗兰的符阵在身前张开、悬着一圈法印；对手一道变化招式递过来，
 *   符阵上跳出几枚法印把它整条拨开；法印用尽，整片符阵安静收拢。
 *
 * 色相家族：戏法紫（0xC9A0E8）为主体，近白（0xF0E4FF）做高光与拨挡闪光，深紫（0x6E4A86）做收阵与余韵；没有第二个色相。
 * 层次：勾勒（起）／符阵环与法印（击）／悬空的符阵（持续）／拨开一条变化招式（事件）／收阵（收）。
 * 起击收：trace（起）→ raise（击）→ hold（持续）→ deflect／collapse（事件）→ fall（收）。
 * 范围：符阵环绑落点、fit none，半径按 `data.scale`（实际遮蔽半径 / 3.2）推出，画出来的圈就是符阵真罩到的范围。
 * 运动：起手符线向内勾；张开时符环向外推远、法印绕身公转；拨挡时法印沿来袭方向弹开；收阵时向下沉散。
 * 数：法印量绑 `data.glyphs`（特防派生），拨挡闪光量绑拨挡时的 `data.glyphs`，尺寸与范围绑 `data.scale`（体型与配置派生）。
 * 持续状态：持续层贴地、低密度，让出目标本体视线。
 */
const CraftyShieldDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        trace: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "trace_glyph", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 9, shape: { kind: "sphere", radius: 1.0 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 12,
                    lifetime: [10, 16], size: [0.2, 0.05],
                    color: 0xF0E4FF, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 34
                }
            ]
        },
        raise: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "raise_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.4, 0.16],
                    color: 0xC9A0E8, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "raise_glyph", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "glyphs", fallback: 22 } },
                    shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.15], drag: 0.9, spin: 16,
                    lifetime: [18, 30], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xF0E4FF, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "raise_dust", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x6E4A86, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 28 },
            emitters: [
                {
                    name: "hold_glyph", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: 3, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.006, 0.03],
                    lifetime: [16, 26], size: [0.32, 0.1], sizeMode: "sin",
                    color: 0xC9A0E8, alpha: [0.26, 0], alphaMode: "sin", light: "world", maxParticles: 18
                },
                {
                    name: "hold_mote", bind: "target", fit: "body", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 2, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [16, 26], size: [0.09, 0.02],
                    color: 0xF0E4FF, alpha: [0.22, 0], light: "world", maxParticles: 14
                }
            ]
        },
        deflect: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "deflect_scatter", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "glyphs", fallback: 22 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "away", speed: [0.1, 0.3], drag: 0.88, spin: 20,
                    lifetime: [8, 16], size: [0.24, 0.05],
                    color: 0xF0E4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "deflect_flash", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.13, 0.02],
                    color: 0xC9A0E8, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        collapse: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "collapse_ring", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.9,
                    lifetime: [12, 20], size: [0.3, 0.08],
                    color: 0x6E4A86, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fall_glyph", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.03, drag: 0.9,
                    lifetime: [18, 30], size: [0.3, 0.08],
                    color: 0x6E4A86, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fall_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.07, 0.02],
                    color: 0x6E4A86, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_craftyshield", 1, CraftyShieldDefinition);
