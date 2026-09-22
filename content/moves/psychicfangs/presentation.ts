/**
 * 精神之牙 / psychicfangs 的客户端表现。
 *
 * 一句话：身周卷起一圈精神涡流后扑出去，身前那条窄走廊被粉色牙影咬合，命中处爆出一口精神火花；
 * 若目标身上有屏障，它会顺着咬合点裂成一圈紫白碎片被吸入齿间。
 * 色相家族：品红与深紫（精神）为底，近白做齿尖高光；屏障碎片用偏冷的高光，呼应「咬碎屏障」的第二层含义。
 * 拍子：起（windup 涡流）→ 扑（lunge 速度线）→ 咬（bite 牙影与火花）→ 吞（break 碎片被吸走）→ 空（miss）。
 * 范围：bite 用 path 画出服务端走廊判定的同一组四个顶点；走廊多长多窄，画面就是那条走廊。
 * 运动：涡流向内收进身体，扑出时速度线向后拖，咬合是短促外爆，碎片随后向齿间收拢。
 * 数：`data.power`（这一口实际威力）绑定咬合火花量，`data.wards`（咬碎的屏障层数）绑定碎片波数，
 * `data.scale`（咬合半径 / 0.5）放大走廊与爆发范围。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PsychicfangsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "swirl", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12], spin: 10,
                    lifetime: [10, 18], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0xD060C0, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "teeth", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    rate: 8, shape: { kind: "circle", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.2, 0.1],
                    color: 0xF0E0FF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        lunge: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dash", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 16, interval: 2, repeats: 2 }, shape: { kind: "circle", radius: 0.35 },
                    direction: "away", speed: [0.1, 0.3], orient: "direction",
                    lifetime: [6, 11], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xC080E0, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xD060C0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        bite: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lane", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/bite",
                    shape: { kind: "polygon" },
                    rate: 24, direction: "shape", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.34, 0.08],
                    color: 0xE0A0E8, alpha: [0.35, 0], light: "full", maxParticles: 110
                },
                {
                    name: "impact", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "power", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [7, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF4E0FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "fangs", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 8, at: 1 }, shape: { kind: "circle", radius: { data: "scale", fallback: 0.5 } },
                    direction: "inward", speed: [0.06, 0.18],
                    lifetime: [6, 12], size: [0.26, 0.1],
                    color: 0xF0E0FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        break: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shards", bind: "point", offset: [0, 0.65, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "wards", fallback: 0 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.08, 0.26],
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xE8C8FF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.12, 0.24],
                    lifetime: [10, 18], size: [0.5, 0.16], sizeMode: "sin",
                    color: 0xD060C0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: 14, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xA070B0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychicfangs", 1, PsychicfangsDefinition);
