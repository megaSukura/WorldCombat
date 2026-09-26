/**
 * 无理取闹 / torment 的客户端表现。
 *
 * 一句话：一句讥讽从施法者嘴边冲出去，在目标身上缠成一圈来回打转的问号与黄铜碎点；此后的烦躁存续期里，
 *   目标头顶悬着一对节拍，一亮一暗地轮流闪——换了一种攻击真正打中时，下一拍翻新；它要是再想连出上一手，
 *   就把这对节拍从中劈断，亮出断拍符号并顶回这一下。
 * 色相家族：暗紫 0x8E5BD0（烦躁本身）与讥讽黄 0xE8C85A（取笑的刺）；断拍时黄光转暗紫；中性灰只用在落空的烟。
 * 拍子：windup 起（0–14t 指尖符环）→ cast 击（0–18t 沿直线冲出）→ lock 落（0–30t）→ linger 收（每 10t 续，节拍翻面）。
 * 范围：cast 的问号沿 path（施法者→目标）连成一线；lock/linger/beat/reject 绑 target，随目标移动，体型越大节拍分得越开。
 * 运动：符环绕身慢转、问号从脚下向上飘；reject 时向内心收并劈下断线。
 * 数：服务端把 irritation（特攻派生）交给符环与碎点数，linger 的 surge 按标记剩余比例衰减；
 *   beat 的亮色按实际攻击类别（近战/远程/魔法/其他）取色，让玩家一眼看出换的是哪一类攻击。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const tormentDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "jeer_mote", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: { data: "irritation", fallback: 8 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.16, 0.02],
                    color: 0xE8C85A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        cast: {
            duration: 18,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "jeer_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: { data: "irritation", fallback: 8 }, trail: { minDistance: 0.25 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.1, 0.22],
                    lifetime: [10, 16], size: [0.14, 0.03],
                    color: 0xE8C85A, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "jeer_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "irritation", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.15, 0.3], spread: 20,
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xFFE79A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        lock: {
            duration: 30,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "itch_ring", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16, interval: 6, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.25, 0.45], spread: 2,
                    lifetime: [14, 20], size: [0.24, 0.05],
                    color: 0x8E5BD0, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "itch_marks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: { data: "irritation", fallback: 8 }, interval: 4, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 24], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xE8C85A, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "itch_floor", bind: "target", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.2, 0.34],
                    lifetime: [12, 18], size: [0.22, 0.05],
                    color: 0x8E5BD0, alpha: [0.4, 0], light: "full", maxParticles: 40
                }
            ]
        },
        linger: {
            duration: 40,
            exit: { stop: 24, drain: 22 },
            emitters: [
                {
                    name: "linger_marks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/question",
                    rate: { data: "irritation", fallback: 4 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [16, 26], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xE8C85A, alpha: [0.65, 0], light: "full", maxParticles: 60
                },
                {
                    name: "linger_ring", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: { data: "surge", fallback: 2 },
                    shape: { kind: "ring", radius: 0.48 },
                    direction: "outward", speed: [0.12, 0.24], spread: 3,
                    lifetime: [12, 20], size: 0.22,
                    color: 0x8E5BD0, alpha: [0.4, 0], light: "full", maxParticles: 40
                },
                // 头顶一对节拍：服务端每 10t 翻面，亮的在左/在右交替，另一侧只剩暗点。
                {
                    name: "beat_left_lit", bind: "target", offset: [-0.24, 0.05, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "litLeft", fallback: 1 }, interval: 10, repeats: 4 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.03],
                    lifetime: [8, 12], size: [0.16, 0.06],
                    color: 0xFFE79A, alpha: [1, 0.15], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "beat_right_lit", bind: "target", offset: [0.24, 0.05, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "litRight", fallback: 0 }, interval: 10, repeats: 4 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.03],
                    lifetime: [8, 12], size: [0.16, 0.06],
                    color: 0xFFE79A, alpha: [1, 0.15], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "beat_left_dim", bind: "target", offset: [-0.24, 0.05, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "dimLeft", fallback: 0 }, interval: 10, repeats: 4 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [8, 12], size: [0.09, 0.04],
                    color: 0x5B4A86, alpha: [0.7, 0.15], light: "world", maxParticles: 8
                },
                {
                    name: "beat_right_dim", bind: "target", offset: [0.24, 0.05, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "dimRight", fallback: 1 }, interval: 10, repeats: 4 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [8, 12], size: [0.09, 0.04],
                    color: 0x5B4A86, alpha: [0.7, 0.15], light: "world", maxParticles: 8
                }
            ]
        },
        // 换了一类攻击真正打中：头顶两拍同时亮起，新一手的类别决定颜色（近战/远程/魔法/其他）。
        beat: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "beat_flip_left", bind: "target", offset: [-0.24, 0.05, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 2 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.05],
                    lifetime: [10, 14], size: [0.18, 0.05],
                    color: { attribute: "kind", colors: { melee: 0xFF9A6B, ranged: 0x9FE8DC, magic: 0xC59BFF, other: 0xFFE79A }, fallback: 0xFFE79A },
                    alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 10
                },
                {
                    name: "beat_flip_right", bind: "target", offset: [0.24, 0.05, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 2 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.05],
                    lifetime: [10, 14], size: [0.18, 0.05],
                    color: { attribute: "kind", colors: { melee: 0xFF9A6B, ranged: 0x9FE8DC, magic: 0xC59BFF, other: 0xFFE79A }, fallback: 0xFFE79A },
                    alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 10
                }
            ]
        },
        reject: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "reject_snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "irritation", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.4, 0.8], spread: 6,
                    lifetime: [8, 14], size: [0.16, 0.01],
                    color: 0xFFE79A, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "reject_flag", bind: "target", offset: [0, 1.1, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/exclamationmark",
                    burst: { count: 3 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 20], size: [0.32, 0.12], sizeMode: "sin",
                    color: 0xE8C85A, alpha: [1, 0], light: "full", maxParticles: 6
                },
                // 断拍：两拍之间劈下一道竖直短线，把这一拍从中截断。
                {
                    name: "reject_break", bind: "target", offset: [0, 0.05, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10 },
                    shape: { kind: "line", length: 0.5 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [8, 13], size: [0.13, 0.02],
                    color: 0x8E5BD0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 14
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.16, 0.28],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "fade_motes", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "irritation", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.1, 0.01],
                    color: 0x8E5BD0, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        subside: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "subside_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.2, 0.4], spread: 2,
                    lifetime: [10, 16], size: [0.22, 0.04],
                    color: 0x8C93A0, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_torment", 1, tormentDefinition);
