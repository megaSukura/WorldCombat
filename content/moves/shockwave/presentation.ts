/**
 * 电击波 / shockwave 的客户端表现。
 *
 * 一句话：指尖攒起电光，随后一道折线电流贴地窜向目标脚下，命中处炸开电火花；湿地或雨中多溅起一层水花。
 * 色相家族：电黄与近白（electricity_white、electricity_yellow、impact_electric），湿地补一层水青。
 * 拍子：起（charge 聚电）→ 击（bolt 折线电流、hit 命中）→ 收（wet 水花、miss 余电）。
 * 范围：bolt 用 path 画出服务端判定的同一组折线顶点，电流走到哪、够多远，画面就是那条线。
 * 运动：电流沿折线从施法者跳到落点，命中点向四周溅开。
 * 数：`data.flow`（折数换算的流量）绑定 bolt 的发射率，`data.notes`（命中强度换算的碎电数）绑定 hit 的爆发数量，
 * `data.intensity`（威力 / 70）抬高亮度，`data.scale` 缩放判定环，`data.wet` 决定是否加一层水花。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShockwaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 26, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [4, 9], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFFF27A, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "crackle", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 14, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [4, 9], size: [0.18, 0.05],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        },
        bolt: {
            duration: 30,
            exit: { stop: 18, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "path", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: { data: "flow", fallback: 90 }, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.26, 0.06], sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.95, 0], light: "full", bloom: 0.6, maxParticles: 360
                },
                {
                    name: "spark", bind: "path", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" },
                    rate: { data: "flow", fallback: 90 }, direction: "shape", speed: [0.05, 0.2], spread: 20,
                    lifetime: [4, 10], size: [0.12, 0.03],
                    color: 0xFFF27A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 220
                },
                {
                    name: "ground_dust", bind: "path", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 34, direction: "shape", speed: [0.03, 0.12], spread: 24,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x9C8455, alpha: [0.4, 0], light: "world", maxParticles: 160
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "notes", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.65, maxParticles: 80
                },
                {
                    name: "burst", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "notes", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 12,
                    lifetime: [5, 12], size: [0.14, 0.04],
                    color: 0xFFF27A, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                }
            ]
        },
        wet: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0x9BDCFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "conduct", bind: "point", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "ground_out", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shockwave", 1, ShockwaveDefinition);
