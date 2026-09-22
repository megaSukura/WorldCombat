/**
 * 气旋攻击 / aeroblast 的客户端表现。
 *
 * 一句话：施法者口边的空气先旋起、越拧越紧，随后一支灰青涡流锥笔直射出、身后拖着一圈圈螺旋气尾，
 * 命中处炸开成向外推开的白色气环，把主目标连同近旁的旁人一起扫到。
 * 色相家族：灰青与近白（swirlingwind／spiral／gust／impact_flying），近白高光只给命中与暴击那一下。
 * 拍子：起（charge 拧气）→ 射（flight 涡流锥飞行、拖螺旋尾）→ 爆（burst 命中炸气环、echo 旁人）→ 强调（crit）。
 * 范围：burst 的气环用 `data.ring`（特攻派生）当半径、`data.spiral` 当环上粒子数，画出来的环就是气环真波及的范围。
 * 运动：charge 的风点向内旋入；flight 的涡流沿 projectile 锚点笔直高速前进、绕轴自转；burst 时粒子沿环向外推开、上方补一撮上扬气流。
 * 数：`data.spiral`（特攻派生）决定飞行拖尾与爆发环的密度，`data.ring` 决定气环半径，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AeroblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charge_spiral", bind: "source", offset: [0, 0.55, 0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 30, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.18], spread: 10, spin: 16,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xCFEFF5, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "charge_core", bind: "source", offset: [0, 0.55, 0.35], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/vanilla/spiral",
                    rate: 22, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.1], spread: 8, spin: 22,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xEAFBFF, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 44
                }
            ]
        },
        flight: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "vortex_core", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 66, shape: { kind: "sphere", radius: 0.14 }, direction: "velocity", speed: [0.02, 0.12], spin: 26,
                    lifetime: [7, 13], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "vortex_wake", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    trail: { minDistance: 0.16 },
                    particle: "world_combat_core:cobblemon/vanilla/spiral",
                    burst: { count: { data: "spiral", fallback: 30 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.12 }, direction: "outward", speed: [0.02, 0.1], spread: 16, spin: 18,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x9FD8E8, alpha: [0.45, 0], light: "full", maxParticles: 140
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_ring", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 30 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "ring", fallback: 2.4 } },
                    direction: "outward", speed: [0.2, 0.6], spread: 8, spin: 10,
                    lifetime: [8, 15], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 110
                },
                {
                    name: "burst_gust", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    burst: { count: 3, at: 0, interval: 1, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "ring", fallback: 2.4 } },
                    direction: "outward", speed: [0.1, 0.34], spread: 12, drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.04],
                    color: 0xBCE6F2, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "burst_up", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 12, at: 1 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.08, 0.3], spread: 20, gravity: -0.01, drag: 0.94,
                    lifetime: [10, 20], size: [0.14, 0.02],
                    color: 0xDFF6FF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        echo: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "echo_burst", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 14, at: 0 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [6, 12], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xD8F2FA, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        crit: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_ring", bind: "point", offset: [0, 0.55, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 30 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "ring", fallback: 2.4 } },
                    direction: "outward", speed: [0.24, 0.7], spread: 6, spin: 12,
                    lifetime: [7, 14], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 120
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14], spread: 18, gravity: 0.01, drag: 0.92,
                    lifetime: [12, 20], size: [0.16, 0.02],
                    color: 0xC9E2EA, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aeroblast", 1, AeroblastDefinition);
