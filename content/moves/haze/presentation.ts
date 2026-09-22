/**
 * 黑雾 / haze 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者低头把浊气拢在脚边，接着一片墨色雾墙从身上整圈漫开；被雾扫过的人身上腾起一蓬黑烟、
 * 亮一下冷色微光——那一下就是它的能力等级归零。
 * 色相家族：墨黑与灰蓝（obscuringsmoke / smokeorb / smoke）为主体，冷青白（glowingsparkle）只做少量高光；
 * 一个色相家族，没有第二个色相。
 * 拍子：起（gather 拢气）→ 击（bloom 雾墙铺开）→ 收（swept 逐处抹平、fade 余雾散去）。
 * 范围：bloom 与 fade 的雾圈绑 `point`，形状半径读服务端 `data.radius`（真实波及半径），玩家看到的圈就是会被抹到的地。
 * 运动：起手浊气向中心收拢；铺开时雾墙向外低速翻滚、贴地铺成一圈；扫过目标时从目标身上向上腾起。
 * 数：发射量按 `data.density`（特防派生）派生，被抹目标那一下的烟量按 `data.motes`（抹掉的级数派生）派生。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HazeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 18,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "gather_smoke", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.75 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [12, 22], size: [0.32, 0.06],
                    color: 0x2E2E38, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "gather_glint", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xAFC4E8, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        bloom: {
            duration: 34,
            exit: { stop: 14, drain: 26 },
            emitters: [
                {
                    name: "bloom_wall", bind: "point", offset: [0, 0.35, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "density", fallback: 24 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.02, 0.09], spread: 14,
                    lifetime: [14, 26], size: [0.45, 0.1], sizeMode: "linear",
                    color: 0x23232C, alpha: [0.5, 0], light: "world", maxParticles: 220
                },
                {
                    name: "bloom_carpet", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "density", fallback: 24 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.85 },
                    direction: "outward", speed: [0.01, 0.05], spread: 10,
                    gravity: 0.005, drag: 0.94,
                    lifetime: [18, 30], size: [0.5, 0.12], sizeMode: "linear",
                    color: 0x3A3A46, alpha: [0.28, 0], light: "world", maxParticles: 200
                },
                {
                    name: "bloom_core", bind: "source", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [12, 22], size: [0.6, 0.15], sizeMode: "index",
                    color: 0x2A2A34, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "bloom_glint", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "up", speed: [0.005, 0.03], spread: 8,
                    lifetime: [14, 24], size: [0.1, 0.01],
                    color: 0xAFC4E8, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        swept: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "swept_puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "motes", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.03, 0.16], spread: 14,
                    lifetime: [12, 22], size: [0.3, 0.08],
                    color: 0x2E2E38, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "swept_ring", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.35, 0.6], sizeMode: "linear",
                    color: 0xAFC4E8, alpha: [0.45, 0], light: "full", maxParticles: 8
                }
            ]
        },
        fade: {
            duration: 40,
            exit: { stop: 16, drain: 30 },
            emitters: [
                {
                    name: "fade_mist", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.9 },
                    direction: "up", speed: [0.005, 0.03], spread: 8,
                    gravity: -0.004, drag: 0.95,
                    lifetime: [22, 36], size: [0.6, 0.15], sizeMode: "linear",
                    color: 0x2A2A34, alpha: [0.18, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_haze", 1, HazeDefinition);
