/**
 * 掉包 / switcheroo 的客户端表现。
 *
 * 一句话：施法者低伏压身，贴着地面朝目标一掠而过，身后拖一条暗色残影；撞上的一瞬在接触点炸开一撮暗火，
 * 两件持有物各沿一条短弧飞向对方。
 * 色相家族：恶系暗紫近黑（smoke / impact_dark）为主，一点近白高光（smallsparkle）作为「一闪」的那一下。
 * 拍子：起（blur 速度线与贴地残影）→ 掠（残影沿运动拖出）→ 换（trade 接触暗爆与两件道具对飞）／空（miss 擦身尘）。
 * 范围：blur 的残影沿施法者实际掠过的轨迹铺开，trade 绑接触点，画面就是被打中的位置。
 * 运动：贴地拖影与速度线给出「一闪而过」，接触是短促内聚的暗爆，道具沿两端之间的短弧对飞。
 * 数：`data.motes`（速度与等级派生的火花数）驱动残影与接触的粒子量，`data.direction`（本次掠行方向）让速度线指向真正走的方向。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SwitcherooDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        blur: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "streak", bind: "source", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    trail: { minDistance: 0.12 },
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "line", length: 1.0 }, orient: "direction",
                    direction: "shape", speed: [0.0, 0.03],
                    lifetime: [5, 10], size: [0.16, 0.02],
                    color: 0x2E2438, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "gloom", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    trail: { minDistance: 0.2 },
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x4A3B5C, alpha: [0.45, 0], light: "world", maxParticles: 60
                },
                {
                    name: "glint", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 4, interval: 5, repeats: 3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [4, 9], size: [0.08, 0.01],
                    color: 0xE8E2F2, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 18
                }
            ]
        },
        trade: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 9, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xC9B8DA, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 36
                },
                {
                    name: "flurry", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.02,
                    lifetime: [7, 15], size: [0.06, 0.01],
                    color: 0x7A6690, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "ferry", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "away", speed: [0.01, 0.05],
                    lifetime: [5, 11], size: [0.05, 0.01],
                    color: 0xD9C9A0, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0x5E5268, alpha: [0.5, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_switcheroo", 1, SwitcherooDefinition);
