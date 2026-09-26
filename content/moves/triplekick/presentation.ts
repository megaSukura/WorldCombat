/**
 * 三连踢 / triplekick 的客户端表现。
 *
 * 一句话：人贴地一沉，朝锁定方向把三只短足形沿同一条拳高前后弹出；每一脚沿真正的踢线扫过，命中在真实首碰处崩尘，
 * 第三只足形明显更大、迸出的尘也更多；踢空时只在真实踢线尽头散一小撮尘。
 * 色相家族：暖沙与米白（foot／hit）＋中性尘（tinydust）。
 * 拍子：起（windup 沉身）→ 踢（kick 逐脚踢线 + sole 足形）→ 中（hit 崩屑）→ 空（whiff）。
 * 范围：kick 的 polyline 直接消费服务端 `data.path`（身体中心 ↔ 当刻踢线尽头）与服务端真取的首碰位置；
 *   sole／hit／whiff 的 point 就是服务端实际结算的位置，不铺满地面矩形。
 * 运动：足形尺寸来自服务端 `data.foot`（第几脚决定），速度线与尘沿 `data.direction`。
 * 数：`data.sparks`（物攻派生）决定踢线与命中尘点，`data.intensity`（威力派生）缩放发射量。
 */
const TriplekickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 7 },
            emitters: [
                {
                    name: "sink", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "cylinder", radius: 0.5, length: 0.1 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.06, 0.02],
                    color: 0xD8A86A, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        kick: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "kick_line", bind: "path", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: { data: "sparks", fallback: 14 }, direction: "outward", speed: [0.03, 0.14],
                    lifetime: [5, 11], size: [0.06, 0.02],
                    color: 0xD8A86A, alpha: [0.4, 0], light: "world", maxParticles: 60
                },
                {
                    name: "sole", bind: "point", fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/foot",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.06], spin: 14,
                    lifetime: [5, 10], size: [{ data: "foot", fallback: 0.26 }, 0.08],
                    color: 0xE8B87A, alpha: [0.9, 0], light: "world", maxParticles: 8
                },
                {
                    name: "shock", bind: "point", fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "line", length: 0.4 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [3, 7], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xF2E6CE, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "kick_burst", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.07, 0.22], spread: 20,
                    lifetime: [5, 10], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF2E6CE, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "sole", bind: "point", fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/foot",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1], spin: 16,
                    lifetime: [5, 10], size: [{ data: "foot", fallback: 0.3 }, 0.08],
                    color: 0xE8B87A, alpha: [0.9, 0], light: "world", maxParticles: 8
                },
                {
                    name: "kick_dust", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.15], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xCFA46E, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        whiff: {
            duration: 14,
            exit: { stop: 5, drain: 8 },
            emitters: [
                {
                    name: "miss_dust", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.13],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xCFA46E, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_triplekick", 1, TriplekickDefinition);
