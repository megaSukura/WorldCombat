/**
 * 王者盾牌的客户端表现。
 *
 * 一句话：一面竖起的钢盾在身前立稳、盾面浮起金色纹章，来击在盾面磕出金属火花，接触的攻击者被盾沿一顶、攻击锐度当场下降；
 * 量尽或到时钢盾沉下。
 * 色相家族：钢蓝灰为主体（impact_steel／smoke／mediumring），金色纹章与火花为强调（glowingsparkle_yellow／bigsparkle）。
 * 拍子：起（raise 0–16t，盾面自下而上拼合并浮出纹章）→ 击（block 每次磕挡、punish 每次削锋）→ 收（fall 沉盾）。
 * 范围：hold 的盾影环按 `data.scale`（盾影半径／1.6）铺开——画面就是被判定的那一圈。
 * 运动：起手盾面向上拼合、金纹浮起；持盾几乎静止，被撞击处向内一震；削锋时从接触点向攻击者撒出金色火花。
 * 数：`data.bolts`（削攻级数 ×8）就是 punish 金火花的根数，`data.intensity`（剩余量／初始量）决定亮度，`data.scale` 放大盾影环。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const KingShieldDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 16,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "plate", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    rate: 26, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [10, 20], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "crest", bind: "source", offset: [0, 0.9, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "arc", radius: 0.6, arcDegrees: 200 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [14, 26], size: [0.12, 0.02],
                    color: 0xF2C85A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "haze", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.28, 0.06],
                    color: 0x9EAAB8, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hold: {
            // 持续状态：低密度钢蓝盾影环与少量金纹，放在脚边，让玩家看清目标。
            emitters: [
                {
                    name: "ward_ring", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 5, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [24, 40], size: [0.48, 0.48], sizeMode: "sin",
                    color: 0x8FA0B4, alpha: [0.22, 0.07], alphaMode: "sin",
                    light: "world", maxParticles: 16
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.9, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [20, 34], size: [0.07, 0.02], sizeMode: "sin",
                    color: 0xF2C85A, alpha: [0.5, 0.1], alphaMode: "sin",
                    light: "full", maxParticles: 12
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "clang", bind: "target", height: 0.55, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 14, at: 1 }, shape: { kind: "arc", radius: 0.6, arcDegrees: 120 },
                    direction: "outward", speed: [0.07, 0.22],
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "sparks", bind: "target", height: 0.55, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 26 },
                    shape: { kind: "arc", radius: 0.6, arcDegrees: 150 },
                    direction: "outward", speed: [0.1, 0.3], spread: 20, gravity: 0.04,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "recoil", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 6, at: 1 }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", bloom: 0.4
                }
            ]
        },
        punish: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "bolts", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "bolts", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 26 },
                    direction: "shape", speed: [0.12, 0.34], spin: 20,
                    lifetime: [8, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xF2C85A, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "chips", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 8, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "dust", bind: "target", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.05,
                    lifetime: [10, 20], size: [0.05, 0.01],
                    color: 0xFFF2C0, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "sink", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 26 },
                    shape: { kind: "hemisphere", radius: 0.55 },
                    direction: "down", speed: [0.05, 0.18],
                    lifetime: [14, 26], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "fade", bind: "target", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [12, 22], size: [0.4, 0.08],
                    color: 0xAEBBCB, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "haze", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [16, 30], size: [0.28, 0.07],
                    color: 0x7C8794, alpha: [0.3, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_kingsshield", 1, KingShieldDefinition);
