/**
 * 三旋击 / tripleaxel 的客户端表现。
 *
 * 一句话：身体原地转起来，一圈扫出一道冰蓝弧光，跟着的第二、第三道弧更宽更亮，弧上的碎冰随之变密。
 * 色相家族：冰蓝弧光（softswipe／cut）＋旋身风（swirlingwind）＋霜白碎屑（iceshard／impact_ice）＋中性尘（tinydust）。
 * 拍子：起（windup 起旋）→ 击（kick 逐脚弧扫、hit 命中崩屑）→ 收（whiff 落空）。
 * 范围：kick 用 `data.path`（与服务端 WorldGeometry.sector 同一组角度的扇形顶点）铺成扇形，画面里的弧面就是判定区。
 * 运动：弧光沿扇形从一侧扫到另一侧（`data.direction` 定向）；每脚角度更宽（`data.arc`），旋转风贴身打转。
 * 数：弧面细节量绑定 `data.sparks`（物攻换算），命中碎屑绑定 `data.sparks`、亮度绑定 `data.intensity`，
 *   弧面大小绑定 `data.scale`；第几脚（`data.index`）决定整脚的亮度与弧宽——画面里的数与机制里的数一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const TripleaxelDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "spin_up", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 10, shape: { kind: "cylinder", radius: 0.7, length: 0.2 },
                    direction: "shape", speed: [0.04, 0.16], spin: 18,
                    lifetime: [6, 12], size: [0.28, 0.06],
                    color: 0xBFE7F2, alpha: [0.55, 0], light: "full", maxParticles: 34
                },
                {
                    name: "cold_gather", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 8, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xD6F2FA, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        },
        kick: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "arc_fill", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polygon" }, rate: 30, direction: "shape", speed: [0.05, 0.18],
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xBFE7F2, alpha: [0.5, 0], light: "full", maxParticles: 80
                },
                {
                    name: "arc_edge", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: { data: "sparks", fallback: 16 }, direction: "shape", speed: [0.06, 0.2], spread: 8,
                    lifetime: [4, 8], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xEAF8FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "bite_shatter", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.07, 0.22], spread: 20,
                    lifetime: [5, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xD6F2FA, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "frost_scatter", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 28, spin: 9,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [9, 16], size: [0.11, 0.02],
                    color: 0xA9D6E8, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 26
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xCFE6EC, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "miss_spin", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.15],
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xBFD8E0, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tripleaxel", 1, TripleaxelDefinition);
