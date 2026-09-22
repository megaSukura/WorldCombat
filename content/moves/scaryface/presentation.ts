/**
 * 鬼面 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者猛地转过脸，一道尖锐的暗紫视线沿直线钉进对手眼里；对手浑身一僵向后一缩，
 *   头顶慢慢冒出被吓出的暗紫余悸。
 *
 * 色相家族：暗紫（0x5B2A86／0x8A4FD0）为主体，惨白（0xE8E4F0）只做受惊的高光小点。没有第二个色相。
 * 层次：聚神（起手）→ 视线＋眼爆（命中）→ 余悸（恐惧还在，慢慢离场）→ 被挡下的散点（反制读法）。
 * 起击收：windup（聚拢）→ gaze（钉住）→ linger（余悸）。
 * 数：眼爆与视线的粒子数量由服务端 data.shards 派生（随速度下降级数加重）；视线的两端是谁由
 *   data.path 决定，画面画的正是判定里那条 world.clear 比对的同一条线。
 */
const ScaryfaceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "face_gather", bind: "source", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x5B2A86, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "face_frost", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 8, shape: { kind: "ring", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8E4F0, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        gaze: {
            duration: 26,
            emitters: [
                {
                    name: "gaze_line", bind: "path", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 70, shape: { kind: "polyline" },
                    speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0x8A4FD0, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "gaze_core", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "shards", fallback: 26 } }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [9, 16], size: [0.34, 0.08], sizeMode: "index",
                    color: 0x5B2A86, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "gaze_shock", bind: "target", height: 0.92,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xE8E4F0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        blocked: {
            duration: 18,
            emitters: [
                {
                    name: "blocked_scatter", bind: "point", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0x5B2A86, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fizzle: {
            duration: 14,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x5B2A86, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_wisp", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 3, shape: { kind: "circle", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.15, 0.03],
                    color: 0x5B2A86, alpha: [0.25, 0], alphaMode: "sin", light: "world", maxParticles: 14
                },
                {
                    name: "linger_fret", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xE8E4F0, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_scaryface", 1, ScaryfaceDefinition);
