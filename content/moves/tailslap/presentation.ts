/**
 * 扫尾拍打 / tailslap 的客户端表现。
 *
 * 一句话：施法者原地旋身，坚硬的尾巴贴着地面扫出一圈圈尾风环，每转一圈那个圈就重新亮起；圈内被拍中的人向外
 *   弹开、被向上挑起，圈的大小就是尾巴真正扫得到的范围。
 * 色相家族：尾风土黄（0xD8C9A6）与暖褐（0xB8A67E）做环与尘，命中近白（0xFFFFFF）只出现在被拍中的那一下。
 * 拍子：起 coil（绷尾扬尘）→ 转 lap / 砸 smash（旋扫整圈或砸尾前向一段）→ 中 hit（命中溅起）→ 收 settle。
 * 范围：lap 每段用 `data.radius` 与 `data.arc`（=90°）画贴地的一段扇面，四段随 `data.direction` 依次转过一圈，
 *   每圈开头另有一圈轮廓标出这一圈；smash 用 `data.arc` 画前向一段——半径与张角就是判定范围。
 * 运动：扇面段随 `data.direction` 依次旋转（不是整圈同时爆），尾风碎屑沿半径甩出；圈一个接一个亮起，
 *   读出「转了几圈、尾巴扫到哪了」。
 * 数：`data.dust`（物攻派生）绑定每一圈的发射量，`data.intensity`（每圈威力派生）抬高亮度，
 *   `data.index`／`data.laps` 让圈越转越明白还差几圈。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const TailslapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "brace", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 5, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16], spread: 24, gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xB8A67E, alpha: [0.45, 0], light: "world", maxParticles: 260
                }
            ]
        },
        lap: {
            duration: 20,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "reach", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "index", fallback: 1 }, repeats: { data: "index", fallback: 1 }, interval: 3, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.24], spread: 8, drag: 0.9,
                    lifetime: [8, 14], size: [0.22, 0.05],
                    color: 0xD8C9A6, alpha: [0.6, 0], light: "world", maxParticles: 260
                },
                {
                    name: "field", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 34, shape: { kind: "sector", radius: { data: "radius", fallback: 3.0 }, angleDegrees: { data: "arc", fallback: 90 } },
                    direction: "shape", speed: [0.06, 0.28], spread: 18, drag: 0.9,
                    lifetime: [6, 11], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xD8C9A6, alpha: [0.24, 0], light: "full", maxParticles: 240
                },
                {
                    name: "tailwind", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 28, shape: { kind: "sector", radius: { data: "radius", fallback: 3.0 }, angleDegrees: { data: "arc", fallback: 90 } },
                    direction: "shape", speed: [0.12, 0.4], spread: 10, gravity: 0.03, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.4, 0], light: "world", maxParticles: 240
                }
            ]
        },
        smash: {
            duration: 20,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "reach", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "index", fallback: 1 }, repeats: { data: "index", fallback: 1 }, interval: 3, at: 0 },
                    shape: { kind: "sector", radius: { data: "radius", fallback: 3.0 }, angleDegrees: { data: "arc", fallback: 200 }, innerRadius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.05, 0.24], spread: 8, drag: 0.9,
                    lifetime: [8, 14], size: [0.22, 0.05],
                    color: 0xD8C9A6, alpha: [0.6, 0], light: "world", maxParticles: 240
                },
                {
                    name: "frontfield", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 36, shape: { kind: "sector", radius: { data: "radius", fallback: 3.0 }, angleDegrees: { data: "arc", fallback: 200 } },
                    direction: "shape", speed: [0.08, 0.3], spread: 14, drag: 0.9,
                    lifetime: [6, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xD8C9A6, alpha: [0.34, 0], light: "full", maxParticles: 260
                },
                {
                    name: "tailwind", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "sector", radius: { data: "radius", fallback: 3.0 }, angleDegrees: { data: "arc", fallback: 200 } },
                    direction: "shape", speed: [0.12, 0.42], spread: 12, gravity: 0.04, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.4, 0], light: "world", maxParticles: 240
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.35, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.44, 0.1],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.3, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.12, 0.4], spread: 30, gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.5, 0], light: "world", maxParticles: 230
                }
            ]
        },
        launch: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "updraft", bind: "target", offset: [0, 0.3, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 10 }, at: 0 },
                    shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] }, direction: "up", speed: [0.1, { data: "lift", fallback: 0.4 }], spread: 12, gravity: 0.02, drag: 0.9,
                    lifetime: [7, 12], size: [0.1, 0.02],
                    color: 0xD8C9A6, alpha: [0.55, 0], light: "world", maxParticles: 120
                }
            ]
        },
        settle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [8, 14], size: [0.18, 0.05],
                    color: 0xB8A67E, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tailslap", 1, TailslapDefinition);
