/**
 * 抢先一步 / mefirst 的客户端表现。
 *
 * 一句话：施法者压低身位，脚下先亮起一圈抢在对手之前的光痕；真正抢到时，对手刚要出的那一下被沿来路夺过来、
 *   先在施法者手里打出，留下一圈被夺走的余波；没抢到就只剩一撮发闷的暗光。
 * 色相家族：迅捷橙 0xFFB347 与白光（抢先的速度感）；中性深灰只用在抢空。
 * 拍子：read 起（0–14t 光痕收拢）→ take 击（0–12t 夺出，收 12–26t）／miss 空（0–20t 暗光）。
 * 范围：take 的夺招线沿 path（施法者→目标）连起；read/miss 绑施法者。
 * 运动：read 时速度线向脚下收拢；take 时夺招线由目标射向施法者再折出。
 * 数：服务端把 sparks（特攻派生）交给光痕数量，surge（速度派生的夺招倍率）交给夺招线的亮度与闪光的尺寸。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const mefirstDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        native_contact: { duration: 5, exit: { stop: 2, drain: 3 }, emitters: [{ name: "shadow_palm", bind: "source", height: 0.5, orient: "direction",
            particle: "world_combat_core:cobblemon/generic/hollowfist", burst: { count: 1 }, shape: { kind: "point" },
            direction: [0,0,1], speed: .5, lifetime: 3, size: [.4,.15], color: 0xFFB347, alpha: [.85,0], light: "full" }] },
        native_flight: { exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_flight", bind: "projectile",
            particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle", rate: 14, trail: { minDistance: .2 },
            shape: { kind: "point" }, speed: 0, lifetime: 6, size: [.06,.02], color: 0xFFB347, alpha: [.6,0], light: "world" }] },
        native_hit: { duration: 10, exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_hit", bind: "point",
            particle: "world_combat_core:cobblemon/generic/hit_yellow", burst: { count: 1 }, shape: { kind: "point" },
            speed: 0, lifetime: 5, size: [.3,.05], color: 0xFFB347, alpha: [.9,0], light: "full" }] },
        native_miss: { duration: 8, exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_miss", bind: "point",
            particle: "world_combat_core:cobblemon/generic/tinydust", burst: { count: 3 }, shape: { kind: "sphere", radius: .12 },
            speed: .02, lifetime: 5, size: [.06,.02], color: 0xFFB347, alpha: [.4,0], light: "world" }] },
        read: {
            duration: 14,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "read_lines", bind: "source", height: 0,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: { data: "sparks", fallback: 6 }, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.25, 0.5], spread: 4,
                    lifetime: [8, 14], size: [0.2, 0.03],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "read_motes", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "sparks", fallback: 6 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.01],
                    color: 0xFFE3B0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        take: {
            duration: 26,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "take_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: { data: "sparks", fallback: 6 }, trail: { minDistance: 0.2 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.3, 0.6],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xFFD9A0, alpha: [0.85, 0], light: "full", bloom: { data: "surge", fallback: 0.4 }, maxParticles: 90
                },
                {
                    name: "take_flash", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "sparks", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.18, 0.4], spread: 16,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xFFF1D8, alpha: [0.95, 0], light: "full", bloom: { data: "surge", fallback: 0.5 }, maxParticles: 70
                },
                {
                    name: "take_impact", bind: "target", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 2 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 16], size: [0.38, 0.1],
                    color: 0xFFE3B0, alpha: [0.85, 0], light: "full", maxParticles: 8
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "miss_dim", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x8A8378, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mefirst", 1, mefirstDefinition);
