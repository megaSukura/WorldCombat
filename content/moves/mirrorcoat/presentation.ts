/**
 * 镜面反射 / mirrorcoat 的客户端表现。
 *
 * 一句话：施法者在身前立起一面发亮的镜、把最近吃下的特殊伤害映在镜面上（账越大镜面越满）→
 * 光束脱手、有账主就追着飞、只有空点就朝瞄准方向直射 → 命中时按真实回执把那笔能量炸开；
 * 撞到方块或被免疫则在接触点碎成片（shatter），没有账时镜面只闪一下就散。
 * 色相家族：浅青到近白（screen / psyswirl / impact_psychic / glowingsparkle_cyan），落空时降为灰。
 * 拍子：起 mirror（立镜）→ 发 muzzle、飞 flight → 击 reflect（真实回执命中）／碎 shatter（撞墙/被挡）／镜闪 whiff。
 * 范围：mirror 的镜面半径由 `data.scale`（镜面半径派生）给出；reflect/shatter 的爆环同样按判定半径画。
 * 运动：mirror 的镜面正对目标立起；flight 沿光束轨迹拖出青白尾迹；reflect 由内向外炸，shatter 沿接触面向外碎。
 * 数：`data.panes`（账本伤害派生）决定立镜粒子量，`data.count`（这次实际扣血派生）决定命中碎片数量。
 */
const MirrorcoatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mirror: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "pane", bind: "source", offset: [0, 0, 0], height: 0.55, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: { data: "panes", fallback: 16 }, shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.15 },
                    direction: "shape", speed: [0.01, 0.05], spread: 180,
                    lifetime: [6, 12], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xBFE9FF, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "rim", bind: "source", offset: [0, 0, 0], height: 0.55, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 6, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8FBFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        muzzle: {
            duration: 16,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.8 } },
                    direction: "outward", speed: [0.08, 0.18],
                    lifetime: [8, 12], size: [0.36, 0.14],
                    color: 0xBFE9FF, alpha: [0.8, 0], light: "full"
                }
            ]
        },
        flight: {
            duration: 60,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "trace", bind: "projectile", trail: { minDistance: 0.22 },
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 60,
                    shape: { kind: "sphere", radius: 0.12 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.11, 0.03],
                    color: 0xE8FBFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 120
                }
            ]
        },
        reflect: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xBFE9FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "count", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.14, 0.4], spread: 26,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xE8FBFF, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 15], size: [0.44, 0.18],
                    color: 0x8FC7E8, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        shatter: {
            // 命中被免疫、或光束撞到方块时：碎光在接触点散开，明确表达「打碎/被挡下」而不是命中。
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "glass", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.1, 0.3], spread: 40,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xE8FBFF, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "shard", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 11], size: [0.16, 0.04],
                    color: 0x9AA6AD, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "glint", bind: "source", offset: [0, 0, 0], height: 0.55, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 6 },
                    shape: { kind: "circle", radius: 0.4, thickness: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 10], size: [0.18, 0.05],
                    color: 0x9AA6AD, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "source", offset: [0, 0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 5 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.16, 0.05],
                    color: 0x8A8A8A, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mirrorcoat", 1, MirrorcoatDefinition);
