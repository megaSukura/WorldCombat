/**
 * 流星突击 / meteorassault 的客户端表现。
 *
 * 一句话：施法者把粗壮的东西举过头顶，接着在同一条大弧上连续几下重扫，每一下都在身前扇出一片翠绿的挥痕；
 * 挥完头顶开始转圈，标明自己被晃晕。
 * 色相家族：茎叶的翠绿（0x9FCB5A / 0xA8D060）配格斗的浅黄，撞击核心近白；与同族终极冲击的中性白灰、
 * 爆炸烈焰的橙红在色相上分开。
 * 拍子：起（windup 0–8t 举械）→ 击（swing 每段一次，段数由机制 `data.count` 读出）→ 收（daze 起、recharge 维持整段晃晕）。
 * 范围：swing 的锥形扇面半径取 `data.reach`、半张角取 `data.half`，画出来的那片扇面就是实际能扫到的区域。
 * 运动：软挥痕沿扇面朝外的方向铺开，脚下草屑朝外抛；每段朝向由 `data.direction` 决定，段段跟着目标转。
 * 数：`data.count`（挥击段数）、`data.hits`（本段命中数）、`data.intensity`（单段威力 / 52）共同决定挥痕与碎屑密度；
 * `data.seconds`（晃晕秒数）决定头顶晕圈的维持密度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MeteorassaultDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 1.0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 14, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xC8E070, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "brace_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [5, 11], size: [0.05, 0.02],
                    color: 0xA79A6E, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        swing: {
            duration: 24,
            exit: { stop: 14, drain: 14 },
            emitters: [
                {
                    name: "sweep", bind: "source", offset: [0, 0.85, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    orient: "direction",
                    rate: 120, shape: { kind: "cone", radius: 3, angleDegrees: { data: "half", fallback: 55 } },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [4, 9], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xA8D060, alpha: [0.85, 0], light: "full", maxParticles: 320
                },
                {
                    name: "blade_trail", bind: "source", offset: [0, 0.85, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    orient: "direction",
                    burst: { count: { data: "hits", fallback: 4 }, interval: 1, repeats: 3 },
                    shape: { kind: "cone", radius: 3, angleDegrees: { data: "half", fallback: 55 } },
                    direction: "shape", speed: [0.05, 0.16],
                    lifetime: [6, 11], size: [0.34, 0.05],
                    color: 0xF2FFC0, alpha: [0.9, 0], light: "full", maxParticles: 160
                },
                {
                    name: "ground_grit", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 40, shape: { kind: "cone", radius: 3, angleDegrees: { data: "half", fallback: 55 } },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [8, 15], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x8F8779, alpha: [0.5, 0], gravity: 0.04, drag: 0.92, light: "world", maxParticles: 200
                }
            ]
        },
        daze: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "daze_core", bind: "source", offset: [0, 1.55, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "count", fallback: 12 }, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "shape", speed: [0.02, 0.07], spin: 10,
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0xEAF6B0, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "stagger_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x9AA0A8, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "dizzy_ring", bind: "source", offset: [0, 1.6, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 6, shape: { kind: "ring", radius: 0.26 },
                    direction: "shape", speed: [0.01, 0.03], spin: 8,
                    lifetime: [16, 26], size: [0.09, 0.02],
                    color: 0xD6EFA0, alpha: [0.4, 0], light: "full", maxParticles: 28
                },
                {
                    name: "sway", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.02],
                    color: 0x9AA0A8, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_meteorassault", 1, MeteorassaultDefinition);
