/**
 * 贝壳刃 / razorshell 的客户端表现。
 *
 * 一句话：壳缘亮起一道水光 → 朝身前一记宽弧扫过，弧面里水光铺开、边缘是一道亮白的壳刃线 →
 * 被切中的目标身上崩起壳屑与水花。
 * 色相家族：水蓝（0x4AA6D8）与浅水青（0x8FCBE8）＋壳白（0xEAF4F8）＋中性水雾。
 * 拍子：起 windup（壳缘水光）→ 扫 carve（峰值，弧面铺开）→ 削 shave（收口崩屑）／ miss（水风划过）。
 * 范围：carve 的 path 就是服务端 WorldGeometry.polygon 用的同一组扇面顶点——扇面有多宽多长，画面就是那块地；
 *       `data.scale`（张角 / 110）同步放大粒子尺寸，让宽弧与窄刃一眼可分。
 * 运动：弧面的水光沿扇形由内向外铺开，边缘壳刃线沿弧掠过；shave 的壳屑从被切中的目标身上外翻。
 * 数：`data.motes`（切斩威力派生）决定弧面水光的发放量，`data.sparks`（削甲级数派生）决定崩屑量，
 *      `data.hits`／`data.shaved` 让命中与削开各有一次强调。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RazorshellDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "shell_sheen", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 16, shape: { kind: "arc", radius: 0.42, arcDegrees: 120, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x8FCBE8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 36
                }
            ]
        },
        carve: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "arc_fill", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: { data: "motes", fallback: 75 }, direction: "shape", speed: [0.03, 0.13],
                    lifetime: [8, 15], size: [0.28, 0.06],
                    color: 0x8FCBE8, alpha: [0.32, 0], light: "full", maxParticles: 150
                },
                {
                    name: "arc_edge", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: 40, direction: "shape", speed: [0.06, 0.22], spread: 10,
                    lifetime: [5, 11], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xEAF4F8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "spray", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x4AA6D8, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 50
                }
            ]
        },
        shave: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shave_shards", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0xEAF4F8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "shave_drip", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 2 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x4AA6D8, alpha: [0.8, 0], light: "full", maxParticles: 44
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x8FCBE8, alpha: [0.4, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_razorshell", 1, RazorshellDefinition);
