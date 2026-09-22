/**
 * 撕裂爪 / crushclaw 的客户端表现。
 *
 * 一句话：双爪交叉抬起后踏前一步，在身前那条矩形走廊里撕过，命中处划出一个红白的 X 爪痕，撕开护甲时目标身上
 * 再崩起一层与降防级数同量的碎屑。
 * 色相家族：冷白与血锈红（slash／cut／scratch 原色、tinydust 中性）＋一处近白高光（glowingsparkle）。
 * 拍子：起（windup 抬爪）→ 击（slash 走廊与 cross 爪痕）→ 收（tear 撕口）。
 * 范围：slash 用 path 画出服务端 WorldGeometry.lane 的同一组四个顶点；走廊有多宽、多长，画面就是那块地。
 * 运动：爪风沿走廊由近及远扫过，两道 X 爪痕在命中点交叉划过，被撕开时碎屑外翻。
 * 数：`data.notes`（撕抓威力换算）绑定走廊与命中火花量，`data.stages`（实际降防级数）绑定撕口崩屑数，
 * `data.hits`／`data.torn` 让命中与撕开各有一次强调。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const CrushclawDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "claw_glow", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xE8B0B0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        slash: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lane_fill", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: 44, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.28, 0.06],
                    color: 0xE0C6C6, alpha: [0.3, 0], light: "full", maxParticles: 130
                },
                {
                    name: "lane_edge", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: 34, direction: "shape", speed: [0.06, 0.2], spread: 12,
                    lifetime: [5, 11], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xF0E0E0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "strike_spark", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "notes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [7, 14], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF0D8D8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "strike_dust", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A6A6A, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        cross: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "stroke", bind: "path", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 60, direction: "shape", speed: [0.05, 0.18], spread: 10,
                    lifetime: [5, 10], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xF4DADA, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 120
                },
                {
                    name: "stroke_spark", bind: "path", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.05, 0.16], spread: 12,
                    lifetime: [5, 10], size: [0.16, 0.03],
                    color: 0xC05A5A, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        tear: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "tear_burst", bind: "target", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.2], spread: 22,
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF0C0C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "tear_shard", bind: "target", offset: [0, 0.55, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/scratch_yellow",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.06, drag: 0.92,
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0xC07A5A, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x9A8A8A, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crushclaw", 1, CrushclawDefinition);
