/**
 * 双翼 / dualwingbeat 的客户端表现。
 *
 * 一句话：施法者张开双翼先振一下，随后一侧翼顺着俯冲方向拍下去、另一侧翼在上掀时反拍上来；两拍各扫出一道风弧，
 *   拍中时在目标身上炸开一簇羽片与风屑。
 * 色相家族：冷蓝白（0xDCE9F0、0x9FC7DA）做风与羽，近白高光（0xFFFFFF）只给命中那一下；俯冲式在低处补一层尘土色。
 * 拍子：起 raise（张翼拢风）→ 下 downstroke → 上 upstroke → 中 strike1/strike2（羽片炸开）→ 收 settle。
 * 范围：downstroke/upstroke 的水平扇面用 `data.reach` 当半径、`data.span` 当张角，画出来的扇形就是判定罩到的扇区；
 *   翼弧厚度由 `data.radius` 决定。
 * 运动：两拍都沿 `data.direction` 从施法者身前铺出去，第一拍朝下、第二拍朝上（`data.index` 区分），
 *   俯冲式下施法者自己会跟进/退开，`data.dive` 让下拍多一层贴地尘土。
 * 数：`data.feathers`（物攻派生）绑定命中羽片量与风屑量，`data.intensity`（实际威力派生）抬高亮度，
 *   画面里的数量和机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DualwingbeatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "spread", bind: "source", offset: [0, 0.4, 0.2], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 2, interval: 2, repeats: 3 },
                    shape: { kind: "box", size: [0.9, 0.2, 0.2] },
                    direction: "inward", speed: [0.04, 0.16], spread: 14, spin: 8,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0xDCE9F0, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.05, 0], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 9, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 15], size: [0.13, 0.02],
                    color: 0x9FC7DA, alpha: [0.28, 0], light: "world", maxParticles: 20
                }
            ]
        },
        downstroke: {
            duration: 22,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 46, shape: { kind: "sector", radius: { data: "reach", fallback: 5.6 }, angleDegrees: { data: "span", fallback: 78 } },
                    direction: "shape", speed: [0.05, 0.22], spread: 10,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xDCE9F0, alpha: [0.4, 0], light: "full", maxParticles: 110
                },
                {
                    name: "feathers", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: { data: "feathers", fallback: 16 }, at: 0, interval: 1, repeats: 2 },
                    shape: { kind: "sector", radius: { data: "reach", fallback: 5.6 }, angleDegrees: { data: "span", fallback: 78 } },
                    direction: "shape", speed: [0.25, 0.6], spread: 9, spin: 12,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "dust", bind: "point", fit: "none", start: 4,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "box", size: [0.4, 0.1, 0.4] },
                    direction: "outward", speed: [0.05, 0.2], spread: 30, gravity: 0.08, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xBFB49A, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        upstroke: {
            duration: 22,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 50, shape: { kind: "sector", radius: { data: "reach", fallback: 5.6 }, angleDegrees: { data: "span", fallback: 78 } },
                    direction: "shape", speed: [0.06, 0.26], spread: 10,
                    lifetime: [8, 15], size: [0.17, 0.03],
                    color: 0xE6F2FA, alpha: [0.5, 0], light: "full", maxParticles: 120
                },
                { orient: "heading",
                    name: "lift", bind: "point", fit: "world", start: 2,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "feathers", fallback: 16 }, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "sector", radius: { data: "reach", fallback: 5.6 }, angleDegrees: { data: "span", fallback: 78 }, innerRadius: { data: "reach", fallback: 5.6 } },
                    direction: "up", speed: [0.15, 0.45], spread: 12, spin: -10,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        strike1: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "feathers", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "down", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: { data: "feathers", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.12, 0.4], spread: 26,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0x9FC7DA, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        strike2: {
            duration: 22,
            exit: { stop: 6, drain: 13 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "feathers", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.1, 0.36], spread: 26,
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "up", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "feathers", fallback: 14 }, at: 1, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.32 }, direction: "up", speed: [0.15, 0.5], spread: 20, spin: 8,
                    lifetime: [8, 15], size: [0.3, 0.04], sizeMode: "index",
                    color: 0xE6F2FA, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        miss1: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                { orient: "heading",
                    name: "empty", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    burst: { count: { data: "feathers", fallback: 12 } },
                    shape: { kind: "sector", radius: { data: "reach", fallback: 5.6 }, angleDegrees: { data: "span", fallback: 78 } },
                    direction: "shape", speed: [0.05, 0.18], spread: 16, drag: 0.9,
                    lifetime: [9, 16], size: [0.14, 0.02],
                    color: 0x9FC7DA, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        settle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 5.6 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [7, 13], size: [0.18, 0.05],
                    color: 0xDCE9F0, alpha: [0.4, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dualwingbeat", 1, DualwingbeatDefinition);
