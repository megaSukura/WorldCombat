/**
 * 哈欠 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者嘴边的圈张开、吐出一串发黄的睡泡 → 睡泡沿通视直线摇摇晃晃飘到目标头上 → 目标头顶浮起
 *   一圈逐渐收拢的倒数环与零星的泡（读得出还剩多久）→ 时间到了爆出一片 Z，没落成则泡在空中破掉。
 *
 * 色相家族：暖黄（0xD9C24A）为主体与睡泡，琥珀（0x8A6E1E）只压在环，近白黄（0xFFF3C4）只给高光；单一色相。
 * 拍子：起 windup（张嘴）→ 飘 puff（睡泡过线）→ 倒数 drowsy（头顶环收拢）→ 落 sleep（Z 爆）／空 fizzle。
 * 范围：puff 沿 `data.path`（自身与目标两个真实顶点）连线，线长即真实传播距离；puff 飘到哪就标记到哪。
 * 运动：睡泡沿直线慢慢向前（速度低、有摆动），倒数环持续向内收拢；落睡时 Z 自下而上升起。
 * 数：`data.puffs`（特攻换算）决定飘过去的泡数与落睡 Z 的数量；`data.ringRadius`（剩余睡意比例换算）决定倒数环大小。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const YawnDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "open", bind: "source", height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    rate: 10, shape: { kind: "ring", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.06], spin: 18,
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xD9C24A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 26
                },
                {
                    name: "glow", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 6, shape: { kind: "circle", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFF3C4, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 18
                }
            ]
        },
        puff: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "drift", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    shape: { kind: "polyline" }, rate: { data: "puffs", fallback: 8 },
                    direction: "shape", speed: [0.02, 0.07], spread: 14, spin: 24,
                    lifetime: [10, 18], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0xD9C24A, alpha: [0.75, 0], light: "full", maxParticles: 80
                },
                {
                    name: "arrive", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 6, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        drowsy: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "count_ring", bind: "target", height: 0.52,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 5, shape: { kind: "ring", radius: { data: "ringRadius", fallback: 0.95 } },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [16, 22], size: [0.22, { data: "ringRadius", fallback: 0.95 }],
                    color: 0x8A6E1E, alpha: [0.32, 0], light: "full", maxParticles: 20
                },
                {
                    name: "count_bubble", bind: "target", offset: [0, 0.3, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    rate: 3, shape: { kind: "circle", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xD9C24A, alpha: [0.4, 0], light: "full", maxParticles: 16
                }
            ]
        },
        sleep: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "fall", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: { data: "puffs", fallback: 8 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xD9C24A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "settle", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 18], size: [0.28, 0.1],
                    color: 0x8A6E1E, alpha: [0.55, 0], light: "full", maxParticles: 36
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "pop", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [10, 16], size: [0.14, 0.03],
                    color: 0xD9C24A, alpha: [0.5, 0], light: "world", maxParticles: 22
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "bounce", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.22, 0.06],
                    color: 0xFFF3C4, alpha: [0.55, 0], light: "full", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_yawn", 1, YawnDefinition);
