/**
 * 电磁炮 / zapcannon 的客户端表现。
 *
 * 一句话：施法者长时间把电灌进炮膛、身周电弧一圈圈收拢变亮，开炮时被后坐推得向后退，一枚沉甸甸的亮芯电弹
 *   慢慢飞出去、拖一条厚尾，命中处炸开一大片电光；打空只留一下落地散电。
 * 色相家族：冷青白（0x8FE8FF / 0xEAFBFF）与电黄（0xFFE14D）为主，浅青绿（0xC8F0A0）只做地面环的细节。
 * 拍子：起（charge 长时间蓄能）→ 轰（fire 炮口后坐）→ 飞（shell 慢速厚尾电弹）→ 击（burst 大爆 / fizzle 散电）。
 * 范围：burst 绑在命中点上，形状半径按参考值 1.0 格书写，服务端把 `data.scale = 实际爆开半径 / 1.0` 传进来，
 *   `fit: "none"` 让几何跟着 `scale` 走——画出来的圈就是真正会被电到的地。
 * 运动：电弹以远低于同族的速度直线飞行、尾迹厚而慢（一眼看出可以躲开），命中点向四周炸开。
 * 数：`data.sparks`（由威力派生）绑定爆发粒子数，`data.arcs`（由特攻派生）绑定电弧与蓄能脉冲的条数，
 *   `data.flow`（由威力派生）绑定拖尾密度，`data.scale` 同时缩放尺寸，`data.recoil` 在开炮拍给出后坐提示。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ZapCannonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 30 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.4, 0.35], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 30, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [4, 9], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "crack", bind: "source", offset: [0, 0.4, 0.35], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "arcs", fallback: 10 }, interval: 5, repeats: 7 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [4, 10], size: [0.12, 0.02],
                    color: 0x9BE8FF, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "gullet", bind: "source", offset: [0, 0.3, 0.5], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 24, shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.26, 0.06],
                    color: 0xEAFBFF, alpha: [0.6, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        fire: {
            duration: 22,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.4, 0.5], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.12, 0.4], spread: 18,
                    lifetime: [5, 11], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 70
                },
                {
                    name: "kick", bind: "source", offset: [0, 0.1, -0.2], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0x9C8455, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        shell: {
            duration: 140,
            exit: { stop: 120, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 34, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [5, 9], size: [0.26, 0.05], sizeMode: "sin",
                    color: 0xEAFBFF, alpha: [0.95, 0], light: "full", bloom: 0.55, maxParticles: 70
                },
                {
                    name: "wake", bind: "projectile", fit: "none", trail: { minDistance: 0.1 },
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: { data: "flow", fallback: 80 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 20], size: [0.14, 0.02],
                    color: 0x9BE8FF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 180
                },
                {
                    name: "battery", bind: "projectile", fit: "none", trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xFFE14D, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 34,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "flash", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 1.0 },
                    direction: "outward", speed: [0.08, 0.36], spread: 16,
                    lifetime: [6, 13], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.65, maxParticles: 120
                },
                {
                    name: "arcs", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 1.0 },
                    direction: "outward", speed: [0.1, 0.42], spread: 14,
                    lifetime: [6, 14], size: [0.2, 0.04],
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, at: 1, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.0, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [12, 20], size: [0.36, 0.14],
                    color: 0xC8F0A0, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "cling", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "arcs", fallback: 12 }, interval: 4, repeats: 4 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0x9BE8FF, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "groundout", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 10 }, at: 1 },
                    shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.14, 0.03],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.18, 0.3],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_zapcannon", 1, ZapCannonDefinition);
