/**
 * 宇宙力量 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：夜空般的深蓝从头顶压下来，一道星柱垂直落进施法者身体，星尘一路坠下、脚边浮出一圈星座；
 *   光柱在它身上维持着，星辉散去时星点一点点飘没。
 *
 * 色相家族：深靛蓝（0x5B4BC4）作主体，星白（0xEAF0FF）与淡青（0x9FE8FF）只出现在星光与星座点上；没有暖色。
 * 层次：落星（起）／星柱、星尘与星座（击）／持续的光柱（收）／星点飘没（末）。
 * 起击收：descend（引星）→ pour（承星）→ column（维持）→ wane（星灭）。
 * 范围：脚边星座与光柱半径按 `data.ring`／`data.columnRadius` 推出，画出来的圈就是星辉罩到的范围。
 * 运动：星尘自上方一列竖直落下；星座点在脚边一圈排开；维持期光柱里星尘缓慢上浮。
 * 数：星尘量绑 `data.halo`（两防与等级派生），星座点数绑 `data.constellation`（等级派生），柱长绑 `data.shaft`（体型派生）。
 * 持续状态：维持期只留一道半透明光柱与稀疏星尘，视线仍看得到目标。
 */
const CosmicPowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        descend: {
            duration: 26,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "descend_mote", bind: "source", fit: "none", height: 0, offset: [0, { data: "shaft", fallback: 5 }, 0],
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
                    name: "pour_column", bind: "source", fit: "none", height: 0, offset: [0, { data: "shaftHalf", fallback: 2.5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    shape: { kind: "cylinder", radius: { data: "columnRadius", fallback: 0.75 }, length: { data: "shaft", fallback: 5 } },
                    rate: 40, direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 30], size: [0.4, 0.9],
                    color: 0x5B4BC4, alpha: [0.22, 0], light: "world", maxParticles: 120
                },
                {
                    name: "pour_star", bind: "source", fit: "none", height: 0, offset: [0, { data: "shaft", fallback: 5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "halo", fallback: 20 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "ring", fallback: 1.5 } },
                    direction: "down", speed: [0.1, 0.28], gravity: 0.004, spin: 10,
                    lifetime: [16, 28], size: [0.16, 0.03],
                    color: 0xEAF0FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "pour_constellation", bind: "point", fit: "none", offset: [0, 0.06, 0],
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
            exit: { drain: 30 },
            emitters: [
                {
                    name: "column_body", bind: "source", fit: "none", height: 0, offset: [0, { data: "shaftHalf", fallback: 2.5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    shape: { kind: "cylinder", radius: { data: "columnRadius", fallback: 0.75 }, length: { data: "shaft", fallback: 5 } },
                    rate: 8, direction: "up", speed: [0.01, 0.03], drag: 0.95,
                    lifetime: [18, 32], size: [0.35, 0.7],
                    color: 0x5B4BC4, alpha: [0.16, 0], light: "world", maxParticles: 50
                },
                {
                    name: "column_mote", bind: "source", fit: "none", height: 0, offset: [0, { data: "shaft", fallback: 5 }, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 4, shape: { kind: "circle", radius: { data: "ring", fallback: 1.5 } },
                    direction: "down", speed: [0.04, 0.12],
                    lifetime: [16, 28], size: [0.1, 0.02],
                    color: 0xEAF0FF, alpha: [0.4, 0], light: "full", bloom: 0.25, maxParticles: 26
                },
                {
                    name: "column_ground", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, shape: { kind: "ring", radius: { data: "ring", fallback: 1.5 } },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0x9FE8FF, alpha: [0.3, 0], light: "full", maxParticles: 18
                }
            ]
        },
        wane: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "wane_mote", bind: "source", fit: "none", height: 0, offset: [0, { data: "shaftHalf", fallback: 2.5 }, 0],
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
