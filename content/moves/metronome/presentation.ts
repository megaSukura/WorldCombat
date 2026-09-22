/**
 * Client definition for Metronome.
 *
 * 一句话：指尖一搓，紫黄两色的不确定光旋绕身体转起来，问号随搅动翻出，最后搅出的招式炸开一下；
 * 光点数量随施法者的特攻（data.hues）增长。
 *
 * 色相家族：紫（0xC8A0FF 的漩涡）与琥珀（0xFFE08A 的光点）为主，白色只出现在落成的一闪；
 * 两个色相在这里表达“搅动”与“结果”两层含义。
 * 拍子：wag 0–34t（起：问号与漩涡由慢到快）→ draw 0–22t（击：白闪，收：彩屑散开）。
 * 贴图与帧尺寸来自 particle_types.txt。
 */
const metronomeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wag: {
            duration: 34,
            exit: { stop: 28, drain: 24 },
            emitters: [
                {
                    name: "wag_swirl", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 16,
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.06, 0.18], spread: 10,
                    lifetime: [14, 22], size: [0.3, 0.08],
                    color: 0xC8A0FF, alpha: [0.6, 0], light: "full", maxParticles: 140
                },
                {
                    name: "wag_marks", bind: "source", offset: [0, 1.15, 0],
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: 1, interval: 8, repeats: 3, at: 2 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "up", speed: [0.03, 0.08],
                    lifetime: [22, 30], size: [0.34, 0.16], sizeMode: "sin",
                    alpha: [0.95, 0], light: "full", maxParticles: 12
                },
                {
                    name: "wag_motes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "hues", fallback: 6 }, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.1, 0.26], spread: 6,
                    lifetime: [10, 16], size: [0.13, 0.02],
                    color: 0xFFE08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "wag_confetti", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    rate: 8,
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [18, 28], size: [0.12, 0.02],
                    alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        draw: {
            duration: 22,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "draw_flash", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "hues", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "shape", speed: [0.2, 0.5], spread: 12,
                    lifetime: [12, 20], size: [0.28, 0.03],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "draw_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.3, 0.5], spread: 2,
                    lifetime: [14, 20], size: [0.3, 0.06],
                    color: 0xC8A0FF, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_metronome", 1, metronomeDefinition);
