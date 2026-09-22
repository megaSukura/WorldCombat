/**
 * 复仇 / comeuppance 的客户端表现。
 *
 * 一句话：施法者把最近吃下的那笔伤害收成目标身上的一枚暗记（账越大记越亮）→ 暗影在身边聚起、
 * 压着记等一拍 → 离手贴着账主追过去，命中时炸开一记暗影；没有账时暗记散成几缕烟。
 * 色相家族：暗紫到近黑（impact_dark / obscuringsmoke / mediumfadeorb），命中处混一点冷光。
 * 拍子：起 mark（压记）→ 候 lurk（凝影）→ 讨 flight／strike（追讨）／散 whiff。
 * 范围：mark 的暗记环与 strike 的爆环半径由 `data.scale`（判定半径派生）给出。
 * 运动：mark 的粒子向目标身上收；lurk 在施法者身边旋转聚集；flight 沿追踪轨迹拖出黑烟。
 * 数：`data.glyphs`（账本伤害派生）决定压记粒子量，`data.count`（返还伤害派生）决定命中碎片数量。
 */
const ComeuppanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 4, drain: 14 },
            emitters: [
                {
                    name: "sigil", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "glyphs", fallback: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.13], spread: 24,
                    lifetime: [7, 13], size: [0.15, 0.03], sizeMode: "sin",
                    color: 0x6B4A8A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 6, repeats: 6 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.7 } },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [8, 14], size: [0.32, 0.12],
                    color: 0x4A3266, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        lurk: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "torus", radius: 0.4, thickness: 0.12 },
                    direction: "inward", speed: [0.02, 0.09], spread: 18,
                    lifetime: [9, 16], size: [0.2, 0.05],
                    color: 0x3A2C4A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        flight: {
            duration: 60,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "trace", bind: "projectile", trail: { minDistance: 0.25 },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 55,
                    shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [7, 13], size: [0.13, 0.03],
                    color: 0x7A5AA0, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 110
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [7, 13], size: [0.38, 0.05], sizeMode: "index",
                    color: 0x7A5AA0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "chill", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.12, 0.34], spread: 24,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xC8B6E8, alpha: [0.9, 0], light: "full", maxParticles: 110
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.85 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 16], size: [0.42, 0.18],
                    color: 0x4A3266, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0x4A4A5A, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_comeuppance", 1, ComeuppanceDefinition);
