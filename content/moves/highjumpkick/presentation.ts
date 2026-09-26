/**
 * 飞膝踢 / highjumpkick 的客户端表现。
 *
 * 一句话：施法者压腿蓄力后几乎笔直拔上高空，顶点短暂悬停时在正下方地面亮出落点环，随即膝头朝下砸进环心，
 * 砸实的一刻炸开深红近白的格斗冲击与一圈碎石；砸偏则是膝盖硬磕地面。
 * 色相家族：深红（0xE25C4A）与近白（0xFFF0E8）为主体，落尘用中性 tinydust。
 * 拍子：起 windup（压腿）→ 拔 leap（竖直气柱）→ 停 apex（顶点落点环）→ 坠 dive（直坠线）→ 击 impact ／ 失 crash。
 * 范围：apex 的落点环按 `data.hitRadius` 铺在 `data.point` 上，把这一膝会砸到的位置画给对手看；dive 的竖直下降线
 *   沿 `bind:"path"` 从当前位置连到落点。
 * 运动：leap 是笔直向上的速度线，apex 是头顶收束、脚下落点环一明一暗，dive 是沿 `data.direction` 的竖直冲刺。
 * 数：`data.count`（膝劲派生）决定命中迸发量，`data.dust`（体重与物攻派生）决定扬尘密度，
 *   `data.intensity`（膝劲 / 130）抬高亮度，`data.scale`（膝击判定 / 0.7）放大尘环。
 */
const HighjumpkickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "plant", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.46 },
                    direction: "inward", speed: [0.03, 0.12], spread: 12,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xB08A78, alpha: [0.5, 0], gravity: 0.03, light: "world", maxParticles: 30
                },
                {
                    name: "coil", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    rate: 9, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 13], size: [0.18, 0.05],
                    color: 0xE25C4A, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        },
        leap: {
            duration: 26,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "column", bind: "source", height: 0.0, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    rate: 34, shape: { kind: "line", length: { data: "height", fallback: 3.6 } },
                    direction: "up", speed: [0.07, 0.24], spread: 6,
                    lifetime: [7, 12], size: [0.15, 0.03],
                    color: 0xFFE0D6, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "rise", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "dust", fallback: 16 }, shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.05, 0.16], spread: 16,
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xB08A78, alpha: [0.5, 0], gravity: 0.04, drag: 0.92, light: "world", maxParticles: 90
                }
            ]
        },
        apex: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 10], size: [0.16, 0.04],
                    color: 0xE25C4A, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "aim", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 26, shape: { kind: "ring", radius: { data: "hitRadius", fallback: 0.7 } },
                    direction: "outward", speed: [0.04, 0.14], spread: 6,
                    lifetime: [8, 14], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xFFB0A0, alpha: [0.65, 0], light: "full", maxParticles: 60
                }
            ]
        },
        dive: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "path", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    shape: { kind: "polyline" },
                    rate: 26, speed: [0.02, 0.09], spread: 16,
                    lifetime: [6, 11], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xFFF0E8, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "rush", bind: "source", height: 0.35, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 32, shape: { kind: "box", size: [0.3, 0.26, 0.3] },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.22 },
                    lifetime: [5, 9], size: [0.18, 0.05],
                    color: 0xE25C4A, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.08, 0.3], spread: 16,
                    lifetime: [7, 13], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFF0E8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    lifetime: [9, 16], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.04, drag: 0.9, light: "world", maxParticles: 70
                }
            ]
        },
        crash: {
            duration: 30,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "thud", bind: "source", height: 0.05, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "dust", fallback: 16 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.07, 0.24], spread: 14,
                    lifetime: [9, 16], size: [0.5, 0.12], sizeMode: "index",
                    color: 0xB08A78, alpha: [0.65, 0], light: "world", maxParticles: 70
                },
                {
                    name: "grit", bind: "source", height: 0.25, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.07, 0.26], spread: 22,
                    lifetime: [9, 16], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.04, drag: 0.9, light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_highjumpkick", 1, HighjumpkickDefinition);
