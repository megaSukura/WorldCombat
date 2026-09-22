/**
 * 藤鞭 / vinewhip 的客户端表现。
 *
 * 一句话：细藤从身侧绷起、闪过一点绿光 → 朝目标快抽出一道细而亮的线性鞭痕、末端散出叶片 →
 * 命中点炸开一小簇叶片与草绿冲击，双抽式会在下一刻再抽一道。
 * 色相家族：亮草绿（0x9BD05A 鞭痕、0x6FA83C 叶）与米白鞭梢为主，无第二个色相。
 * 拍子：起 read（绷藤聚光）→ 抽 flick（细线鞭痕并扫过）→ 击 hit（命中散叶）→ 空 miss（抽空散叶）。
 * 范围：flick 的 polyline 沿 `data.path`（施法者到触击点的一条线）画出鞭痕，那道细线就是被打到的窄线。
 * 运动：鞭痕沿线一次扫出，末端叶屑沿离心方向飞出；命中是一小簇外散叶加一点草绿冲击。
 * 数：鞭痕叶量与命中散叶绑 `data.notes`（物攻与速度派生），命中强度绑 `data.intensity`（本击威力 / 48），
 *     鞭痕条数绑 `data.strokes`、两抽间隔绑 `data.interval`（双抽式派生的两记）——画面里的条数与机制一致。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const VineWhipDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "tense", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    spin: 8, lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x9BD05A, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        flick: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "cord", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 14 }, repeats: { data: "strokes", fallback: 1 },
                        interval: { data: "interval", fallback: 5 } },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.04, 0.15],
                    spin: 10, lifetime: [5, 10], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x9BD05A, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cord_core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: 4, repeats: { data: "strokes", fallback: 1 }, interval: { data: "interval", fallback: 5 } },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.02, 0.09],
                    lifetime: [4, 8], size: [0.13, 0.02],
                    color: 0xF2F8DC, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "wrist", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, repeats: { data: "strokes", fallback: 1 }, interval: { data: "interval", fallback: 5 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.06, 0.01],
                    color: 0xCFE98A, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 9, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.08, 0.24],
                    lifetime: [4, 8], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xEAF8B8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "scatter", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "notes", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.2],
                    spread: 45, spin: 14,
                    lifetime: [6, 12], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xA8DC64, alpha: [0.75, 0], light: "full", maxParticles: 55
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 10 } },
                    shape: { kind: "arc", radius: 0.4, arcDegrees: 140, rotation: [0, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0x9BD05A, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vinewhip", 1, VineWhipDefinition);
