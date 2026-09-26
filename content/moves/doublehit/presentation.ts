/**
 * 二连击 / doublehit 的客户端表现。
 *
 * 一句话：施法者原地转身，尾巴先朝一侧扫出一道贴地的浅弧，紧接反向回扫；两次都沿地面带起一条尘土带，
 *   扫中的目标被推着走，回头那一下多一圈强调。
 * 色相家族：尾迹浅褐（0xD8C9A6、0xB8A67E）做尘与尾影，白（0xF2ECDD）只给命中那一抹；第二扫略偏暖（0xE6D3A6）。
 * 拍子：起 raise（甩尾起势）→ 一 sweep1（向一侧扫）→ 二 sweep2（反向回扫）→ 中 hit1/hit2（命中扬尘）→ 收 settle。
 * 范围：sweep1/sweep2 的水平扇面用 `data.reach` 当半径、`data.fan` 当半个扫面的张角，判定与画面共用同一 `data.direction`；
 *   第一扫的 `data.direction` 偏向一侧、第二扫偏向另一侧，两扫合起来就是尾巴抡过的那一整片。
 * 运动：两扫都从施法者身前贴着地面铺开，沿各自的 `data.direction` 铺出；命中侧的 `data.side`（1/-1）区分左/右尾。
 * 数：`data.dust`（物攻派生）绑定扬尘量，`data.intensity`（每扫威力派生）抬高亮度，`data.arc` 区分回扫/直扫。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DoublehitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.1, -0.25], height: 0.3, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 4, interval: 2, repeats: 3 },
                    shape: { kind: "box", size: [0.5, 0.1, 0.5] },
                    direction: "outward", speed: [0.03, 0.12], spread: 20, gravity: 0.04, drag: 0.9,
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0xD8C9A6, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        sweep1: {
            duration: 22,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 44, shape: { kind: "sector", radius: { data: "reach", fallback: 3.4 }, angleDegrees: { data: "fan", fallback: 75 } },
                    direction: "shape", speed: [0.08, 0.3], spread: 12, spin: 8,
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF2ECDD, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                { orient: "heading",
                    name: "dust", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 34, shape: { kind: "sector", radius: { data: "reach", fallback: 3.4 }, angleDegrees: { data: "fan", fallback: 75 } },
                    direction: "shape", speed: [0.05, 0.22], spread: 26, gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.11, 0.02],
                    color: 0xB8A67E, alpha: [0.45, 0], light: "world", maxParticles: 80
                }
            ]
        },
        sweep2: {
            duration: 22,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 46, shape: { kind: "sector", radius: { data: "reach", fallback: 3.4 }, angleDegrees: { data: "fan", fallback: 75 } },
                    direction: "shape", speed: [0.1, 0.34], spread: 11, spin: -8,
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xE6D3A6, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                { orient: "heading",
                    name: "dust", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 36, shape: { kind: "sector", radius: { data: "reach", fallback: 3.4 }, angleDegrees: { data: "fan", fallback: 75 } },
                    direction: "shape", speed: [0.06, 0.24], spread: 26, gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.11, 0.02],
                    color: 0xB8A67E, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hit1: {
            duration: 18,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "dust", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.06, 0.26], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        hit2: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.08, 0.32], spread: 24,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "trail", bind: "target", offset: [0, 0.3, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.1, 0.36], spread: 28, gravity: 0.05, drag: 0.9,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0xB8A67E, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss1: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                { orient: "heading",
                    name: "empty", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 10 } },
                    shape: { kind: "sector", radius: { data: "reach", fallback: 3.4 }, angleDegrees: { data: "fan", fallback: 75 } },
                    direction: "shape", speed: [0.04, 0.16], spread: 20, gravity: 0.05, drag: 0.9,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0xB8A67E, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        settle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 3.4 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [7, 13], size: [0.18, 0.05],
                    color: 0xD8C9A6, alpha: [0.4, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doublehit", 1, DoublehitDefinition);
