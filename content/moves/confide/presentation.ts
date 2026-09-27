/**
 * 密语 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者低头吐出一串低语，短低语沿一条线钻进对手的耳朵后一闪即止；失神窗口里只在受体耳边
 *   浮起微弱的失焦符号，窗口一收就一起消失。声音能绕墙，所以被掩体挡住时不画一条穿墙的实体线。
 *
 * 色相家族：暗紫（0x8A7BD8／0xB9AEE8）为主体，近白紫（0xEDE9FF）只做入耳那一刻的小亮点。
 * 层次：喉间低语（起手）→ 短低语线＋源端与入耳爆点（命中，一闪即止）→ 失神余韵（窗口维持）→
 *   被挡（blocked）→ 淡尘（fizzle）。没有 zzz，避免和真正的睡眠混读。
 * 起击收：windup（聚语）→ leak（一闪）→ linger（窗口维持的耳侧符号）→ blocked／fizzle。
 * 数：低语线密度与入耳爆点读服务端 data.whispers，越强的低语越密；被挡住时 data.path 缺失，
 *   线发射器自然跳过，只保留源端与入耳两端。
 */
const ConfideDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "confide_chamber", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8A7BD8, alpha: [0.5, 0], light: "full", maxParticles: 22
                }
            ]
        },
        leak: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "confide_mouth", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xB9AEE8, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "confide_thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline" }, rate: { data: "whispers", fallback: 20 },
                    direction: "toward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8A7BD8, alpha: [0.7, 0], light: "full", maxParticles: 70
                },
                {
                    name: "confide_entry", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "whispers", fallback: 20 } }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.12], spread: 30,
                    lifetime: [8, 16], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xEDE9FF, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        linger: {
            duration: 0,
            exit: { drain: 30 },
            emitters: [
                {
                    name: "confide_ear", bind: "target", offset: [0, 0.3, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 3, shape: { kind: "circle", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [14, 24], size: [0.12, 0.04], sizeMode: "sin",
                    color: 0xB9AEE8, alpha: [0.35, 0], alphaMode: "sin", light: "world", maxParticles: 14
                },
                {
                    name: "confide_haze", bind: "target", height: 1.02,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [12, 20], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xEDE9FF, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 10
                }
            ]
        },
        blocked: {
            duration: 16,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "confide_blocked", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x8A7BD8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        fizzle: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "confide_fizzle", bind: "point", height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.06], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A7BD8, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_confide", 1, ConfideDefinition);
