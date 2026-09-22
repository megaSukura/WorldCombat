/**
 * 蹭蹭脸颊 / nuzzle 的客户端表现。
 *
 * 一句话：施法者蹲下、脸颊噼啪攒起一串小电点，随后朝对手扑过去、拖一条短短的电尾，蹭上的一刻在对方身上
 *   炸开一小簇电花与一圈火花；扑空只留一下落空的电点。
 * 色相家族：电黄（0xFFE96A）与暖白（0xFFF6C8）为主，浅青绿（0xC8F0A0）只做地面环的细节。整体偏暖、偏小，
 *   与同族那些大电击区分开——它是「小只动物蹭一下」的量级。
 * 拍子：起（cheek 攒电）→ 扑（lunge 电尾）→ 蹭（touch 缠身）→ 收（whiff 落空 / 各层淡出）。
 * 范围：touch 绑在目标身上，形状按身体缩放；接触半径由机制决定，画面就是贴在它身上的那簇电花。
 * 运动：没有飞行物——攒电在原地、扑击是施法者自己的位移、命中贴脸炸开，一眼看出这是接触招。
 * 数：`data.sparks`（由威力派生）绑定缠身火花数，`data.arcs`（由特攻派生）绑定攒电脉冲与环的条数，
 *   `data.intensity`（由威力派生）抬高亮度，`data.scale` 跟随接触半径缩放尺寸。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const NuzzleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        cheek: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "cheek", bind: "source", offset: [0, 0.15, 0.3], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "arcs", fallback: 4 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08], spread: 20,
                    lifetime: [4, 9], size: [0.07, 0.01],
                    color: 0xFFF6C8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "static", bind: "source", offset: [0, 0.15, 0.3], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 12, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [4, 9], size: [0.07, 0.01],
                    color: 0xFFE96A, alpha: [0.75, 0], light: "full", maxParticles: 24
                }
            ]
        },
        lunge: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "pounce", bind: "source", height: 0.2, trail: { minDistance: 0.14 },
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 60, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xFFE96A, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0x9C8455, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        touch: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.22], spread: 18,
                    lifetime: [5, 11], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "cling", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "sparks", fallback: 10 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "arcs", fallback: 4 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [9, 16], size: [0.18, 0.07],
                    color: 0xC8F0A0, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.06, 0.01],
                    color: 0xFFE96A, alpha: [0.55, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nuzzle", 1, NuzzleDefinition);
