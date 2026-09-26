/**
 * 打鼾 / snore 的客户端表现。
 *
 * 一句话：睡着的身体在口鼻边冒出一圈睡泡，随后一道苍白的声波束朝对手喷出、沿途铺开一圈圈气环与 Z 字，
 * 命中处炸开一圈声浪；被震懵的人头上晃星。
 * 色相家族：睡梦的苍蓝与近白（sleep_bubble / sleep_zzz / sonicboom / mediumring），灰蓝只做余韵。
 * 拍子：起（windup 聚睡泡）→ 鼾（blast 声波束、miss 散掉）→ 击（hit 炸开声浪）→ 懵（flinch 晃星）。
 * 范围：blast 沿机制给的 path 画出声波走过的整段线（同一组顶点来自服务端 trace 的嘴到实际接触点，
 *   撞上身体或墙面就止在那里；空喷才到射程尽头）。
 * 运动：声波束沿 path 铺开、气环朝向 data.direction；hit 的碎点带初速向外抛。
 * 数：`data.rings`（射程派生）决定声波束气环数，`data.count`（威力派生）决定命中碎点数，`data.intensity`
 *   抬高亮度、`data.scale`（声波判定派生）缩放尺寸与铺开范围。
 */
const SnoreDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "snore_bubbles", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xCFE6FF, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "breath", bind: "source", offset: [0, 0.36, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x8FA9C4, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        blast: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.4, 0], height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.25, 0.7],
                    color: 0xBFD4E6, alpha: [0.8, 0], light: "full", maxParticles: 6
                },
                {
                    name: "beam", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: { data: "rings", fallback: 20 } },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.0, 0.03], spread: 18,
                    lifetime: [6, 12], size: [0.22, 0.02], sizeMode: "index",
                    color: 0xE8F4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "zeds", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz", spriteFrom: "random",
                    burst: { count: 6, interval: 2, repeats: 2 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xCFE6FF, alpha: [0.85, 0], light: "world", maxParticles: 24
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.22], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "shockring", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [10, 16], size: [0.3, 0.8],
                    color: 0xBFD4E6, alpha: [0.7, 0], light: "full", maxParticles: 4
                },
                {
                    name: "hit_zeds", bind: "point", fit: "none", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz", spriteFrom: "random",
                    burst: { count: 5, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0xCFE6FF, alpha: [0.8, 0], light: "world", maxParticles: 14
                }
            ]
        },
        flinch: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "stagger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8FA9C4, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_snore", 1, SnoreDefinition);
