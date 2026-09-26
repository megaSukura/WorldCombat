/**
 * 描绘 / doodle 的客户端表现。
 *
 * 一句话：施法者把对手的本质描成一张发光的图样 → 图样从脚下摊开成一张覆盖全队的画布，向每一只同伴各连出
 *         一条图样线 → 落到谁身上就在谁身上炸开一枚印章，之后他们身上低密度地闪着这份本质。
 * 色相家族：墨蓝 0x6E7BFF 作主体，纸白 0xEDEFFF 作画布与高光；只在印章上留一点亮青 0xAFE8FF 的边。
 * 拍子：起 sketch 0–14t ／ 击 canvas 34t（画布摊开）与 spread/stamp（连线与盖印）／ 收 glow 低密度续期。
 * 范围：canvas 的地面环半径直接绑 `data.canvas`（本招算出的画幅半径），玩家一眼看出这张画布能盖到哪；
 *   spread 绑 `data.path`（施法者到每只同伴的实体顶点连线），盖到谁一目了然。
 * 运动：图样在对手身上展开、画布从脚下向外摊、图样线飞向同伴、落到身上炸开印章并向上收束。
 * 数：图样数量与印章枚数绑 `data.marks`（特攻派生），覆盖半径绑 `data.canvas`（配置画幅＋体型）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const DoodleSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sketch: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "sketch_canvas", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "box", size: [0.95, 1.55, 0.95] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.42, 0.22],
                    color: 0xEDEFFF, alpha: [0.5, 0], light: "full", maxParticles: 24
                },
                {
                    name: "sketch_ink", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "marks", fallback: 8 },
                    shape: { kind: "box", size: [0.8, 1.35, 0.8] },
                    direction: "outward", speed: [0.03, 0.12], spin: 20,
                    lifetime: [8, 15], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0x6E7BFF, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "sketch_thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: { data: "marks", fallback: 6 }, direction: "shape", speed: [0.03, 0.1], spread: 10,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0x6E7BFF, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        canvas: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "canvas_link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: { data: "marks", fallback: 6 }, direction: "shape", speed: [0.03, 0.1], spread: 10,
                    lifetime: [8, 15], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0x6E7BFF, alpha: [0.55, 0], light: "full", maxParticles: 80
                },
                {
                    name: "canvas_flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 4 } },
                    rate: { data: "marks", fallback: 8 }, direction: "shape", speed: [0.14, 0.4], spread: 8,
                    lifetime: [7, 13], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x6E7BFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "canvas_sheet", bind: "source", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: { data: "marks", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "canvas", fallback: 4.5 } },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [12, 22], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x6E7BFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 160
                },
                {
                    name: "canvas_edge", bind: "source", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "canvas", fallback: 4.5 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [14, 22], size: [0.5, 1.4], sizeMode: "sin",
                    color: 0xEDEFFF, alpha: [0.55, 0], light: "full", maxParticles: 20
                },
                {
                    name: "canvas_dust", bind: "source", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "marks", fallback: 10 }, interval: 2, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "canvas", fallback: 4.5 } },
                    direction: "up", speed: [0.01, 0.05], gravity: 0.02, drag: 0.94,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xEDEFFF, alpha: [0.5, 0], light: "full", maxParticles: 120
                }
            ]
        },
        spread: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "spread_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polyline" },
                    rate: { data: "marks", fallback: 8 }, direction: "shape", speed: [0.08, 0.24], spread: 8,
                    lifetime: [7, 13], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x6E7BFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 140
                },
                {
                    name: "spread_thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: { data: "marks", fallback: 6 }, direction: "shape", speed: [0.04, 0.14], spread: 12,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xAFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        stamp: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "stamp_seal", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "marks", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.07, 0.22], drag: 0.92,
                    lifetime: [9, 16], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x6E7BFF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "stamp_ring", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [12, 20], size: [0.3, 0.8], sizeMode: "sin",
                    color: 0xEDEFFF, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        glow: {
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "glow_sheen", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "marks", fallback: 4 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 24], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xAFE8FF, alpha: [0.38, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "glow_thread", bind: "target", fit: "body", offset: [0, 0.62, 0],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 3, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.003, 0.015],
                    lifetime: [16, 26], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0x6E7BFF, alpha: [0.3, 0], alphaMode: "sin", light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.32],
                    color: 0x8A8172, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doodle", 1, DoodleSceneDefinition);
