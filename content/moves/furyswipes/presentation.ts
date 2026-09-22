/**
 * 乱抓 / furyswipes 的客户端表现。
 *
 * 一句话：施法者贴着对手左右游走，每换一步就有一道近白的爪痕从新的角度划过目标身前的一片扇面，命中处炸开
 *   一撮被抓起的碎屑；抓空时只有一道淡淡的空痕划过空气然后散掉。
 * 色相家族：爪痕近白（0xF2F6FF）与极浅的暖红（0xE89090）做刃与命中强调，尘土灰褐（0xB8A67E）只做余韵；
 *   第二色相不进入，画面是同一族白。
 * 拍子：起 raise（亮爪）→ 抓 cut（每道一片扇面）→ 中 hit / 空 miss（命中或落空）→ 收 settle（余尘落定）。
 * 范围：cut 用 `data.reach` 当扇面长度、`data.span` 当张角，`orient: "direction"` 让扇面朝本次出爪方向；
 *   画面里的扇面就是判定的扇面，玩家能看出站哪会被抓。
 * 运动：每道从施法者身前贴着目标铺开，方向由 `data.direction` 给出；落空那道只在空气里划一道就淡出。
 * 数：`data.dust`（物攻派生）绑定命中与余尘的发射量，`data.intensity`（每道威力派生）抬高亮度与尺寸，
 *   `data.index`／`data.cuts` 让同一趟里越到后面的爪痕略强。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FuryswipesDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 9 },
            emitters: [
                {
                    name: "claw", bind: "source", offset: [0, 0.55, -0.2], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: 3, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.02, 0.1], spread: 40, drag: 0.9,
                    lifetime: [6, 11], size: [0.18, 0.04],
                    color: 0xF2F6FF, alpha: [0.35, 0], light: "full", bloom: 0.15, maxParticles: 230
                }
            ]
        },
        cut: {
            duration: 18,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "arc", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 38,
                    burst: { count: { data: "index", fallback: 1 }, repeats: 3, interval: 3 },
                    shape: { kind: "cone_volume", radius: 0.45, length: { data: "reach", fallback: 2.4 }, angleDegrees: { data: "span", fallback: 130 } },
                    direction: "shape", speed: [0.08, 0.3], spread: 14, spin: 10,
                    lifetime: [6, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF2F6FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 260
                },
                {
                    name: "wind", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, shape: { kind: "cone_volume", radius: 0.5, length: { data: "reach", fallback: 2.4 }, angleDegrees: { data: "span", fallback: 130 } },
                    direction: "shape", speed: [0.05, 0.2], spread: 24, gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.35, 0], light: "world", maxParticles: 220
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "mark", bind: "target", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "dust", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.06, 0.26], spread: 26,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE89090, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 240
                },
                {
                    name: "impact", bind: "target", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.42, 0.1],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.1, 0.34], spread: 30, gravity: 0.06, drag: 0.9,
                    lifetime: [9, 15], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.5, 0], light: "world", maxParticles: 200
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "empty", bind: "source", offset: [0, 0.5, -0.1], height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 2, at: 0 },
                    shape: { kind: "cone_volume", radius: 0.35, length: { data: "reach", fallback: 2.4 }, angleDegrees: { data: "span", fallback: 130 } },
                    direction: "shape", speed: [0.04, 0.16], spread: 20, drag: 0.9,
                    lifetime: [7, 12], size: [0.22, 0.06],
                    color: 0xF2F6FF, alpha: [0.3, 0], light: "full", maxParticles: 60
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
                    shape: { kind: "ring", radius: 1.1, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 12], size: [0.16, 0.05],
                    color: 0xF2F6FF, alpha: [0.32, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_furyswipes", 1, FuryswipesDefinition);
