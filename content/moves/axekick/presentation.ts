/**
 * 下压踢 / axekick 的客户端表现。
 *
 * 一句话：施法者短垫一步站定，把腿抬到高处、在面前竖起一条斧刃般的窄竖线，随即脚跟沿这条线直劈而下；
 * 劈实的一刻在对手头顶炸开紫白冲击，被劈晕的头顶绕起困惑飞鸟；竖带空着则脚跟砸地扬尘。
 * 色相家族：紫（0x9B6BE0）与钢白（0xE8E4F5）为主体，扬尘用中性 tinydust。
 * 拍子：起 windup（抬腿）→ 抬 raise（腿/脚跟高亮 + 竖带亮起）→ 劈 chop（竖带从上到下）→ 击 impact ＋ daze ／ 失 crash。
 * 范围：raise 的 `bind:"path"` 就是面前那条窄竖带的真实顶点（地面 → 抬起高度），chop 再把它从上到下劈一遍；
 *   判定与表现共用同一组顶点。impact 打在对手头顶的实触点，crash 落在竖带脚下的真地面。
 * 运动：raise 是绕脚跟收束的紫白高亮，chop 是沿 `data.direction`（竖直向下）的下劈速度线。
 * 数：`data.count`（劈劲派生）决定命中迸发量，`data.dust`（体重与物攻派生）决定扬尘密度，
 *   `data.intensity`（劈劲 / 120）抬高亮度，`data.chance`（恍惚概率）决定 daze 层的密度与亮度，
 *   `data.scale`（竖带半宽 / 0.42）放大尺寸。
 */
const AxekickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "plant", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.11], spread: 12,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xB0A08A, alpha: [0.5, 0], gravity: 0.03, light: "world", maxParticles: 26
                },
                {
                    name: "blade", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 8, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 13], size: [0.2, 0.05],
                    color: 0x9B6BE0, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        },
        raise: {
            duration: { data: "raiseTicks", fallback: 20 },
            exit: { drain: 12 },
            emitters: [
                {
                    name: "leg", bind: "source", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 18, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x9B6BE0, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "heel", bind: "source", height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 16, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 10], size: [0.16, 0.04],
                    color: 0xE8E4F5, alpha: [0.7, 0], light: "full", maxParticles: 46
                },
                {
                    name: "band", bind: "path", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 24, speed: [0.02, 0.08], spread: 6,
                    lifetime: [6, 11], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xE8E4F5, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "grit", bind: "source", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "dust", fallback: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14], spread: 16,
                    lifetime: [8, 15], size: [0.08, 0.02], sizeMode: "index",
                    color: 0xB0A08A, alpha: [0.45, 0], gravity: 0.04, drag: 0.92, light: "world", maxParticles: 70
                }
            ]
        },
        chop: {
            duration: { data: "chopTicks", fallback: 18 },
            exit: { drain: 12 },
            emitters: [
                {
                    name: "heel", bind: "path", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 32, speed: [0.02, 0.1], spread: 12,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xE8E4F5, alpha: [0.75, 0], light: "full", maxParticles: 90
                },
                {
                    name: "fall", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "box", size: [0.24, 0.24, 0.24] },
                    direction: "shape", speed: [0.04, 0.16], trail: { minDistance: 0.2 },
                    lifetime: [5, 9], size: [0.16, 0.04],
                    color: 0x9B6BE0, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28], spread: 16,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF2EEFB, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "crown", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.07, 0.19], spread: 10,
                    lifetime: [10, 16], size: [0.26, 0.06],
                    color: 0xC9B4EE, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        daze: {
            duration: 40,
            exit: { stop: 18, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "target", height: 0.95, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: { data: "chance", fallback: 0.3 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.12], spread: 6,
                    lifetime: [14, 22], size: [0.24, 0.05],
                    color: 0xB98CFF, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "spark", bind: "target", height: 0.8, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xE8E4F5, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        linger: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "orbit", bind: "target", height: 1.0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 6, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07], spread: 4,
                    lifetime: [14, 22], size: [0.2, 0.04],
                    color: 0xB98CFF, alpha: [0.45, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fumble: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "jolt", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 7 },
                    shape: { kind: "hemisphere", radius: 0.36, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.2],
                    lifetime: [9, 15], size: [0.15, 0.04],
                    color: 0xB98CFF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        crash: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "thud", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.19], spread: 14,
                    lifetime: [9, 15], size: [0.4, 0.1], sizeMode: "index",
                    color: 0xB0A08A, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "grit", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    lifetime: [9, 16], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.04, drag: 0.9, light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_axekick", 1, AxekickDefinition);
