/**
 * 超级吸取 / megadrain 的客户端表现。
 *
 * 一句话：身前养起一颗青绿孢荚 → 孢荚拖着一串种屑飞出去 → 撞在对手身上绽成根网并炸开草屑 →
 * 一串汁点沿「对手→自身」被抽回来，按 `data.waves` 一次一次重演。
 *
 * 色相家族：黄绿（0x8CC63F／0x5C9E2E）与嫩白（0xDCE775），近白只给命中核心；无第二色相。
 * 拍子：起 windup（聚荚）→ 飞 fly（拖尾）→ 绽 burst（命中峰值）→ 抽 sap（回流，可重演）→ 空 miss／fizzle。
 * 范围：burst 的环与 sap 的线长都读 `data.scale`（缠吸判定 / 0.5）与 `data.span`（目标到施法者的距离），
 *   画出的就是根网波及与汁流经过的那块地方。
 * 运动：fly 沿 projectile 拖尾；sap 的线发射器 orient=direction 沿「目标→自身」把汁点抽回来，path 把两端连成实线。
 * 数：`data.motes`（孢荚威力与抽取比例换算）决定种屑与汁点密度；`data.wave`／`data.waves` 让抽取进度可读。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MegaDrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "pod_gather", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05], spin: 20,
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0x8CC63F, alpha: [0.7, 0], light: "world", maxParticles: 26
                },
                {
                    name: "pod_core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.0, 0.04],
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0xDCE775, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        fly: {
            duration: 60,
            exit: { stop: 52, drain: 14 },
            emitters: [
                {
                    name: "pod_body", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 26, shape: { kind: "sphere", radius: 0.12 }, spin: 40,
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0x9BD24B, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "pod_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, trail: { minDistance: 0.18 },
                    shape: { kind: "point" }, direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xB9D97A, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "root_net", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "motes", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.05, 0.18], spin: 30,
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "burst_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: 8, size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "burst_flakes", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x8CC63F, alpha: [0.75, 0], light: "world", maxParticles: 80
                }
            ]
        },
        sap: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.01, 0.05], spread: 12,
                    lifetime: [8, 16], size: [0.10, 0.02], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 6 } },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.12, 0.34], spread: 10,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0xDCE775, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "sap_pips", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "wave", fallback: 1 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0xDCE775, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 12
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "miss_burst", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9BD24B, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "fizzle_dust", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xB9D97A, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_megadrain", 1, MegaDrainDefinition);
