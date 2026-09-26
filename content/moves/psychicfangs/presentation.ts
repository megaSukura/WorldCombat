/**
 * 精神之牙 / psychicfangs 的客户端表现。
 *
 * 一句话：身周卷起精神涡流后，两排牙尖从口边逐刻向前伸出；尖端碰到第一处身体或屏障时合拢一次——
 * 咬住身体就爆出一口精神火花，碰到屏障就把它吸进牙隙。
 * 色相家族：品红与深紫（精神）为底，近白做齿尖高光；屏障碎片用偏冷的高光，呼应「咬碎屏障」的第二层含义。
 * 拍子：起（windup 涡流）→ 伸（reach 牙框前伸、开口收窄）→ 咬（bite 合拢火花）→ 吞（devour 碎片吸入）→ 挡（blocked 撞墙）→ 空（miss）。
 * 范围：reach 的 path 是两侧牙尖连成的同一道口线，point 是当前牙尖；咬合与吞壁都读服务端给的闭合点。
 * 数：`data.power`（这一口实际威力）绑定咬合火花量，`data.wards`（真实清除的层数）绑定碎片量，
 * `data.openRadius`（开口半宽，随伸出收窄）驱动闭合、`data.scale`（咬合半径 / 0.5）放范围。
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
        reach: {
            duration: 40,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "jaws", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/fang",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.04, 0.14], spread: 8,
                    lifetime: [5, 10], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xF0E0FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "closing", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    shape: { kind: "circle", radius: { data: "openRadius", fallback: 0.5 } },
                    orient: "direction", rate: 18, direction: "inward", speed: [0.04, 0.12],
                    lifetime: [6, 12], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xD060C0, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        bite: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "jaws", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/bite",
                    shape: { kind: "polyline" },
                    rate: 22, direction: "shape", speed: [0.04, 0.12],
                    lifetime: [6, 12], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xF0E0FF, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 70
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
                    name: "teeth", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "circle", radius: { data: "openRadius", fallback: 0.06 } },
                    orient: "direction", direction: "inward", speed: [0.06, 0.18],
                    lifetime: [6, 12], size: [0.26, 0.1],
                    color: 0xF0E0FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        devour: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shards", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "wards", fallback: 1 }, interval: 1, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.08, 0.26],
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xE8C8FF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "inward", speed: [0.12, 0.24],
                    lifetime: [10, 18], size: [0.5, 0.16], sizeMode: "sin",
                    color: 0xD060C0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        blocked: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "clash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xB090C0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.6, 0],
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
