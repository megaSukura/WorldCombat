/**
 * 贝壳刃 / razorshell 的客户端表现。
 *
 * 一句话：壳缘亮起一道水光 → 薄刃沿外缘扫过一小段新月带，只画真实扫过的刃带、内圈留空 →
 * 被切中的目标身上溅起水花（cut）→ 只有真的削掉防御才另崩壳屑（shave）；墙截住的刃段在接触点迸一点火星。
 * 色相家族：水蓝（0x4AA6D8）与浅水青（0x8FCBE8）＋壳白（0xEAF4F8）＋中性水雾。
 * 拍子：起 windup（壳缘水光）→ 扫 carve（4 刻逐段）→ 中 cut（溅水）→ 削 shave（收口崩屑）／ 挡 block ／ miss（水风划过）。
 * 范围：carve 的 `data.path` 就是服务端当刻判定的同一段刃带顶点（外弧＋内弧围成的水平薄环），
 *       `polyline` 描出刃带轮廓、`polygon` 填出厚度，刃画到哪里就只切到哪里，内圈不铺满；
 *       `data.edge`（刃厚）与 `data.scale`（张角 / 110）同步粒子的厚度与大小，一眼可分宽弧与窄刃。
 * 运动：亮刃沿这段刃带掠过，水线贴着刃走；cut 的水花从被切中的目标身上外翻。
 * 数：`data.motes`（切斩威力派生）决定外缘亮刃的发放量，`data.sparks`（削甲级数派生）决定崩屑量。
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
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "blade_edge", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "motes", fallback: 40 }, direction: "shape", speed: [0.06, 0.22], spread: 10,
                    lifetime: [5, 11], size: [{ data: "edgeSize", fallback: 0.19 }, 0.03], sizeMode: "index",
                    color: 0xEAF4F8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "blade_fill", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: 34, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.24, 0.05],
                    color: 0x8FCBE8, alpha: [0.34, 0], light: "full", maxParticles: 120
                }
            ]
        },
        cut: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "carve_hit", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x4AA6D8, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 36
                }
            ]
        },
        block: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "clang", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.08, 0.24],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xEAF4F8, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 24
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
