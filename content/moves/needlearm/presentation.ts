/**
 * 尖刺臂 / needlearm 的客户端表现。
 *
 * 一句话：施法者压低身子、臂上拢起一小丛尖刺，随后带刺手臂自外向内横扫目标，把一串尖刺与叶片甩进地面；
 * 尖刺插成一圈低矮的荆棘，谁站在里面就被不断扎出草屑。
 * 色相家族：草绿与叶黄（razorleaf / leaf / seed / impact_grass 为主体，0x8FC63A、0xB6D84A），枯褐只给落地尘土。
 * 拍子：起（coil 拢刺）→ 扑（drive 扑上）→ 挥（rake 命中迸刺）→ 落（briar 荆棘插地）→ 留（hum 荆棘低频提示、prick 被扎）→ 懵（flinch）／空（miss）。
 * 范围：briar／hum 的荆棘圈按服务端传的 `data.radius`（真实荆棘半径）与 `data.scale` 画出，玩家看到的圈就是会被扎到的地。
 * 运动：起手尖刺向臂上收拢；命中时尖刺向前下方泼出、带重力插进地面；荆棘期叶片贴地轻颤、被扎时朝上弹起草屑。
 * 数：`data.thorns`（物攻与等级派生）决定甩出的刺量与地面荆棘密度，`data.intensity` 抬高命中亮度。
 * 参照节：视觉语言第二、三、四、五、六、七、九节。
 */
const NeedlearmDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "coil_thorns", bind: "source", offset: [0, 0.4, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 }, direction: "inward", speed: [0.04, 0.16], spread: 14,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xB6D84A, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "coil_leaf", bind: "source", offset: [0, 0.5, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "sphere", radius: 0.6 }, direction: "inward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8FC63A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        drive: {
            duration: 16,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "drive_leaf", bind: "source", offset: [0, 0.4, 0], height: 0.5, fit: "body",
                    trail: { minDistance: 0.18 },
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 22, shape: { kind: "sphere", radius: 0.18 }, direction: "outward", speed: [0.02, 0.1], spread: 12, spin: 12,
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0x8FC63A, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rake: {
            duration: 22,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "rake_burst", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "thorns", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.12, 0.5], spread: 24,
                    lifetime: [7, 13], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "rake_thorns", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "thorns", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.15, 0.5], spread: 26,
                    gravity: 0.04, drag: 0.94,
                    lifetime: [10, 20], size: [0.11, 0.02],
                    color: 0xB6D84A, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        briar: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "briar_seed", bind: "point", offset: [0, -0.7, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "thorns", fallback: 20 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.6 }, thickness: 0.7 },
                    direction: "outward", speed: [0.05, 0.25], spread: 24, gravity: 0.05, drag: 0.92,
                    lifetime: [12, 22], size: [0.16, 0.02],
                    color: 0x8FC63A, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "briar_dust", bind: "point", offset: [0, -0.75, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.6 }, thickness: 0.9 },
                    direction: "outward", speed: [0.04, 0.18], spread: 18,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xA88A5A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hum: {
            duration: 20,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "hum_leaf", bind: "point", offset: [0, -0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 1.6 }, thickness: 0.8 },
                    direction: "up", speed: [0.01, 0.05], spread: 10, spin: 8,
                    lifetime: [12, 22], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8FC63A, alpha: [0.25, 0], light: "world", maxParticles: 40
                }
            ]
        },
        prick: {
            duration: 18,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "prick_burst", bind: "target", offset: [0, 0.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: { data: "thorns", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [6, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        flinch: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 0, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xD8F0A0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "miss_leaf", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.04, 0.16], spread: 18,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x8FC63A, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_needlearm", 1, NeedlearmDefinition);
