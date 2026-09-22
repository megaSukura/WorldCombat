/**
 * 龙之俯冲 / dragonrush 的客户端表现。
 *
 * 一句话：身周先铺开一圈紫黑杀气、地面被压出纹路，随后一条龙影拖着黑焰腾起再砸下，落点炸开一圈冲击与土屑，
 * 被镇住的人头顶再冒一串眩晕星。
 * 色相家族：龙紫与暗紫（impact_dragon 0x7C6BE8／wisp 0x4A3A78／obscuringsmoke），暗红凶气（anger_red）做点缀，
 *   近白高光（0xFFF3FF）只给命中那一下。
 * 拍子：起（menace 张杀气）→ 扑（leap 腾起下坠）→ 击（crash/impact 砸地崩土）／空（miss 扬尘）→ 懵（stagger）。
 * 范围：menace 的圈半径绑 `data.menace`（威压半径），crash 的贴地环半径绑 `data.scale`（落点半径 / 2.0），
 *   画出的就是这一扑的威慑圈与落点范围。
 * 运动：menace 的凶气由内向外铺开、缓慢上浮；leap 的黑焰沿龙影上抛再下坠；crash 的冲击贴地向外扩、土屑带重力外抛。
 * 数：`data.dust`（物攻派生）决定砸地的土屑量，`data.intensity`（威力派生）抬高命中亮度，`data.hop` 只用于腾空幕铺开。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DragonrushDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        menace: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "dread_ring", bind: "source", offset: [0, 0.08, 0], height: 0.0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 22, shape: { kind: "ring", radius: { data: "menace", fallback: 3 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.14], spread: 16,
                    gravity: -0.01, drag: 0.95,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x4A3A78, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "menace_mark", bind: "source", offset: [0, 1.0, 0], height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0xE0526E, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        },
        leap: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dragon_trail", bind: "source", offset: [0, 0.5, 0], height: 0.4, trail: { minDistance: 0.18 },
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 34, shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.03, 0.14], spin: 8,
                    lifetime: [8, 15], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x7C6BE8, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "rise_lines", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 20, shape: { kind: "box", size: [0.34, 0.5, 0.34] }, direction: "up", speed: [0.05, 0.2],
                    lifetime: [4, 9], size: [0.18, 0.04],
                    color: 0xB9A8F0, alpha: [0.5, 0], light: "full", maxParticles: 90
                }
            ]
        },
        crash: {
            duration: 32,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "shock", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.5, 1.4],
                    color: 0x6B58C8, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "burst", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 }, direction: "shape", speed: [0.08, 0.3], spread: 22,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "earth", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.26], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.13, 0.03], sizeMode: "index",
                    color: 0x7A6A8C, alpha: [0.65, 0], light: "world", maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "point", offset: [0, 0.35, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFF3FF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 46
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.25, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.05, 0.22],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [9, 18], size: [0.06, 0.02],
                    color: 0x9A8CC0, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        stagger: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 0, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xC9B8FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "skid", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 }, direction: "outward", speed: [0.04, 0.16], spread: 18,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.4, 0.1],
                    color: 0x4A4260, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonrush", 1, DragonrushDefinition);
