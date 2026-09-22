/**
 * 三连踢 / triplekick 的客户端表现。
 *
 * 一句话：人贴地一沉，朝对手正前方那条窄走廊一脚接一脚地踢出去，脚脚在同一个点上崩出尘屑；
 * 第二、第三脚的尘更多更亮，走廊本身在画面里就是判定区。
 * 色相家族：暖沙与米白（foot／hit）＋中性尘（tinydust）＋速度线（speedlines）。第二个色相不进画面。
 * 拍子：起（windup 沉身）→ 踢（kick 逐脚走廊、hit 命中崩屑）→ 收（whiff 落空）。
 * 范围：kick 用 `data.path`（与服务端 WorldGeometry.lane 同一组四个顶点）铺成走廊，走廊多长多宽画面就是那块。
 * 运动：尘点由近及远沿走廊踏出（顶点来自服务端），速度线沿 `data.direction`；每脚在同一走廊上再踢一次。
 * 数：走廊细节量绑定 `data.sparks`（物攻换算），命中尘点绑定 `data.sparks`、亮度绑定 `data.intensity`，
 *   走廊宽度绑定 `data.scale`；第几脚（`data.index`）决定亮度——画面里的数与机制里的数一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
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
                    name: "lane_dust", bind: "path", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" }, rate: { data: "sparks", fallback: 14 }, direction: "shape", speed: [0.03, 0.14],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xD8A86A, alpha: [0.45, 0], light: "world", maxParticles: 60
                },
                {
                    name: "lane_speed", bind: "path", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, rate: 18, direction: "shape", speed: [0.08, 0.24],
                    lifetime: [3, 7], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF2E6CE, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "kick_burst", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.07, 0.22], spread: 20,
                    lifetime: [5, 10], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF2E6CE, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "sole", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/foot",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "toward", speed: [0.05, 0.12], spin: 12,
                    lifetime: [5, 10], size: [0.3, 0.08],
                    color: 0xE8B87A, alpha: [0.9, 0], light: "world", maxParticles: 8
                },
                {
                    name: "kick_dust", bind: "point", offset: [0, 0.25, 0],
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
                    name: "miss_dust", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
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
