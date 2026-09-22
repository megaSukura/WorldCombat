/**
 * 虫咬 / bugbite 的客户端表现。
 *
 * 一句话：施法者张开颚、口边聚起虫绿色的光，扑上去一口咬在对手身上（咬开树果时迸出果屑果叶），
 * 接着含在原地咀嚼，绿色的果汁光点向口边收拢，最后顺着喉咙亮起一圈暖绿、把果子的效果吞进身体。
 * 色相家族：虫绿（impact_bug / 果叶）为主，果肉汁水用亮黄绿，近白只在牙口与击点作衬。
 * 拍子：起（rear 张颚）→ 咬（bite 咬合）→ 嚼（chew 咀嚼果屑）→ 得（gain 咽下见效）／空（miss 扑空）。
 * 范围：bite 绑命中点，画出的就是被咬中的位置；chew／gain 绑施法者，读得出它把果子吞进了自己体内。
 * 运动：张颚时绿光向内聚；咬合是短促外爆加果屑外散；咀嚼时果汁光点绕口回旋；咽下是一圈由下向上的暖绿。
 * 数：`data.motes`（物攻派生的果屑数）驱动张颚与咀嚼的粒子量；`data.gain`（回复／能力等级／解异常折算的层数）
 *     驱动咽下那一圈的量；`data.berry`（是否咬到树果）决定咬合是否带果屑层。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BugBiteDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        rear: {
            duration: 22,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "mandible", bind: "source", offset: [0, 0.6, 0.3], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 4, at: 2 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.18, 0.03],
                    color: 0xC8D86A, alpha: [0.9, 0], light: "full", maxParticles: 12
                },
                {
                    name: "sap", bind: "source", offset: [0, 0.6, 0.3], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x9ED47A, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        bite: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "crunch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD8E88A, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 36
                },
                {
                    name: "mark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bite",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: 9, size: [0.34, 0.08],
                    color: 0xB6C84E, alpha: [0.85, 0], light: "full", maxParticles: 3
                },
                {
                    name: "bits", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "bits", fallback: 12 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.03, spin: 12,
                    lifetime: [8, 18], size: [0.1, 0.02],
                    color: 0xA8D050, alpha: [0.9, 0], light: "world", maxParticles: 90
                }
            ]
        },
        chew: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "juice", bind: "source", offset: [0, 0.65, 0.3], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 13], size: [0.07, 0.01],
                    color: 0xBEE060, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "crumbs", bind: "source", offset: [0, 0.55, 0.35], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 4, repeats: 4 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.04, 0.14], gravity: 0.05, spin: 10,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0x9ED47A, alpha: [0.9, 0], light: "world", maxParticles: 90
                }
            ]
        },
        gain: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "swallow", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "gain", fallback: 6 } }, shape: { kind: "cylinder", radius: 0.35, length: 0.9 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xA8E070, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "warm", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.5, 0.18],
                    color: 0xA8E070, alpha: [0.6, 0], light: "full", maxParticles: 4
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "overrun", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0x9BA878, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bugbite", 1, BugBiteDefinition);
