/**
 * 抛物面充电 / paraboliccharge 的客户端表现。
 *
 * 一句话：施法者脚边先亮起一圈虚电盘 → 电盘张开，电弧从身上甩出去、沿弧线下弯，同时一圈电光朝中心收拢；
 * 每个被电到的目标身上炸开电花，并沿「目标→自身」抽回一道电光 → 电光收进施法者体内，身上亮起回血的光。
 *
 * 色相家族：电黄（0xFFE96A／0xFFF0A0）与近白（0xFFFFFF），冷白只给电心与回血核心；电与白光是一家，无第二色相。
 * 拍子：起 charge（攒电＋虚线盘）→ 张 dish（甩出电弧＋内收环）→ 击 surge（目标炸花）／汲 pull（抽回电光）
 *   → 收 reclaim（收回身上）。空 miss 只在盘内没电到人时由服务端文字说明。
 * 范围：dish / reclaim 的地面环按服务端传的 `data.radius`（真实抛物面半径）画出，圈就是会被电到的地；
 *   charge 的虚线盘给出预告的同一块区域。
 * 运动：dish 的电弧向外甩出后受重力下弯（抛物线的形状），内收环朝中心聚；pull 沿「目标→自身」把电光抽回。
 * 数：`data.arcs`（特攻与等级派生）决定电弧道数，`data.motes`（威力与半径派生）决定盘的密度，
 *   `data.targets`（实际吸到的目标数）决定回光量与"吸回几道"的视觉强度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ParabolicchargeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFE96A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "preview", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 26, shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 } },
                    direction: "inward", speed: [0.01, 0.05], spread: 6,
                    lifetime: [6, 12], size: [0.1, 0.2], spriteFrom: "random",
                    color: 0xFFF4B0, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        dish: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "arcs", bind: "source", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.45, 1.0], spread: 16,
                    gravity: 0.08, drag: 0.97,
                    lifetime: [8, 16], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "field", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "motes", fallback: 90 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 } },
                    direction: "inward", speed: [0.08, 0.22], spread: 8,
                    lifetime: [8, 16], size: [0.18, 0.36], spriteFrom: "random",
                    color: 0xFFE96A, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 200
                },
                {
                    name: "disc", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 60 }, shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "inward", speed: [0.05, 0.16], spread: 16,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xFFF0A0, alpha: [0.7, 0], light: "full", maxParticles: 180
                },
                {
                    name: "core", bind: "source", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.32], spread: 20,
                    lifetime: [6, 12], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 44
                }
            ]
        },
        surge: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "cling", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "count", fallback: 8 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.16], spread: 16,
                    lifetime: [8, 16], size: [0.2, 0.04], spriteFrom: "random",
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        pull: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.02, 0.08], spread: 8, spriteFrom: "random",
                    lifetime: [7, 14], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFF0A0, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "line", length: { data: "span", fallback: 3 } },
                    rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.12, 0.34], spread: 10,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 80
                }
            ]
        },
        reclaim: {
            duration: 28,
            exit: { drain: 20 },
            emitters: [
                {
                    name: "glow", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "targets", fallback: 10 } }, shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [12, 20], size: [0.1, 0.01],
                    color: 0xFFF4B0, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 48
                },
                {
                    name: "collapse", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 4 }, interval: 6, repeats: 2, at: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 } },
                    direction: "inward", speed: [0.1, 0.3], spread: 10,
                    lifetime: [6, 12], size: [0.16, 0.3], spriteFrom: "random",
                    color: 0xFFE96A, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_paraboliccharge", 1, ParabolicchargeDefinition);
