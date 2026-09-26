/**
 * 二连踢 / doublekick 的客户端表现。
 *
 * 一句话：施法者单脚站定，第一脚贴地低扫、把对手从地上挑起来，紧接第二脚前踹把目标送出去；两脚各拖一条
 *   贴地的暖色扇面，命中处一记亮白冲击，第一脚多一撮向上飞起的尘。
 * 色相家族：暖琥珀（0xE8B87A、0xC9964F）做脚风与尘土，白（0xFFF4E0）只给命中那一抹；第二脚略更亮。
 * 拍子：起 raise（抬脚）→ 一 hook（低扫）→ 中 hit1（挑人）→ 二 finisher（前踹）→ 中 hit2（踹飞）→ 收 settle。
 * 范围：hook/finisher 的扇面用 `data.reach` 当半径、`data.span` 当张角，`orient: "heading"` 让扇面正对踢击方向；
 *   画面里的扇面就是判定范围。
 * 运动：hook 的脚风贴地低扫并微微上浮（第一脚低向上），hit1 的尘向上走（挑起）；finisher/hit2 沿踢击方向前送（踹飞）。
 * 数：`data.dust`（物攻派生）绑定发射量，`data.intensity`（每脚威力派生）抬高亮度，`data.alternate` 区分两种形态；
 *   hit1 的浮空尘土由 `data.liftParticles` 驱动——连踢式 lift = 0 时该值为 0，未抬起就不画浮空。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DoublekickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "brace", bind: "source", offset: [0, 0.08, 0], height: 0.05, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 14 }, interval: 2, repeats: 2 },
                    shape: { kind: "box", size: [0.5, 0.08, 0.5] }, direction: "outward", speed: [0.03, 0.12], spread: 24,
                    gravity: 0.04, drag: 0.9, lifetime: [7, 13], size: [0.11, 0.02],
                    color: 0xC9964F, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        hook: {
            duration: 20,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "sweep", bind: "point", fit: "world", orient: "heading", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 40, shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, angleDegrees: { data: "span", fallback: 80 } },
                    direction: "shape", speed: [0.06, 0.26], spread: 12, spin: 6,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFF4E0, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 70
                },
                {
                    name: "turf", bind: "point", fit: "world", orient: "heading", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 30, shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, angleDegrees: { data: "span", fallback: 80 } },
                    direction: "shape", speed: [0.04, 0.2], spread: 24, gravity: -0.02, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xC9964F, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        finisher: {
            duration: 20,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "sweep", bind: "point", fit: "world", orient: "heading", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 44, shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, angleDegrees: { data: "span", fallback: 80 } },
                    direction: "shape", speed: [0.08, 0.32], spread: 11, spin: -6,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF4E0, alpha: [0.8, 0], light: "full", bloom: 0.28, maxParticles: 76
                },
                {
                    name: "gust", bind: "point", fit: "world", orient: "heading", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, angleDegrees: { data: "span", fallback: 80 } },
                    direction: "shape", speed: [0.06, 0.26], spread: 20, drag: 0.92,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE8B87A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hit1: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "dust", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "lift", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "liftParticles", fallback: 0 }, at: 1 },
                    shape: { kind: "box", size: [0.5, 0.1, 0.5] }, direction: "up", speed: [0.18, 0.42], spread: 18,
                    gravity: 0.02, drag: 0.94, lifetime: [9, 15], size: [0.09, 0.02],
                    color: 0xC9964F, alpha: [0.6, 0], light: "world", maxParticles: 44
                }
            ]
        },
        hit2: {
            duration: 20,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "dust", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.08, 0.34], spread: 24,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.42, maxParticles: 60
                },
                {
                    name: "launch", bind: "target", offset: [0, 0.35, 0], height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 14 }, at: 1 },
                    shape: { kind: "cylinder", radius: 0.28, length: 0.7 }, direction: "shape", speed: [0.14, 0.4], spread: 20,
                    drag: 0.9, lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8B87A, alpha: [0.55, 0], light: "world", maxParticles: 52
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                { orient: "heading",
                    name: "empty", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 10 }, at: 0 },
                    shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, angleDegrees: { data: "span", fallback: 80 } },
                    direction: "shape", speed: [0.04, 0.14], spread: 20, gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xC9964F, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        settle: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [6, 12], size: [0.14, 0.04],
                    color: 0xC9964F, alpha: [0.35, 0], light: "world", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doublekick", 1, DoublekickDefinition);
