/**
 * 宇宙力量 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：夜空般的深蓝从头顶压下来，一道星柱垂直落进施法者身体，星尘一路坠下、脚边浮起一圈星点；
 *   光柱在它身上维持着，星辉散去时星点一点点飘没。
 *
 * 色相家族：深靛蓝（0x5B4BC4）作主体，星白（0xEAF0FF）与淡青（0x9FE8FF）只出现在星光与星点上；没有暖色。
 * 层次：落星（起）／星柱、星尘与星点（击）／稀疏星环（收）／星点飘没（末）。
 * 起击收：descend（引星）→ pour（承星）→ column（维持）→ wane（星灭）。
 * 范围：脚边星点与星环半径按 `data.ring` 推出，画出来的圈就是星辉罩到的范围。
 * 运动：主体星点与散尘都自上方一列竖直落下，星点在脚边一圈排开；维持期只留稀疏星点在脚边明灭。
 * 数：星尘量绑 `data.halo`（两防与等级派生），星点数量绑 `data.constellation`（等级派生），柱长绑 `data.shaft`（体型派生）；
 *   起手时长绑 `data.prepare`，主体星点的落速绑 `data.fall`（真实柱顶到身体点 ÷ 起手），正好在起手内落进身体，
 *   散尘保留随机落速作陪衬。数量只是粒子预算，不承诺固定星座形状。
 * 几何：ring/shaft/columnRadius/nightRadius 都是世界单位，发射器统一 `fit: "world"`，起手与提交两幕同尺度。
 * 持续状态：维持期不立遮挡光柱；弱光（日光低于四分之一）实际多出的那一级（`data.night`）点亮半径更大、更密的第二层星环。
 */
const CosmicPowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        descend: {
            duration: { data: "prepare", fallback: 26 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    // 主体星点：自真实柱顶以 data.fall 垂直落下，存活 data.prepare，正好在起手结束时落进身体。
                    name: "descend_star", bind: "source", fit: "world", height: 0, offset: [0, { data: "shaft", fallback: 5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "constellation", fallback: 6 }, interval: 1 },
                    shape: { kind: "circle", radius: 0.32 },
                    direction: "down", speed: { data: "fall", fallback: 0.2 },
                    lifetime: { data: "prepare", fallback: 26 }, size: [0.18, 0.04],
                    color: 0xEAF0FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "descend_mote", bind: "source", fit: "world", height: 0, offset: [0, { data: "shaft", fallback: 5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 18, shape: { kind: "circle", radius: { data: "ring", fallback: 1.5 } },
                    direction: "down", speed: [0.12, 0.32], spin: 6,
                    lifetime: [14, 26], size: [0.14, 0.03],
                    color: 0xEAF0FF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        pour: {
            duration: 48,
            exit: { stop: 18, drain: 28 },
            emitters: [
                {
                    name: "pour_column", bind: "source", fit: "world", height: 0, offset: [0, { data: "shaftHalf", fallback: 2.5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    shape: { kind: "cylinder", radius: { data: "columnRadius", fallback: 0.75 }, length: { data: "shaft", fallback: 5 } },
                    rate: 40, direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 30], size: [0.4, 0.9],
                    color: 0x5B4BC4, alpha: [0.22, 0], light: "world", maxParticles: 120
                },
                {
                    name: "pour_star", bind: "source", fit: "world", height: 0, offset: [0, { data: "shaft", fallback: 5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "halo", fallback: 20 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "ring", fallback: 1.5 } },
                    direction: "down", speed: [0.1, 0.28], gravity: 0.004, spin: 10,
                    lifetime: [16, 28], size: [0.16, 0.03],
                    color: 0xEAF0FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "pour_stardust", bind: "point", fit: "world", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "constellation", fallback: 6 }, interval: 8, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "ring", fallback: 1.5 } },
                    direction: "up", speed: [0.02, 0.08], spin: 4,
                    lifetime: [18, 30], size: [0.3, 0.55],
                    color: 0x9FE8FF, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        column: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "column_stardust", bind: "source", fit: "world", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "ring", radius: { data: "ring", fallback: 1.5 } },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 24], size: [0.09, 0.02],
                    color: 0x9FE8FF, alpha: [0.5, 0], alphaMode: "sin", light: "full", bloom: 0.25, maxParticles: 22
                },
                {
                    name: "column_points", bind: "source", fit: "world", height: 0.12,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "constellation", fallback: 6 }, interval: 12 },
                    shape: { kind: "ring", radius: { data: "ring", fallback: 1.5 } },
                    direction: "up", speed: [0.008, 0.03], spin: 2,
                    lifetime: [16, 28], size: [0.18, 0.04],
                    color: 0xEAF0FF, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "column_night", bind: "source", fit: "world", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "nightRate", fallback: 0 },
                    shape: { kind: "ring", radius: { data: "nightRadius", fallback: 2.2 }, thickness: 0.35 },
                    direction: "up", speed: [0.01, 0.04], spin: 4,
                    lifetime: [16, 28], size: [0.12, 0.03],
                    color: 0xEAF0FF, alpha: [0.55, 0], alphaMode: "sin", light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        wane: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "wane_mote", bind: "source", fit: "world", height: 0, offset: [0, { data: "shaftHalf", fallback: 2.5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 22 }, shape: { kind: "sphere", radius: { data: "ring", fallback: 1.5 } },
                    direction: "down", speed: [0.02, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 24], size: [0.1, 0.01],
                    color: 0x5B4BC4, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_cosmicpower", 1, CosmicPowerDefinition);
