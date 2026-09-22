/**
 * 影子分身 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者一阵加速，在身边留下几道与它同步的残影；攻击打上来时，一道残影应声碎裂，
 * 本体只留下一撮尘。
 *
 * 色相家族：冷银灰（0x9AA8C8）为主体，深蓝灰（0x3A4560）压核心，近白只做速度线高光。
 * 层次：加速（起手）、留影（速度线外散＋一圈残影光点）、残影（持续环绕的低密度光点）、
 *       碎影（被打散的一道）、散尽（预算磨完的一下）。
 * 起击收：windup（加速）→ deploy（留影）→ sustain（残影还在）→ shatter／collapse（碎了）。
 * 数：留影光点与残影数量按服务端 data.copies／data.motes 派生；碎影的亮度与尺寸按 data.intensity（剩余预算比例）。
 */
const DoubleteamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            emitters: [
                {
                    name: "wind_speed", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 26, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [6, 12], size: [0.14, 0.04],
                    color: 0xC8D2E8, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "wind_dust", bind: "source", height: 0.05, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0x9AA8C8, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        deploy: {
            duration: 36,
            emitters: [
                {
                    name: "deploy_lines", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.12, 0.34], drag: 0.9,
                    lifetime: [7, 14], size: [0.16, 0.03],
                    color: 0xC8D2E8, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "deploy_burst", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.5, 0.16], sizeMode: "index",
                    color: 0xB8C4DD, alpha: [0.85, 0], light: "full", bloom: 0.25
                },
                {
                    name: "deploy_echo", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "copies", fallback: 3 } }, shape: { kind: "ring", radius: 0.62 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [16, 26], size: [0.26, 0.06], sizeMode: "sin",
                    color: 0x9AA8C8, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "deploy_smoke", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 30], size: [0.24, 0.34],
                    color: 0x3A4560, alpha: [0.22, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sustain: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "sustain_echo", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 5, shape: { kind: "ring", radius: 0.75 },
                    direction: "shape", speed: [0.01, 0.03],
                    velocity: { x: "-0.04*sin(6.2832*t)", z: "0.04*cos(6.2832*t)" },
                    lifetime: [18, 30], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x9AA8C8, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 18
                },
                {
                    name: "sustain_lines", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 4, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xC8D2E8, alpha: [0.3, 0], light: "full", maxParticles: 14
                }
            ]
        },
        shatter: {
            duration: 26,
            emitters: [
                {
                    name: "shatter_core", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 22 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.9,
                    lifetime: [7, 13], size: [{ data: "intensity", fallback: 0.5 }, 0.03],
                    color: 0xD8E0F0, alpha: [0.9, 0], light: "full", bloom: 0.2
                },
                {
                    name: "shatter_orb", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 18], size: [{ data: "intensity", fallback: 0.5 }, 0.04],
                    color: 0x9AA8C8, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "shatter_dust", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x3A4560, alpha: [0.4, 0], light: "world", maxParticles: 34
                }
            ]
        },
        collapse: {
            duration: 30,
            emitters: [
                {
                    name: "collapse_burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.9,
                    lifetime: [10, 18], size: [0.6, 0.1], sizeMode: "index",
                    color: 0xB8C4DD, alpha: [0.85, 0], light: "full", bloom: 0.2
                },
                {
                    name: "collapse_smoke", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [20, 34], size: [0.26, 0.4],
                    color: 0x3A4560, alpha: [0.24, 0], light: "world", maxParticles: 40
                },
                {
                    name: "collapse_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [14, 26], size: [0.07, 0.01],
                    color: 0x9AA8C8, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doubleteam", 1, DoubleteamDefinition);
