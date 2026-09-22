/**
 * 角钻 / horndrill 的客户端表现。
 *
 * 一句话：角的螺旋越转越快，锁定的一条钻路先亮起来；随后施法者贴着这条线钻过去，钻尖的碎石与火星沿路
 * 甩开，贯穿目标的那一刻在它身上炸开一圈钻花。
 * 色相家族：金属灰与暖石色（0xC9A66B / 0xA08C6E + 近白 0xE8DFC8 / 火星 0xFFD98A）为主体，钻尖的高光最亮。
 * 拍子：起（windup 螺旋聚拢）→ 定（mark 钻路与宽度预览，持续蓄势）→ 钻（bore 逐刻推进）→ 击（gore 贯穿 / miss 扎空）。
 * 范围：mark 的钻路直接沿 `data.path` 的两端顶点画出（世界几何，不被缩放），宽度由落点预览环读取
 *   `data.scale = 实际判定半径 / 0.6`；玩家看到的那条亮线与圆口就是要让开的位置。
 * 运动：钻路上先亮起一道滞留的尘土线，钻过去时火星与碎屑沿 `data.direction` 反向甩出，钻尖本身在旋转。
 * 数：`data.bore`（物攻派生）决定钻屑与火星密度，`data.scale`（判定半径派生）同时放大钻头与预览环。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HornDrillDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.9, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12], spread: 14, spin: 40,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xFFD98A, alpha: [0.8, 0], light: "full", bloom: 0.15, maxParticles: 40
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], spin: 30,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 22 },
            emitters: [
                {
                    name: "lane", bind: "path", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    shape: { kind: "polyline" }, rate: { data: "bore", fallback: 18 },
                    direction: "shape", speed: [0.0, 0.02], spread: 4,
                    lifetime: [6, 12], size: [0.18, 0.03],
                    color: 0xC9A66B, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "lane_dust", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" }, rate: { data: "bore", fallback: 12 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "muzzle", bind: "point", offset: [0, 0.35, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 20, shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.3, 0.5], sizeMode: "linear",
                    color: 0xE8DFC8, alpha: [0.45, 0], light: "full", maxParticles: 50
                },
                {
                    name: "tip", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: 12, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.03], spin: 60,
                    lifetime: [6, 12], size: [0.34, 0.1],
                    color: 0xFFF0C8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 24
                }
            ]
        },
        bore: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "drill", bind: "source", offset: [0, 0.9, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: 18, shape: { kind: "point" },
                    direction: "shape", speed: [0.0, 0.04], spin: 90,
                    lifetime: [4, 9], size: [0.4, 0.12],
                    color: 0xE8DFC8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.8, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "bore", fallback: 24 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 30, drag: 0.9,
                    lifetime: [5, 10], size: [0.07, 0.01],
                    color: 0xFFD98A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 120
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.5, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "bore", fallback: 16 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26, gravity: 0.06, drag: 0.93,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x8A7A62, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        gore: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "pierce", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "bore", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.5], spread: 24,
                    lifetime: [6, 12], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "chips", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "bore", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.34], spread: 30, gravity: 0.09, drag: 0.94,
                    lifetime: [12, 22], size: [0.16, 0.04],
                    color: 0x9A8A72, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "drill", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/drill",
                    burst: { count: 5, at: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.1], spin: 70,
                    lifetime: [8, 16], size: [0.42, 0.1],
                    color: 0xFFF0C8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 12
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "chips", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "bore", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.08, 0.32], spread: 30, gravity: 0.08, drag: 0.93,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0x8A7A62, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "scuff", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spread: 12,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0x8A7A62, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_horndrill", 1, HornDrillDefinition);
