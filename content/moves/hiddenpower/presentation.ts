/**
 * 觉醒力量的表现：
 * 「起手只在身前立起这颗球弹的实际属性符号，随后沿直线射出，首碰处按同一属性碎开。」
 *
 * 色相家族：贴图取白色/浅灰，实际色相按个体值算出的 data.type 走共享 type 色表——同一个家族随属性变色。
 * 拍子：charge（只立属性符号，简单）→ flight（真实球弹的尾迹）→ burst（撞到实体的属性爆发）→
 *       shatter（撞到方块的碎裂，碎片朝原生方块面反弹）。
 * 范围：flight 沿投射物画线；burst/shatter 的爆点半径由 ringRadius 读出。
 * 数：光斑、光点与符号环数量分别由 power/focus 绑定的 data 字段决定，块面方向由 data.direction 驱动。
 */
const HiddenPowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 凝聚：只立起这颗球弹的实际觉醒属性符号，不做场地。
        charge: {
            duration: 40,
            exit: { stop: 30, drain: 20 },
            emitters: [
                {
                    name: "sigil", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "coreRate", fallback: 7 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [12, 20], size: [0.2, 0.34], sizeMode: "sin",
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.7, 0.15], alphaMode: "sin",
                    light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "sigil_rings", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "ringCount", fallback: 2 }, interval: 6, repeats: 3 },
                    shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        // 射出：沿真实球弹拉出同色尾迹。
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
        // 命中实体：按属性炸开，光斑数量随威力。
        burst: {
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
        },
        // 撞墙：碎块沿原生方块面朝来弹方向崩开。
        shatter: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "shards", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "line", length: 0.22 },
                    direction: "shape", speed: [0.08, 0.28], spread: 30,
                    lifetime: [6, 12], size: [0.3, 0.04], sizeMode: "index",
                    color: TypeColors.binding("type", 0x9B59FF), alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "dust", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x9A9A9A, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hiddenpower", 1, HiddenPowerDefinition);
