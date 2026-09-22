/**
 * ＤＤ金勾臂 / darkestlariat 的客户端表现。
 *
 * 一句话：重心一沉、双臂横张，脚边先起一圈向内收的暗风，随后旋身抡出一整圈闭合的暗紫风痕——
 *   贴着这一圈的人被一起抡中并被向外顶开。
 * 色相家族：暗紫（0x6E5AA8）作主体、深紫（0x46306E）作余韵、淡紫（0xC9B6FF）作强调；无第二个色相。
 * 拍子：起 wind（收风沉身）→ 旋 spin（整圈风痕）→ 中 hit（暗色爆）／空 miss（空风）。
 * 范围：spin 的整圈用 `data.path`（与服务端 `WorldGeometry.ring` 同一半径的闭合顶点）画成闭合风痕，
 *   那一圈就是判定范围，玩家一眼看出站到哪一圈里会被抡到。
 * 运动：wind 的风屑向内收；spin 的风屑绕身公转、整圈风痕向外扩散；命中从落点向外爆。
 * 数：风痕量绑 `data.gales`（物攻换算），旋圈数绑 `data.spin`（速度派生）重放风环，命中强度绑 `data.intensity`（威力 / 66）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DarkestlariatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: 12,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.3, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 22, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.05, 0.18], spin: 18,
                    lifetime: [7, 13], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0x6E5AA8, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        spin: {
            duration: 26,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline", closed: true }, burst: { count: { data: "gales", fallback: 16 } },
                    direction: "shape", orient: "fixed", speed: [0.08, 0.24],
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x6E5AA8, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    shape: { kind: "polygon" }, burst: { count: { data: "gales", fallback: 16 }, interval: 3, repeats: 2 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x46306E, alpha: [0.3, 0], light: "world", maxParticles: 90
                },
                {
                    name: "blade", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 30, shape: { kind: "ring", radius: 0.45 },
                    direction: "shape", speed: [0.05, 0.16], spin: 30,
                    lifetime: [5, 11], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xC9B6FF, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 110
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.05, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 4, repeats: { data: "spin", fallback: 2 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.14, 0.34],
                    lifetime: [10, 18], size: [0.4, 0.95], sizeMode: "sin",
                    color: 0x6E5AA8, alpha: [0.5, 0], light: "world", maxParticles: 12
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "swat", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 8, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.28],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xC9B6FF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "lash", bind: "target", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "gales", fallback: 14 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spread: 24,
                    lifetime: [7, 13], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x46306E, alpha: [0.7, 0], gravity: 0.04, light: "world", maxParticles: 48
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "gales", fallback: 10 } }, shape: { kind: "hemisphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.1], gravity: 0.04,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0x46306E, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_darkestlariat", 1, DarkestlariatDefinition);
