/**
 * 乱击 / furyattack 的客户端表现。
 *
 * 一句话：施法者低头压角，身前亮出一条窄走廊，角尖的亮线一刺接一刺顺着走廊戳向目标；命中处炸开角风碎屑，
 *   被顶退的目标沿走廊方向退出去，够不到时只剩一道擦空的角光。
 * 色相家族：角尖暖金（0xFFE9A8）与命中近白（0xFFFFFF）做本体与强调，角风碎屑灰褐（0xB8A67E）只做余韵。
 * 拍子：起 lower（压角亮尖）→ 刺 thrust（走廊与戳出的亮线）→ 中 hit / 空 out（命中或擦空）→ 收 settle。
 * 范围：thrust 用 `data.path`（判定走廊的四个顶点）以 `polygon` 铺出走廊本身——画面里的窄带就是判定的窄带，
 *   玩家能看出站在哪条线上会被刺到。
 * 运动：`pierce` 由施法者出发、`direction: "toward"` 朝目标锚点飞出，读作「角尖一下下戳出去」。
 * 数：`data.sparks`（物攻派生）绑定每一刺与命中的发射量，`data.intensity`（每刺威力派生）抬高亮度，
 *   `data.index` 让同一串里越到后面的一刺略强。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FuryattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        lower: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 9 },
            emitters: [
                {
                    name: "press", bind: "source", offset: [0, 0.35, -0.35], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: 3, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1], spread: 30, drag: 0.9,
                    lifetime: [6, 10], size: [0.14, 0.04],
                    color: 0xFFE9A8, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 200
                }
            ]
        },
        thrust: {
            duration: 16,
            exit: { drain: 9 },
            emitters: [
                {
                    name: "lane", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 30, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.14], spread: 18, drag: 0.9,
                    lifetime: [6, 11], size: [0.2, 0.05],
                    color: 0xFFE9A8, alpha: [0.4, 0], light: "full", bloom: 0.2, maxParticles: 220
                },
                {
                    name: "pierce", bind: "source", offset: [0, 0.35, -0.3], height: 0.35, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: { data: "sparks", fallback: 12 }, at: { data: "index", fallback: 0 } },
                    shape: { kind: "line", length: 0.3 }, direction: "toward", speed: [0.5, 1.1], spread: 8,
                    lifetime: [4, 8], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 240
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.42, 0.1],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.35, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.28 }, direction: "outward", speed: [0.1, 0.32], spread: 30, gravity: 0.06, drag: 0.9,
                    lifetime: [9, 15], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.5, 0], light: "world", maxParticles: 200
                }
            ]
        },
        out: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "empty", bind: "source", offset: [0, 0.4, -0.2], height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 2.6 } }, direction: "toward", speed: [0.04, 0.16], spread: 16, drag: 0.9,
                    lifetime: [7, 12], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.3, 0], light: "world", maxParticles: 80
                }
            ]
        },
        settle: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 1.0, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 12], size: [0.16, 0.05],
                    color: 0xFFE9A8, alpha: [0.3, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_furyattack", 1, FuryattackDefinition);
