/**
 * 甜甜香气 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者朝选定地点吐出一团琥珀色的甜香，香气落地摊成一片缓慢起伏的云，云里的人被金色香息裹住。
 *
 * 色相家族：蜂蜜金（0xF0C64B／0xE8A93A）为主体，近白奶油（0xFFF3C4）只做高光小点与香丝。没有第二个色相。
 * 层次：香息（起手，施法者嘴边）→ 香弧（喷出）→ 甜云（地面停留，主体）→ 金色香点（细节）→
 *   裹身香环（某人被浸透）→ 淡雾（落空）。
 * 起击收：windup（含香）→ release（吐出）→ cloud（云停在地上）→ scented（有人中招）→ 云按时消散。
 * 数：云的口径读 data.scale（实际半径／参考半径），画的正是机制覆盖的那块区域；某人的裹身香环数量
 *   按 data.rank（浸透等级）派生，越浓裹得越密。
 */
const SweetScentDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        trail: { duration: 12, emitters: [{ name: "scent_steps", bind: "path", fit: "world", particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
            burst: { count: 6 }, shape: { kind: "polyline" }, direction: "up", speed: [.005, .02], lifetime: [8, 12],
            size: [.08, .02], color: 0xEACD91, alpha: [.35, 0], light: "world", maxParticles: 12 }] },
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "aroma_gather", bind: "source", offset: [0, 0.15, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 16, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xF0C64B, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        release: {
            duration: 26,
            emitters: [
                {
                    name: "aroma_arc", bind: "point", height: 0.6, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 18, interval: 2, repeats: 5 }, shape: { kind: "line", length: 1.0 },
                    direction: "shape", speed: [0.12, 0.34], spread: 26, drag: 0.94,
                    lifetime: [12, 22], size: [0.16, 0.06],
                    color: 0xF0C64B, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "aroma_thread", bind: "point", height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 30, shape: { kind: "line", length: 1.2 },
                    direction: "shape", speed: [0.16, 0.4], spread: 18,
                    lifetime: [10, 18], size: [0.11, 0.02],
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        cloud: {
            duration: 40,
            emitters: [
                {
                    name: "cloud_base", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 26, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } }, direction: "up",
                    speed: [0.01, 0.06],
                    lifetime: [16, 28], size: [0.14, 0.03],
                    color: 0xE8A93A, alpha: [0.5, 0], light: "full", maxParticles: 70
                },
                {
                    name: "cloud_haze", bind: "point", height: 0.25,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    rate: 10, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [24, 40], size: [0.3, 0.5],
                    color: 0xF0C64B, alpha: [0.18, 0], light: "world", maxParticles: 30
                },
                {
                    name: "cloud_motes", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 40, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } }, direction: "up",
                    speed: [0.02, 0.09],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        scented: {
            duration: 24,
            emitters: [
                {
                    name: "scent_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "rank", fallback: 1 }, interval: 4, repeats: 6 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [12, 20], size: [0.26, 0.12],
                    color: 0xE8A93A, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "scent_glow", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "rank", fallback: 1 }, interval: 3, repeats: 5 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0xFFF3C4, alpha: [0.75, 0], light: "full", maxParticles: 50
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF0C64B, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sweetscent", 1, SweetScentDefinition);
