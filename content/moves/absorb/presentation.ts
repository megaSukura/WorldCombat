/**
 * 吸取 / absorb 的客户端表现。
 *
 * 一句话：身侧收拢一圈青绿光点 → 一根嫩藤从身上探出、直直点中对手 → 点中处炸开一小圈草屑，一串汁点沿
 * 「对手→自身」抽回身上。没有东西飞出去：藤的两端始终是施法者与命中点。
 *
 * 色相家族：草绿（0x7CB342／0x5C9E2E）与嫩白（0xDCE775），近白只给命中核心；无第二色相。
 * 拍子：起 windup（聚点）→ 抽 reach（探藤）→ 汲 sip（命中峰值＋回流）／空 miss（藤尖空甩）。
 * 范围：reach 的线长读 `data.span`（实际藤长），方向读 `data.direction`；藤尖到哪，玩家就看得见哪会被点到。
 * 运动：reach 沿 direction 由内向外，sip 的线发射器 orient=direction 沿「目标→自身」把汁点抽回来，
 *   path 发射器把目标与施法者连成一条实线，读得出它在抽谁。
 * 数：`data.motes`（威力与抽取比例换算）决定探藤与回流的密度，`data.scale`（藤尖判定 / 0.36）放大光点尺寸。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const AbsorbDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather_leaves", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.08], spin: 30,
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0x7CB342, alpha: [0.6, 0], light: "world", maxParticles: 34
                },
                {
                    name: "gather_glow", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.07, 0.01],
                    color: 0xDCE775, alpha: [0.8, 0], light: "full", maxParticles: 26
                }
            ]
        },
        reach: {
            duration: 18,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "vine", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    shape: { kind: "line", length: { data: "span", fallback: 4 } },
                    rate: { data: "motes", fallback: 10 },
                    direction: "shape", speed: [0.02, 0.09], spread: 12, spin: 40,
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x7CB342, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "vine_tip", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 3, at: 4 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.0, 0.04],
                    lifetime: [6, 12], size: [0.16, 0.02],
                    color: 0xDCE775, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 12
                }
            ]
        },
        sip: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.01, 0.05], spread: 14,
                    lifetime: [8, 16], size: [0.10, 0.02], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 4 } },
                    rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.10, 0.30], spread: 10,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0xDCE775, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 70
                },
                {
                    name: "bite", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: 8, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "flakes", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x7CB342, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "line", length: 0.5 },
                    direction: "shape", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xB9C48A, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_absorb", 1, AbsorbDefinition);
