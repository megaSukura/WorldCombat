/**
 * 欢乐时光 / happyhour 的客户端表现。
 *
 * 一句话：施法者头顶翻涌起一片金光，随即脚下铺开一圈还在旋转的金色时光——光环持续亮着，环上金屑
 *   缓缓上浮；每当圈里倒下一名对手，落点就炸开一捧金星与真币光斑。
 * 色相家族：暖金（0xFFD24A／0xE0A21C）与乳白（0xFFF3C4）撑起庆典主体，近白高光（0xFFFFFF）只给战果那一炸。
 * 拍子：起（windup 聚金）→ 铺（raise 光环铺满）→ 亮（hold 每 5 刻续一次）→ 收（payout 战果落下）。
 * 范围：raise／hold 的圆环半径＝`data.scale`×定义半径（scale＝实际半径 ÷ 4.5），画出的那圈就是感应圈。
 * 运动：金星从脚下向上翻涌、外圈缓缓环流；战果落在被击败者倒下的一点，向外一炸即收。
 * 数：金光数量由 `data.motes`（等级派生）驱动；`data.purse` 只体现在落下的一捧真币数量。
 * 参照节：视觉语言第一、二、三、四、五、七、九节（持续状态：低密度、让出视线）。
 */
const HappyHourDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "circle", radius: 0.7, thickness: 0, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12], spin: 12,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xFFD24A, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xFFF3C4, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        raise: {
            duration: 44,
            exit: { stop: 22, drain: 20 },
            emitters: [
                {
                    name: "banner", bind: "point", fit: "none", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 4.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 20], size: [0.24, 0.08], sizeMode: "index",
                    color: 0xFFD24A, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "rise", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "circle", radius: 4.5, thickness: 1, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.03, 0.12], spin: 14,
                    lifetime: [12, 24], size: [0.12, 0.02],
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 260
                },
                {
                    name: "coin", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "purse", fallback: 4 }, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: 3.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.02,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0xE0A21C, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "halo", bind: "point", fit: "none", offset: [0, 0.07, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "circle", radius: 4.5, thickness: 1, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.0, 0.03], gravity: -0.004, drag: 0.98,
                    lifetime: [14, 28], size: [0.07, 0.01], alphaMode: "sin",
                    color: 0xFFD24A, alpha: [0.5, 0], light: "full", maxParticles: 180
                },
                {
                    name: "motes", bind: "point", fit: "none", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "circle", radius: 4.5, thickness: 0.9, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 24], size: [0.05, 0.01], alphaMode: "sin",
                    color: 0xFFF3C4, alpha: [0.35, 0], light: "world", maxParticles: 120
                }
            ]
        },
        payout: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.02,
                    lifetime: [10, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFD24A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "coins", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "coins", fallback: 4 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.05, 0.18], gravity: 0.03,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0xFFF3C4, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_happyhour", 1, HappyHourDefinition);
