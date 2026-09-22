/**
 * 终极吸取 / gigadrain 的客户端表现。
 *
 * 一句话：脚下地面裂开、绿光向地心汇聚 → 目标脚下轰然立起一圈吸根（gigadrain_orb 的巨口光球）→
 * 一条粗吸流把目标与施法者连住，随后一拍一拍地在目标身上收束、把养分抽回施法者，直到最后一拍收势。
 *
 * 色相家族：深草绿（0x5C9E2E／0x3E7A1F）与嫩黄绿（0xC7E86A），近白只给每拍命中的核心；无第二色相。
 * 拍子：起 windup（聚光裂地）→ 涌 erupt（立根，一击）→ 束 beam（持续吸流）→ 抽 surge（每拍峰值）→ 空 fizzle。
 * 范围：erupt／surge 的环与光球按 `data.scale`（吸根半径 / 0.9）铺开，画的正是吸根波及的那块地面。
 * 运动：beam／surge 的 path 发射器把目标与施法者连成实线，线发射器 orient=direction 沿「目标→自身」抽汁；
 *   erupt 的根须自脚下向上窜，风压向外。
 * 数：`data.motes`（每拍威力与抽取比例换算）决定光球、汁点与根须的密度；`data.wave`／`data.waves`／`data.last`
 *   让"还剩几拍、这是不是最后一拍"从画面读出。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const GigaDrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "crack_glow", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 14, shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xC7E86A, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "crack_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12], gravity: 0.01,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0x7C8A4E, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        erupt: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "root_eruption", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "motes", fallback: 22 } }, shape: { kind: "ring", radius: 0.9 },
                    direction: "up", speed: [0.10, 0.30], spin: 40,
                    lifetime: [10, 20], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "jaws", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/moves/gigadrain_orb",
                    burst: { count: 3, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: 9, size: [0.6, 0.1], sizeMode: "index",
                    color: 0xC7E86A, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 18
                },
                {
                    name: "shock", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.10, 0.24], spread: 8,
                    lifetime: 8, size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 10
                }
            ]
        },
        beam: {
            duration: 80,
            exit: { stop: 70, drain: 30 },
            emitters: [
                {
                    name: "beam_line", bind: "path",
                    particle: "world_combat_core:cobblemon/moves/gigadrain_orb",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 10 },
                    direction: "shape", speed: [0.0, 0.04], spread: 14,
                    lifetime: [10, 20], size: [0.28, 0.06], sizeMode: "index",
                    color: 0x8FC63F, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "beam_flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "line", length: { data: "span", fallback: 10 } },
                    rate: { data: "motes", fallback: 10 },
                    direction: "shape", speed: [0.14, 0.34], spread: 10,
                    lifetime: [8, 18], size: [0.10, 0.02],
                    color: 0xC7E86A, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        surge: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "surge_orbs", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/moves/gigadrain_orb",
                    burst: { count: 4 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: 9, size: [0.5, 0.08], sizeMode: "index",
                    color: 0xC7E86A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 16
                },
                {
                    name: "surge_motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.20], gravity: 0.02, drag: 0.93,
                    lifetime: [8, 18], size: [0.07, 0.02],
                    color: 0x5C9E2E, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "surge_link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.01, 0.05], spread: 12,
                    lifetime: [8, 16], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8FC63F, alpha: [0.65, 0], light: "world", maxParticles: 70
                },
                {
                    name: "surge_pips", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "wave", fallback: 1 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 20], size: [0.10, 0.02],
                    color: 0xC7E86A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 16
                },
                {
                    name: "surge_final", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "last", fallback: 0 } }, shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.12, 0.28], spread: 8,
                    lifetime: 9, size: [0.44, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
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
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x9AA46A, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gigadrain", 1, GigaDrainDefinition);
