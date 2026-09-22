/**
 * 无理取闹 / torment 的客户端表现。
 *
 * 一句话：一句讥讽从施法者嘴边冲出去，在目标身上缠成一圈来回打转的问号与黄铜碎点；圈越密越说明它被钉得越狠，
 *   目标要是想再出上一手，就把符环猛地收紧、弹回它自己。
 * 色相家族：暗紫 0x8E5BD0（烦躁本身）与讥讽黄 0xE8C85A（取笑的刺）；中性灰只用在落空的烟。
 * 拍子：windup 起（0–14t 指尖符环）→ cast 击（0–18t 沿直线冲出）→ lock 落（0–30t）→ linger 收（每 20t 续）。
 * 范围：cast 的问号沿 path（施法者→目标）连成一线，线搭到谁就画到谁；lock/linger 绑 target，随目标移动。
 * 运动：符环绕身慢转、问号从脚下向上飘；reject 时全部向内心收。
 * 数：服务端把 irritation（特攻派生）交给符环与碎点数，linger 的 motes 按标记剩余比例衰减，让玩家读出现在钉到哪。
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
                    rate: { data: "motes", fallback: 4 },
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
