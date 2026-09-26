/**
 * 大声咆哮 / snarl 的客户端表现。
 *
 * 一句话：施法者吸气、口边聚起一圈暗色音符 → 一道暗紫声压锥贴地推出去、锥面被暗色碎点填满 →
 *   每被喝中的目标身上炸开一团恶色冲击、头顶飘起被斥的音符，之后余韵持续沉着。
 * 色相家族：深紫（0x6B4FA8 / 0x8A6BC8）为主体，近白紫（0xD8CCFF）只给锥缘与击点高光，烟黑收地面。
 * 拍子：起 gather（聚声，可反复）→ 击 bark（每一声一锥）→ 中 hush（第一次被骂软，掉特攻）/ chide（已在锥里被骂过、只继续挨削血）→ 收 linger（被斥余韵）/ fizzle（喝空）。
 * 范围：bark 的锥形顶点就是判定用的扇面（`data.path`），长度 `data.reach`、张角 `data.halfArc` —— 铺到哪就是会被喝到哪；
 *   一个脉冲一个 bark，画面里连推几次就是机制里连喝几声；每一拍都朝第一声锁定的 `data.direction` 推同一道锥。
 * 运动：锥面朝 `data.direction` 压出去，锥缘沿顶点连线铺开；被喝者身上的符号下坠。
 * 数：音符量与锥面密度绑定 `data.notes`（特攻派生），锥长/张角绑定 `data.reach`/`data.halfArc`，掉级绑定 `data.drop`。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SnarlMoveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "inhale", bind: "source", offset: [0, 0.7, 0.25], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.1], spin: 6,
                    lifetime: [8, 15], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xD8CCFF, alpha: [0.65, 0], light: "full", maxParticles: { data: "notes", fallback: 36 }
                },
                {
                    name: "charge", bind: "source", offset: [0, 0.72, 0.25], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x8A6BC8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: { data: "notes", fallback: 30 }
                }
            ]
        },
        bark: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "cone_air", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "notes", fallback: 18 },
                    shape: { kind: "cone_volume", radius: 0.32, length: { data: "reach", fallback: 4.5 }, angleDegrees: { data: "halfArc", fallback: 27 } },
                    direction: "shape", speed: [0.1, 0.34], spread: 10, spin: 8,
                    lifetime: [6, 13], size: [0.2, 0.04],
                    color: 0x6B4FA8, alpha: [0.4, 0], light: "world", maxParticles: 260
                },
                {
                    name: "cone_fill", bind: "path", offset: [0, -0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 18 }, direction: "shape", speed: [0.05, 0.2], spread: 20,
                    lifetime: [6, 13], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x9A7BFF, alpha: [0.65, 0], light: "full", bloom: 0.3, maxParticles: 300
                },
                {
                    name: "cone_edge", bind: "path", offset: [0, -0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polyline", closed: true },
                    rate: 40, direction: "shape", speed: [0.08, 0.24], spread: 8,
                    lifetime: [5, 11], size: [0.11, 0.02],
                    color: 0xD8CCFF, alpha: [0.75, 0], light: "full", maxParticles: 220
                },
                {
                    name: "ground", bind: "path", offset: [0, -0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 18 }, direction: "outward", speed: [0.03, 0.12],
                    drag: 0.94, gravity: 0.01,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0x3A2A55, alpha: [0.4, 0], light: "world", maxParticles: 200
                }
            ]
        },
        hush: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "bite", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24,
                    lifetime: [5, 10], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 26
                },
                {
                    name: "scold", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spread: 26,
                    gravity: 0.01, drag: 0.9,
                    lifetime: [10, 18], size: [0.13, 0.03],
                    color: 0xD8CCFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "shrink", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "drop", fallback: 1 }, interval: 2, repeats: 4 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 17], size: [0.22, 0.08],
                    color: 0x6B4FA8, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        chide: {
            duration: 18,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "echo", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.16], spread: 20,
                    lifetime: [5, 10], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9A7BFF, alpha: [0.8, 0], light: "world", maxParticles: 16
                },
                {
                    name: "mutter", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.1], spread: 24, gravity: 0.01, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xD8CCFF, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        linger: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "mourn", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 3, shape: { kind: "circle", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.03], spin: 5,
                    lifetime: [16, 26], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xD8CCFF, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 12
                },
                {
                    name: "sink", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0x8A6BC8, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "empty", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x3A2A55, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_snarl", 1, SnarlMoveDefinition);
