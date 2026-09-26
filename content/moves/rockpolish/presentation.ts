/**
 * 岩石打磨 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者贴着地面一圈圈蹭，石粉与火花往外溅；蹭够了，一圈亮痕在地面推开、身上泛出光面，
 *   光面在窗口里低密度地闪，失亮时化作一撮灰。
 *
 * 色相家族：暖琥珀（0xE8B87A）为主体，亮黄白（0xFFD98A／0xFFEFC0）只做火花与光面的强调，灰褐（0xB9A489）作石尘。
 * 层次：起磨的刮痕与火花（起）／地面亮环、火花爆与石粉团（击）／身上光面（收）／失亮的灰（末）。
 * 起击收：grind（起磨）→ flash（磨亮）→ shine（光面）→ dull（失亮）。
 * 范围：起磨碎屑绑脚点，半径按身体打磨的表现尺度展开；持续亮痕跟随真实身体移动。
 * 运动：火花向外飞、受重力下落；石粉贴地扩散；光面贴在身上缓缓转。
 * 数：火花量绑 `data.sparks`（物攻派生），石粉量绑 `data.dust`（体重派生），`data.scale` 同时放大整片半径与粒子尺寸。
 */
const RockPolishDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        grind: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "grind_scratches", bind: "source", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    rate: 10, shape: { kind: "circle", radius: 0.5 },
                    direction: "shape", speed: [0.02, 0.08], spin: 90,
                    lifetime: [6, 12], size: [0.3, 0.12],
                    color: 0xE8B87A, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "grind_sparks", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "circle", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.06, drag: 0.9, spin: 60,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFE0A0, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "grind_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "circle", radius: 0.8 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xB9A489, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        flash: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "burst_sparks", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sparks", fallback: 20 }, interval: 2, repeats: 3 },
                    shape: { kind: "circle", radius: 1.2 },
                    direction: "outward", speed: [0.08, 0.3], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFD98A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 140
                },
                {
                    name: "patch_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.4, 0.72], sizeMode: "index",
                    color: 0xE8B87A, alpha: [0.65, 0], light: "full", maxParticles: 40
                },
                {
                    name: "dust_cloud", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "circle", radius: 1.0 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [16, 28], size: [0.28, 0.55],
                    color: 0xC9B79A, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        },
        shine: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "shine_glint", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0xFFEFC0, alpha: [0.35, 0], light: "full", maxParticles: 14
                },
                {
                    name: "shine_sheen", bind: "target", height: 0.03, trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 4, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.01, 0.03], spin: 30,
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xE8D8C0, alpha: [0.25, 0], light: "full", maxParticles: 16
                }
            ]
        },
        dull: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "dull_fade", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.07], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x9A8C78, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rockpolish", 1, RockPolishDefinition);
