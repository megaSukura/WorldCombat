/**
 * 盐腌 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：掌心攥起一把粗盐，盐块脱手飞出；命中时在目标身上炸开一圈白盐壳，之后每隔一会儿盐壳里
 *   爆出一撮盐花；钢/水的身体爆得更凶、盐粒更密。
 * 色相家族：灰白盐 0xF2EFE4 / 0xDED7C2 为主，暖尘 0xC9B98A 只做细节；一个暖白灰家族。
 * 层次：攥盐（windup）→ 盐块＋尾迹（throw）→ 结壳爆点（crust）→ 蛰痛（brine／brittle）→ 余盐（linger）。
 * 范围：throw 沿投射物画飞行线，crust／brine 绑在目标身上——画的就是盐真正摔到谁身上。
 * 运动：盐块沿直线飞出；命中时盐粒向外炸、盐壳环贴地铺开，之后小股盐花间歇外爆。
 * 数：服务端把 data.share（每口蛰痛比例）与 data.brittle（1/0）交给发射器——比例越高、身体越脆，盐花越密。
 * 参照节：视觉语言第二、三、四、五、六、七、九节。
 */
const SaltcureDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "grasp_salt", bind: "source", offset: [0, 0.7, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0xF2EFE4, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "grasp_grit", bind: "source", offset: [0, 0.7, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 8, shape: { kind: "sphere", radius: 0.12 },
                    direction: "inward", speed: [0.01, 0.05], spin: 12,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xDED7C2, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        throw: {
            duration: 44,
            exit: { stop: 44, drain: 14 },
            emitters: [
                {
                    name: "salt_chunk", bind: "projectile", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 30, trail: { minDistance: 0.2 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "velocity", speed: [0.0, 0.03], spin: 16,
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xF2EFE4, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "salt_trail", bind: "projectile", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, trail: { minDistance: 0.28 },
                    direction: "velocity", speed: [0.0, 0.02], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xDED7C2, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        crust: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "crust_burst", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock_white",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "crust_grain", bind: "target", height: 0.65, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 18 }, amount: 3,
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.1, 0.28], gravity: 0.03, spin: 18,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xF2EFE4, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "crust_ring", bind: "target", offset: [0, 0.08, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 20], size: [0.22, 0.02],
                    color: 0xDED7C2, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        brine: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "brine_puff", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock_white",
                    burst: { count: 1 }, amount: 2,
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.04], sizeMode: "index",
                    alpha: [0.85, 0], light: "full", maxParticles: 26
                },
                {
                    name: "brine_grain", bind: "target", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.02,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2EFE4, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        brittle: {
            duration: 28,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "brittle_burst", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock_white",
                    burst: { count: 1, at: 1 }, amount: 3,
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.28],
                    lifetime: [8, 16], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "brittle_ring", bind: "target", offset: [0, 0.1, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.52, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 22], size: [0.26, 0.02],
                    color: 0xC9B98A, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "brittle_spark", bind: "target", height: 0.7, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xE8D9A0, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "spill", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.03, spin: 14,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xF2EFE4, alpha: [0.6, 0], light: "world", maxParticles: 22
                },
                {
                    name: "spill_dust", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xDED7C2, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "caked", bind: "target", height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xDED7C2, alpha: [0.4, 0], light: "world", maxParticles: 16
                },
                {
                    name: "caked_grit", bind: "target", height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 2, shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "down", speed: [0.01, 0.03], spin: 8,
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0xF2EFE4, alpha: [0.35, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_saltcure", 1, SaltcureDefinition);
