/**
 * 破坏光线 / hyperbeam 的客户端表现。
 *
 * 一句话：施法者身前收束出一颗冷白光点，随后一条贯穿的直线光带从身前一直射向尽头；走廊里被贯穿的活体各自
 * 炸开一个白蓝贯穿点，光柱熄灭后施法者身上只剩一层暗下去的低伏余烬，标明「熄火」这段时间。
 * 色相家族：冷白到浅青（speedlines／glowing_dots_cyan 原色、impact_normal 亮帧、tinydust 中性），核心近白。
 * 拍子：起（windup 聚光）→ 击（beam 走廊 + pierce 贯穿点，或 fizzle 落空）→ 收（spent 起、recharge 维持整段熄火）。
 * 范围：beam 用 path 画出服务端 WorldGeometry.polygon 的同一组四个顶点——走廊有多长多宽，画面就是那条光带。
 * 运动：光带沿走廊由近及远铺开、边缘同时向前扫过；贯穿点在命中处向外炸开；熄火时余烬原地慢慢下沉。
 * 数：`data.notes`（光束威力换算）与 `data.intensity`（威力/150）决定光带与贯穿点的密度，`data.pierce`（贯穿上限）
 * 决定边缘强调的强度，`data.seconds`（熄火秒数）决定余烬维持密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const HyperbeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 13 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_core", bind: "source", offset: [0, 0.75, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 22, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "aim_sparks", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 16, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 11], size: [0.09, 0.02],
                    color: 0xCFF4FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "crouch_dust", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.05, 0.02],
                    color: 0xB9C4CC, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        },
        beam: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "lane_fill", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 120 }, direction: "shape", speed: [0.04, 0.2],
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xEAF7FF, alpha: [0.55, 0], light: "full", maxParticles: 420
                },
                {
                    name: "lane_glow", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    shape: { kind: "polygon" },
                    rate: 90, direction: "shape", speed: [0.03, 0.16],
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xBFEEFF, alpha: [0.5, 0], light: "full", bloom: 0.35, maxParticles: 320
                },
                {
                    name: "lane_edge", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "pierce", fallback: 4 }, direction: "shape", spread: 10, speed: [0.06, 0.24],
                    lifetime: [5, 11], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xF4FCFF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 220
                },
                {
                    name: "muzzle", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        pierce: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "pierce_core", bind: "point", offset: [0, 0.55, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xF4FCFF, alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "pierce_ring", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.34, 0.1],
                    color: 0xCDEBF7, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "pierce_grit", bind: "point", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.42 } },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC6CFD6, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0x9FB0BC, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        },
        spent: {
            duration: 32,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "ember_fall", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "count", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.09, 0.02],
                    color: 0xBFD7E0, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "settle_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xB9C8D2, alpha: [0.45, 0], light: "world"
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "dim_core", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 5, shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0x9FB6C2, alpha: [0.35, 0], light: "full", maxParticles: 26
                },
                {
                    name: "ground_haze", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.02],
                    color: 0x93A0AA, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hyperbeam", 1, HyperbeamDefinition);
