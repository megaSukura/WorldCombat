/**
 * 镜面属性 / reflecttype 的客户端表现。
 *
 * 一句话：施法者面前拼起一面镜子、把对手框进镜框 → 镜面沿两人连线滑到对手身上扫过一遍、把它的属性取下来 →
 *         属性贴回施法者，身上炸开一片该属性色的光点与光晕。
 * 色相家族：镜面紫 0xD98CE8 作镜框与扫过层，属性色只在落成的光晕与光点上出现，是唯一的饱和色。
 * 拍子：起 raise 0–14t ／ 读 read（滑到目标）／ 落 settle 44t ／ 空 fizzle 22t。
 * 范围：read 的镜框与 settle 的光环按 `fit: body` 与 `data.scale` 铺开，画出这一照覆盖到整个身形。
 * 运动：镜面从施法者滑向对手、扫过后沿连线回到施法者，落定时光点向外炸开再向上收束。
 * 数：镜面块数绑 `data.facets`（特防派生），反光点数绑 `data.glints`（特攻派生），
 *   落成强弱绑 `data.intensity`（维持时长派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const ReflecttypeSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "raise_panes", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "facets", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "arc", radius: 0.5, arcDegrees: 160 },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.3, 0.16],
                    color: 0xD98CE8, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "raise_motes", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "facets", fallback: 6 },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFE9F8, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 70
                }
            ]
        },
        read: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "read_frame", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "facets", fallback: 6 }, interval: 2, repeats: 2 },
                    shape: { kind: "box", size: [0.9, 1.5, 0.9] },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.34, 0.14], sizeMode: "index",
                    color: 0xD98CE8, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "read_path", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    shape: { kind: "polyline" },
                    rate: 10, direction: "shape", speed: [0.06, 0.18], spread: 10,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFE9F8, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        settle: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "settle_halo", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: { data: "facets", fallback: 6 } },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.1, 0.3], spread: 6,
                    lifetime: [14, 24], size: [0.34, 0.8], sizeMode: "index",
                    color: { data: "color", fallback: 0xD98CE8 }, alpha: [0.6, 0], light: "full", maxParticles: 120
                },
                {
                    name: "settle_glints", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "glints", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.12, 0.34], spread: 14, drag: 0.92,
                    lifetime: [12, 22], size: [0.12, 0.02], sizeMode: "index",
                    color: { data: "color", fallback: 0xD98CE8 }, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 200
                },
                {
                    name: "settle_core", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 6, at: 2 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [8, 13], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFE9F8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 40
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

WorldCombatParticles.scene("world_combat:move_reflecttype", 1, ReflecttypeSceneDefinition);
