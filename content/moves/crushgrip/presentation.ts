/**
 * 捏碎 / crushgrip 的客户端表现。
 *
 * 一句话：目标两侧先浮出两片暗铁的掌影，随即合拢捏出一个实心的暗色光团、石屑沿掌口崩出；高举式再把它整个人
 *   提起、按住，然后砸回地面，落点炸开一圈冲击。
 * 色相家族：暗铁（0x8A8794）主体、冷白（0xD8D4E0）强调、深灰（0x403C4A）余韵；单一色相。
 * 拍子：起 loom（掌影张开）→ 击 grip（合拢）→ 提 hoist（高举式）→ 落 slam（高举式）→ 空 whiff。
 * 范围：grip 的掌口环半径按 `data.scale`（实际掌口半径 / 0.7）铺开，画出的圈就是被捏住的范围。
 * 运动：掌影自两侧向中心合拢；碎屑沿掌口外抛带重力；高举式有一道向上的拖痕、落地有一圈贴地冲击。
 * 数：`data.motes`（物攻与体重派生）决定碎屑量，`data.intensity`（本击威力 / 100）抬高亮度，
 *   `data.lift`（体重派生）只用于提升幕的纵向铺开。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const CrushgripDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        loom: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "palm", bind: "source", offset: [0, 0, 0], height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.12], drag: 0.9, spin: 8,
                    lifetime: [8, 16], size: [0.22, 0.04],
                    color: 0x8A8794, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    name: "haze", bind: "source", offset: [0, 0, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.3, 0.08],
                    color: 0x403C4A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        grip: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "closing", bind: "target", offset: [0, 0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, at: 0, interval: 4 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.08, 0.24],
                    lifetime: [9, 16], size: [0.4, 0.7], sizeMode: "index",
                    color: 0x8A8794, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "core", bind: "target", offset: [0, 0, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [8, 15], size: [0.34, 0.08],
                    color: 0x403C4A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "chips", bind: "target", offset: [0, 0, 0], height: 0.3, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.28], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.13, 0.03], sizeMode: "index",
                    color: 0x5A5560, alpha: [0.7, 0], light: "world", maxParticles: 160
                },
                {
                    name: "snap", bind: "target", offset: [0, 0.4, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xD8D4E0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 54
                }
            ]
        },
        hoist: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "rise", bind: "target", offset: [0, 0, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 16 },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.12, 0.34],
                    lifetime: [6, 12], size: [0.2, 0.05],
                    color: 0xD8D4E0, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "grip_hold", bind: "target", offset: [0, 0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 10, shape: { kind: "torus", radius: { data: "scale", fallback: 1 }, thickness: 0.6 },
                    direction: "inward", speed: [0.01, 0.05], spin: 16,
                    lifetime: [8, 15], size: [0.26, 0.06],
                    color: 0x8A8794, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "shock", bind: "target", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.5, 1.4],
                    color: 0x8A8794, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "target", offset: [0, 0, 0], height: 0.15, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.07, 0.3], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x5A5560, alpha: [0.7, 0], light: "world", maxParticles: 180
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.25, 0], height: 0.2, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xD8D4E0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [9, 16], size: [0.28, 0.08],
                    color: 0x403C4A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crushgrip", 1, CrushgripDefinition);
