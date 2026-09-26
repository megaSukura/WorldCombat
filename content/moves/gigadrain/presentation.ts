/**
 * 终极吸取 / gigadrain 的客户端表现。
 *
 * 一句话：身体四周绿光向手心与地面汇聚 → 一根粗吸根从身边探出去，照住当刻瞄准方向；每拍把根尖摆在
 * 真实的射线终点上——照到有效敌人就亮起一口亮汁沿根回身，照到空地／墙面／友方则根尖干枯。
 *
 * 色相家族：深草绿（0x5C9E2E／0x3E7A1F）与嫩黄绿（0xC7E86A），近白只给每拍命中的核心；无第二色相。
 * 拍子：起 windup（聚光）→ root（连续粗根，逐拍更新真实终点）→ surge（有效敌人那一拍的亮汁回流）
 *   ／ dry、block（空照、被墙或友方挡断的干抽）→ retract（收根）。
 * 范围：`data.scale`（吸根半径 / 0.9）铺开根须与根尖；`data.motes`（每拍威力与抽取比例换算）决定根须密度。
 * 运动：root 的 path 发射器用 `data.path` 把施法者与真实终点连成实线；flow 用 orient=direction、line 形状
 *   沿「终点→自身」把亮汁送回；这些位置与判定、trace 读的是同一份点。
 * 数：`data.flowRate`／`data.dryRate` 让「这一拍是否真的抽到」从画面读出；`data.wave`／`data.waves` 数得出拍子。
 */
const GigaDrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "gather_glow", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 14, shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xC7E86A, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12], gravity: 0.01,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0x7C8A4E, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        root: {
            duration: 100,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "stalk", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 16 },
                    direction: "shape", speed: [0.0, 0.03], spread: 16,
                    lifetime: [8, 16], size: [0.15, 0.03], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.8, 0], light: "world", maxParticles: 110
                },
                {
                    name: "tip_live", bind: "point",
                    particle: "world_combat_core:cobblemon/moves/gigadrain_orb",
                    shape: { kind: "sphere", radius: 0.32 }, rate: { data: "flowRate", fallback: 0 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: 9, size: [0.42, 0.08], sizeMode: "index",
                    color: 0xC7E86A, alpha: [1, 0], light: "full", bloom: 0.38, maxParticles: 22
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "line", length: { data: "span", fallback: 8 } },
                    rate: { data: "flowRate", fallback: 0 },
                    direction: "shape", speed: [0.18, 0.40], spread: 8,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xC7E86A, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "tip_dry", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "sphere", radius: 0.22 }, rate: { data: "dryRate", fallback: 0 },
                    direction: "outward", speed: [0.02, 0.10], gravity: 0.02, drag: 0.9,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: { attribute: "contact", colors: { empty: 0x9AA46A, ally: 0x8FC63F, block: 0x7C8A4E }, fallback: 0x9AA46A },
                    alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        surge: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "surge_orbs", bind: "point",
                    particle: "world_combat_core:cobblemon/moves/gigadrain_orb",
                    burst: { count: 4 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: 9, size: [0.5, 0.08], sizeMode: "index",
                    color: 0xC7E86A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 16
                },
                {
                    name: "surge_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.16, 0.38], spread: 8,
                    lifetime: [7, 14], size: [0.13, 0.02], sizeMode: "index",
                    color: 0x8FC63F, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "surge_flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    shape: { kind: "line", length: { data: "span", fallback: 8 } },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.20, 0.44], spread: 8,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xC7E86A, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "surge_pips", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "wave", fallback: 1 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 20], size: [0.10, 0.02],
                    color: 0xC7E86A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 16
                },
                {
                    name: "surge_core", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.10, 0.24], spread: 8,
                    lifetime: 8, size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                }
            ]
        },
        dry: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "dry_dust", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x9AA46A, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        },
        block: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "block_dust", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.88,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0x7C8A4E, alpha: [0.5, 0], light: "world", maxParticles: 36
                },
                {
                    name: "block_bits", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.06, 0.18], gravity: 0.04, spin: 40,
                    lifetime: [8, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.7, 0], light: "world", maxParticles: 12
                }
            ]
        },
        retract: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "retract_dust", bind: "source", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.08, 0.24],
                    lifetime: [6, 14], size: [0.10, 0.02],
                    color: 0x5C9E2E, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gigadrain", 1, GigaDrainDefinition);
