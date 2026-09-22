/**
 * 摇晃舞 / teeterdance 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者左右摇摆起来，一圈紫色的音波与音符从脚下荡开；被带进节奏的人头顶转起迷路的飞鸟，
 * 身子跟着一歪一歪。
 * 色相家族：幽紫（0xB15CE0）为主体，深紫（0x6A2FA0）压在核心，近白只做高光；没有第二个色相。
 * 拍子：起（windup 起势）→ 击（dance 舞圈荡开、daze 逐人晃晕）→ 收（sway 存续期一歪一歪，steady 无人被带进）。
 * 范围：dance 绑 `point`，形状半径读 `data.radius`（真实舞圈半径），玩家看到的圈就是会被晃到的人。
 * 运动：音波环整圈向外荡，音符沿圈起伏；被晃到的人每隔一小段从身侧甩出一小撮音符与飞鸟。
 * 数：音符与光点量按 `data.motes`（特攻派生）派生，舞圈拍数按 `data.beats`（等级派生）派生。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const TeeterdanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "windup_sway", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 14, shape: { kind: "ring", radius: 0.5, arcDegrees: 220 },
                    direction: "shape", speed: [0.02, 0.12], spread: 12,
                    lifetime: [10, 18], size: [0.35, 0.12],
                    color: 0x6A2FA0, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "windup_note", bind: "source", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 3, interval: 5, repeats: 2 },
                    shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.16, 0.05], sizeMode: "sin",
                    alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        },
        dance: {
            duration: 34,
            exit: { stop: 14, drain: 24 },
            emitters: [
                {
                    name: "dance_wave", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "beats", fallback: 3 }, interval: 6 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.04, 0.16], spread: 10,
                    lifetime: [14, 24], size: [0.7, 1.5], sizeMode: "linear",
                    color: 0xB15CE0, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "dance_note", bind: "point", offset: [0, 0.55, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "motes", fallback: 20 }, interval: 6, repeats: { data: "beats", fallback: 3 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4 } },
                    direction: "up", speed: [0.03, 0.14], spread: 20,
                    gravity: 0.01, drag: 0.96,
                    lifetime: [16, 28], size: [0.2, 0.06], sizeMode: "sin",
                    alpha: [0.75, 0], light: "full", maxParticles: 160
                },
                {
                    name: "dance_glint", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 20, shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xD9B8FF, alpha: [0.4, 0], light: "full", maxParticles: 70
                }
            ]
        },
        daze: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "daze_bird", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.22, 0.1], sizeMode: "sin",
                    color: 0xB15CE0, alpha: [0.6, 0], light: "full", maxParticles: 16
                },
                {
                    name: "daze_note", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "motes", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.18], spread: 26,
                    lifetime: [12, 22], size: [0.16, 0.04], sizeMode: "index",
                    alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        sway: {
            duration: 18,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "sway_wobble", bind: "target", offset: [0, 0.15, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "motes", fallback: 6 }, at: 1 },
                    shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.12, 0.03], sizeMode: "sin",
                    alpha: [0.4, 0], light: "full", maxParticles: 14
                },
                {
                    name: "sway_ring", bind: "target", offset: [0, 0.05, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.24, 0.4], sizeMode: "linear",
                    color: 0x6A2FA0, alpha: [0.35, 0], light: "world", maxParticles: 8
                }
            ]
        },
        steady: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "steady_fizzle", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0x6A2FA0, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_teeterdance", 1, TeeterdanceDefinition);
