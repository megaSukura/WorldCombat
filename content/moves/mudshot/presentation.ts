/**
 * 泥巴射击 / mudshot 的客户端表现。
 *
 * 一句话：脚边抓起一团湿泥压成扁块，贴着地面平甩出去——泥块一路甩下细泥点，砸在目标脚下炸开一圈低平的泥花，
 * 泥浆顺着泼溅糊上附近人的腿脚，落点地上留下一片湿泥。
 * 色相家族：湿泥的棕（0x6E5438）与浅褐（0x9A7B54），余韵收在近白的细尘。
 * 拍子：起 gather（抓泥收拢）→ 飞 streak（平飞拖泥）→ 泼 splash（泥花贴地炸开）→ 糊 mire / coated（腿脚挂泥）→ 收 slick（地上一道短污痕）。
 * 范围：splash 的地环与 slick 的污痕按 `data.scale`（泼溅半径 / 0.9）铺开，就是真正被糊到的地面范围；slick 只是一道痕迹，不铺持续减速场。
 * 运动：泥块沿低弧平飞（服务端 ballistic 方向）；命中处泥点低平向外抛，腿脚上的泥向下滴。
 * 数：splash 的泥点数绑定 `data.coat`（特攻与等级换算），mire 的泥迹密度绑定 `data.stages`（掉速等级），
 *   强度绑定 `data.intensity`（本击威力 / 50），阔泼时点更多、范围更开。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MudshotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "clump", bind: "source", offset: [0, 0.12, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0x6E5438, alpha: [0.7, 0.1], light: "world", maxParticles: 24
                },
                {
                    name: "draw", bind: "source", offset: [0, 0.18, 0], height: 0.18,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [7, 12], size: [0.06, 0.01],
                    color: 0x9A7B54, alpha: [0.8, 0], light: "world", maxParticles: 30
                },
                {
                    name: "wide_mud", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    rate: { data: "wide", fallback: 0 },
                    shape: { kind: "sphere_surface", radius: 0.5 }, direction: "inward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x6E5438, alpha: [0.75, 0], light: "world", maxParticles: 34
                }
            ]
        },
        streak: {
            emitters: [
                {
                    name: "clod", bind: "projectile", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    trail: { minDistance: 0.28 }, rate: 24,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.22, 0.12],
                    color: 0x6E5438, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "spray", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.2 }, rate: { data: "coat", fallback: 16 },
                    direction: "velocity", speed: [0.0, 0.04], spread: 18,
                    gravity: 0.02, drag: 0.94,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0x9A7B54, alpha: [0.7, 0], light: "world", maxParticles: 80
                }
            ]
        },
        splash: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "coat", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.15, 0.03], sizeMode: "index",
                    color: 0x6E5438, alpha: [0.95, 0], light: "world", maxParticles: 90
                },
                {
                    name: "ground_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.26, 0.5],
                    color: 0x6E5438, alpha: [0.5, 0], light: "world"
                },
                {
                    name: "spray_out", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "coat", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.9 } },
                    direction: "outward", speed: [0.08, 0.26], spread: 30,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x9A7B54, alpha: [0.8, 0], light: "world", maxParticles: 70
                }
            ]
        },
        coated: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "splash", bind: "target", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "coat", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x6E5438, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mire: {
            duration: { data: "tick", fallback: 60 },
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "legs", bind: "target", offset: [0, 0.22, 0], height: 0.22,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash", spriteFrom: "random",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "down", speed: [0.0, 0.02],
                    lifetime: [16, 30], size: [0.16, 0.05],
                    color: 0x6E5438, alpha: [0.85, 0.15], light: "world", maxParticles: 16
                },
                {
                    name: "drips", bind: "target", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 2, shape: { kind: "sphere", radius: 0.22 },
                    direction: "down", speed: [0.0, 0.02], gravity: 0.06, drag: 0.92,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0x9A7B54, alpha: [0.7, 0], light: "world", maxParticles: 14
                }
            ]
        },
        slick: {
            duration: { data: "tick", fallback: 40 },
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "stain", bind: "point", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 3, shape: { kind: "circle", radius: { data: "scale", fallback: 0.9 } },
                    direction: "outward", speed: [0.0, 0.015],
                    lifetime: [20, 40], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0x6E5438, alpha: [0.4, 0.06], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mudshot", 1, MudshotDefinition);
