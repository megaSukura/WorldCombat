/**
 * 速度互换 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：两个人的速度读数在中间对上 → 一条亮线从更快的一方把速度抽向更慢的一方、双方各亮起一圈 →
 *   交换维持的这段时间里两人之间一直牵着一根极淡的光丝，归位时两边各自收回。
 *
 * 色相家族：双色——被抽走的快色暖橙 0xFFC24A 与收下的慢色青蓝 0x6FC7E8，中性近白 0xEAF2F8 只落在对齐的强调环。
 *   两种速度必须同时被看见，所以这里用两个色相：暖色画「离开的那一份」，冷色画「收下的那一份」。
 * 层次：读数（起手，两端各一圈）／光丝（主体，沿 `data.path` 的快→慢转移）／环（强调，归位与对齐）／尘（余韵）。
 * 拍子：read（起手 0–16t）→ cross（交换 0–34t）→ hum（维持）→ revert（归位 0–24t）。
 * 范围：光丝沿 `data.path`（快的一方 → 慢的一方）画出，长度就是两人当前的实际距离；圈的大小随体型。
 * 运动：cross 时暖色光点沿 `path` 从快的一方冲到慢的一方，冷色光点贴着收下的一端回旋；hum 时同一根丝极慢地脉动。
 * 数：光丝数量绑 `data.threads`（特攻派生），交换幅度由 `data.gap`（双方有效速度读数之差）驱动强度与线宽；
 *   两人差距越大，画面里的对流越急、越亮。
 */
const SpeedSwapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fast_read", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 14, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.01], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 36
                },
                {
                    name: "anchor", bind: "target", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.55, 0], light: "full", maxParticles: 26
                }
            ]
        },
        cross: {
            duration: 34,
            exit: { stop: 11, drain: 20 },
            emitters: [
                {
                    name: "draw", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "threads", fallback: 10 } }, direction: "shape", speed: [0.4, 0.9],
                    lifetime: [7, 13], size: [0.12, 0.01], sizeMode: "index",
                    color: 0xFFC24A, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "line", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, direction: "shape", speed: [0.06, 0.16],
                    lifetime: [7, 13], size: [0.26, 0.02], sizeMode: "index",
                    color: 0xEAF2F8, alpha: [0.55, 0], light: "full", maxParticles: 90
                },
                {
                    name: "receive", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 12, at: 6 }, shape: { kind: "ring", radius: { data: "gap", fallback: 0.8 } },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.3, 0.05],
                    color: 0x6FC7E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "spark", bind: "target", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "threads", fallback: 10 }, interval: 5, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.35 }, direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 15], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xEAF2F8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "thread", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "shape", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.24, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "thread_cool", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "shape", speed: [0.004, 0.016],
                    lifetime: [20, 32], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.2, 0], alphaMode: "sin", light: "world", maxParticles: 16
                }
            ]
        },
        revert: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "return", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "threads", fallback: 10 } }, direction: "inward", speed: [0.08, 0.22],
                    lifetime: [8, 14], size: [0.2, 0.02], sizeMode: "index",
                    color: 0xEAF2F8, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: [0.07, 0.02], gravity: 0.02, drag: 0.95,
                    color: 0x9FB6C8, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.2, 0.32],
                    color: 0x9FB6C8, alpha: [0.28, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_speedswap", 1, SpeedSwapDefinition);
