/**
 * 蛸固 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：术者身侧盘起几条紫色触手，猛地沿直线弹射出去咬住目标，把它拖慢牵制；此后每过一拍，
 *   触手从术者身上朝目标再绷紧一次、目标身上泛起一圈被勒紧的暗紫，直到触手松开或术者倒下。
 * 色相家族：暗紫（0x8E4FA8 主体 / 0xB070C8 触手）加淡粉白高光（0xEAD6F2）；一个色相家族。
 * 拍子：起（coil 盘起）→ 击（lash 弹射咬住、hold 持续绷线、逐拍 squeeze 勒紧）→ 收（release／slip 松脱）。
 * 范围：lash 与 squeeze 沿 `data.path`（术者→目标）绷成一条触手束，玩家一眼看出缠在哪；hold 是绑在托管触手效果上的持续绷线，效果一收即断；目标脚下那圈按 `data.scale` 缩放。
 * 运动：coil 的触手向身侧收拢；lash 沿路径向外弹出；hold 保持两头相连、按 `data.tension`（勒紧进度）颤动；squeeze 时整束朝目标方向周期性收紧、目标被向内聚拢。
 * 数：触手道数按 `data.tentacles`（特攻换算）派生，勒紧次数按 `data.round`（已勒几拍）派生，双防降幅按 `data.drops` 派生。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const OctolockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "coil_tendrils", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.75 },
                    direction: "inward", speed: [0.05, 0.16], spin: 2,
                    lifetime: [9, 16], size: [0.2, 0.04],
                    color: 0x8E4FA8, alpha: [0.7, 0], light: "world", maxParticles: 34
                },
                {
                    name: "coil_glint", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 6, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 13], size: [0.08, 0.01],
                    color: 0xEAD6F2, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        },
        lash: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "lash_tendrils", bind: "path", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: { data: "tentacles", fallback: 10 }, repeats: 6, interval: 3 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.04, 0.16], spread: 10,
                    lifetime: [9, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0x8E4FA8, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "lash_glint", bind: "path", offset: [0, 0.82, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "tentacles", fallback: 10 }, repeats: 6, interval: 3 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.18],
                    lifetime: [7, 12], size: [0.07, 0.01],
                    color: 0xEAD6F2, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "lash_grip", bind: "target", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [12, 18], size: [0.36, 0.75], sizeMode: "linear",
                    color: 0xB070C8, alpha: [0.85, 0], light: "full", maxParticles: 6
                }
            ]
        },
        hold: {
            duration: 0,
            exit: { stop: 2, drain: 12 },
            emitters: [
                {
                    name: "hold_tendrils", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grab",
                    rate: { data: "tentacles", fallback: 10 },
                    shape: { kind: "polyline" }, direction: "away", speed: [0.01, 0.05], spread: 8, spin: 2,
                    lifetime: [7, 12], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0x8E4FA8, alpha: [{ data: "tension", fallback: 0.4 }, 0.02], alphaMode: "sin", light: "world", maxParticles: 48
                },
                {
                    name: "hold_glint", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "polyline" }, direction: "away", speed: [0.02, 0.07],
                    lifetime: [4, 8], size: [0.06, 0.01],
                    color: 0xEAD6F2, alpha: [0.25, 0], light: "full", maxParticles: 24
                }
            ]
        },
        squeeze: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "squeeze_tendrils", bind: "path", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/grab",
                    rate: { data: "tentacles", fallback: 10 },
                    shape: { kind: "polyline" }, direction: "toward", speed: [0.02, 0.09],
                    lifetime: [8, 14], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0x8E4FA8, alpha: [0.5, 0.05], alphaMode: "sin", light: "world", maxParticles: 60
                },
                {
                    name: "squeeze_wring", bind: "target", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "drops", fallback: 2 }, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.34, 0.6], sizeMode: "index",
                    color: 0xB070C8, alpha: [0.8, 0], light: "full", maxParticles: 10
                },
                {
                    name: "squeeze_pinch", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0x8E4FA8, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        },
        release: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "release_scatter", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.02, drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xB070C8, alpha: [0.6, 0], light: "world", maxParticles: 34
                }
            ]
        },
        slip: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slip_scatter", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0x8E4FA8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fizzle: {
            duration: 14,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "fizzle_drip", bind: "point", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x8E4FA8, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_octolock", 1, OctolockDefinition);
