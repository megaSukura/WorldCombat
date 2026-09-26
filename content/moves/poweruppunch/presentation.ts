/**
 * 增强拳 / poweruppunch 的客户端表现。
 *
 * 一句话：收拳时指节上聚起一层硬光，直拳打出去沿方向掠过一道短刃似的拳风；命中的一下在接触点炸开拳击星火，
 *   拳头上随即亮起一圈更硬的黄光，级别越高越亮——打满时爆出一圈最亮的硬光。
 * 色相家族：格斗暖黄（impact_fighting / hollowfist）与近白（fist / glowingsparkle_yellow）；饱和只在拳与爆发的小面积。
 * 拍子：起 draw（收拳聚光）→ 击 jab（出拳）与 harden（命中硬化）→ 满 peak ／ 空 whiff → 续 linger ／ 散 fade。
 * 范围：jab 的拳风沿 `data.direction` 指向出拳方向、长度取自 `data.reach`；harden 的爆发落在命中点。
 * 运动：拳风沿方向掠出，命中向四周炸开，硬化光从拳面升起并绕拳旋转。
 * 数：`data.sparks`（物攻派生的拳火花数）驱动拳风与爆发的粒子量；`data.total`（本窗口实际硬化级数，0–6）
 *   决定拳头硬光的层数与亮度，`data.gained` 让本次提升的那一下单独闪一次（续期未涨级时为 0，不冒环片升级）；
 *   `data.intensity`（拳威力与当前物攻等级派生）放大整幕。画面里的数量和机制一致。
 * 生命周期：linger 由服务端 `WorldFeedback.onEffect` 挂在真正的 boostWindow 上，随该窗口自然到期、刷新
 *   或被清除一起收；整招结束不额外延长这层硬光。
 */
const PoweruppunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "knuckle_glow", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0xFFE6A8, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xD8C08A, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        jab: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gust", bind: "source", offset: [0, 0.5, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    orient: "direction",
                    rate: { data: "sparks", fallback: 16 }, shape: { kind: "line", length: { data: "reach", fallback: 2.4 } },
                    direction: "shape", speed: [0.06, 0.22], spread: 12,
                    lifetime: [5, 9], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "fist", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    orient: "direction",
                    burst: { count: 2, at: 0 }, shape: { kind: "line", length: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [5, 9], size: [0.24, 0.06],
                    color: 0xFFF4D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 16
                }
            ]
        },
        harden: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], spread: 22,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "knuckle", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "total", fallback: 1 }, at: 0, interval: 3, repeats: { data: "gained", fallback: 1 } },
                    shape: { kind: "circle", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xFFC94F, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "shard", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0xE8C878, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        peak: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "hardest", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 3, at: 0 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.34, 0.07], sizeMode: "index",
                    color: 0xFFE6A0, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 24
                },
                {
                    name: "flash", bind: "source", offset: [0, 0.05, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 0 }, shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.5, 0.16],
                    color: 0xFFD46A, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "glint", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26,
                    lifetime: [7, 13], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFF4A8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xD8C08A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "hardglow", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: { data: "total", fallback: 1 }, shape: { kind: "circle", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.11, 0.02],
                    color: 0xFFC94F, alpha: [0.55, 0], light: "full", maxParticles: 20
                },
                {
                    name: "knuckletrail", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.07, 0.02],
                    color: 0xFFE6A8, alpha: [0.5, 0], light: "full", maxParticles: 14
                },
                {
                    name: "fullring", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "full", fallback: 0 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [8, 14], size: [0.13, 0.03],
                    color: 0xFFF0B0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "cool", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD8C08A, alpha: [0.6, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poweruppunch", 1, PoweruppunchDefinition);
