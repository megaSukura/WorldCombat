/**
 * 珍藏 / lastresort 的客户端表现。
 *
 * 一句话：站定沉腰，脚下收拢起一圈金白的光，光随伤势越亮；随后整副身板贴地直撞出去，撞实的一刻炸开暖金的
 * 重击与翻卷的尘环，把人沿冲势推远。
 * 色相家族：暖金与近白（FFF0C8 / E8C56A / FFFCF0）为主，伤势重时更白更亮；没有冷色。
 * 拍子：起 gather（收拢金光）→ 撞 charge（贴地直冲）→ 击 slam（命中峰值）→ 收 miss / whiff（落空刹停）。
 * 范围：slam 绑命中点、画出的就是撞实的位置；gather 的地面环绑施法者脚边，随伤势变亮变大。
 * 运动：gather 的光点从四周向内收进脚下，charge 沿冲撞方向拖出土线与金点，slam 的冲击向外炸并翻起尘环。
 * 数：`data.orbs`（已损失生命与威力派生）决定起手光点数，`data.count`（威力派生）决定命中冲击与碎屑数，
 * `data.wound`（已损失生命比例）抬高亮度与冲击规模，`data.scale`（判定半径 / 0.5）放大判定轮廓。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const LastresortDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "hoard", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "orbs", fallback: 14 }, interval: 4, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.13],
                    lifetime: [7, 13], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xFFF0C8, alpha: [{ data: "bright", fallback: 0.5 }, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.0, 0.02],
                    lifetime: [9, 15], size: [0.36, 0.72], sizeMode: "sin",
                    color: 0xE8C56A, alpha: [0.35, 0], light: "world", maxParticles: 14
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xFFFCF0, alpha: [{ data: "bright", fallback: 0.5 }, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        charge: {
            duration: 42,
            exit: { stop: 32, drain: 14 },
            emitters: [
                {
                    name: "start", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 16], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x9A7B3A, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "trail", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 26, trail: { minDistance: 0.34 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xE8C56A, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 130
                },
                {
                    name: "speed", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "box", size: [0.3, 0.32, 0.3] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [3, 7], size: [0.15, 0.05],
                    color: 0xFFF0C8, alpha: [0.4, 0], light: "full", maxParticles: 110
                }
            ]
        },
        slam: {
            duration: 34,
            exit: { stop: 15, drain: 18 },
            emitters: [
                {
                    name: "crush", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 26 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [5, 10], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFCF0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "shake", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 22, at: 1 },
                    shape: { kind: "ring", radius: 0.56 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [9, 17], size: [0.34, 0.08],
                    color: 0xE8C56A, alpha: [{ data: "bright", fallback: 0.5 }, 0], light: "world", maxParticles: 40
                },
                {
                    name: "grit", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 26 } },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.07, 0.24],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [9, 16], size: [0.08, 0.02],
                    color: 0xC7A96A, alpha: [0.6, 0], light: "world", maxParticles: 150
                }
            ]
        },
        whiff: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.32, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.06, 0.02],
                    color: 0xA89A6A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.03], sizeMode: "index",
                    color: 0x9A7B3A, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lastresort", 1, LastresortDefinition);
