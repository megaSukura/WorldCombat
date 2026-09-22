/**
 * 觉醒力量的表现：
 * 「使用者身上的属性被收拢成一颗白球，沿直线射向目标，命中处按同一属性炸开光斑。」
 *
 * 色相家族：贴图取白色/浅灰，实际色相按个体值算出的 data.type 走共享 type 色表——同一个家族随属性变色。
 * 拍子：起 charge（凝聚，拉长）→ 击 impact（爆发，短促）→ 收（alpha 归零 + drain）。
 * 范围：flight 沿投射物画线；impact 的点爆半径由 ringRadius 读出命中范围。
 * 数：光斑、光点与凝聚环数量分别由 power/focus 绑定的 data 字段决定。
 */
const HiddenPowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 凝聚：白球在身前收拢，细点向内汇聚，环数随特攻阶梯。
        charge: {
            duration: 40,
            exit: { stop: 30, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "coreRate", fallback: 7 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [12, 20], size: [0.2, 0.34], sizeMode: "sin",
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.7, 0.15], alphaMode: "sin",
                    light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "motes", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "moteRate", fallback: 13 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.06, 0.14],
                    lifetime: [10, 18], size: [0.09, 0.015],
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.9, 0], light: "full",
                    maxParticles: { data: "moteCap", fallback: 100 }
                },
                {
                    name: "rings", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "ringCount", fallback: 2 }, interval: 6, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [10, 16], size: [0.24, 0.06],
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        // 射出：沿投射物拉出同色尾迹。
        flight: {
            emitters: [
                {
                    name: "trail_glints", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    trail: { minDistance: { data: "trail", fallback: 0.18 } },
                    rate: { data: "trailRate", fallback: 20 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.95, 0], light: "full", maxParticles: 200
                },
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    trail: { minDistance: 0.35 }, rate: 30,
                    lifetime: [6, 10], size: [0.28, 0.16],
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        // 命中：按属性炸开，光斑数量随威力。
        impact: {
            duration: 24,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "impactCount", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.42, 0.05], sizeMode: "index",
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "glints", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "glintCount", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.18, 0.5], spread: 25,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.95, 0], light: "full", maxParticles: 160
                },
                {
                    name: "burst_ring", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "ringRadius", fallback: 0.9 } },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [10, 16], size: [0.35, 0.8],
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.55, 0], light: "full"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hiddenpower", 1, HiddenPowerDefinition);
