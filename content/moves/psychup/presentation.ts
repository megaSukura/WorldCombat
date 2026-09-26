/**
 * 自我暗示 / psychup 的客户端表现。
 *
 * 一句话：一道读解视线从施法者落到目标身上，扫过它的能力阶梯与药水增益 → 目标身上真正被抄到的条目分成两路
 *         符号（紫＝能力等级、淡紫白＝药水增益）沿同一条连线流回施法者 → 落身时按实际条目数量亮起光点。
 * 色相家族：灵能紫 0xC07CFF 作能力等级，淡紫白 0xE9C6FF 作药水增益与高光；不引入第二个色相。
 * 拍子：起 read 0–12t（读解连线＋扫描环）／ 击 mirror 30t（两路符号按 `direction` 真实流回＋按项点亮）／ 收 settle 24t。
 * 范围：read 的发射器绑 `data.path`（施法者与目标两个实体顶点画的 polyline），画的就是“读到多远、读谁”；
 *   扫描环绑 target。mirror 的流动符号绑 emit 点（目标位置）并以 `orient:"direction"` 沿 `data.direction` 走完 `data.span`，
 *   是真正的移动前沿，不是把一条静止的线说成飞行。
 * 数：能力符号数量绑 `data.stats`（本次真实抄到的等级项数），药水符号数量绑 `data.potions`（真实复制的增益数）；
 *   回响密度绑 `data.echoes`（特攻派生），整体强弱绑 `data.intensity`。未抄到的条目不发射，因此不亮。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PsychupSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "read_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    shape: { kind: "polyline" },
                    rate: { data: "echoes", fallback: 8 }, direction: "shape", speed: [0.05, 0.18], spread: 8,
                    lifetime: [7, 14], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0xC07CFF, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "read_trail", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: { data: "echoes", fallback: 6 }, direction: "shape", speed: [0.03, 0.12], spread: 14,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xE9C6FF, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "scan_ring", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 3, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.32, 0.7], sizeMode: "sin",
                    color: 0xE9C6FF, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        mirror: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "mirror_link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: { data: "echoes", fallback: 8 }, direction: "shape", speed: [0.03, 0.1], spread: 8,
                    lifetime: [8, 15], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xC07CFF, alpha: [0.55, 0], light: "full", maxParticles: 100
                },
                {
                    name: "flow_stage", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    shape: { kind: "line", length: { data: "span", fallback: 4 } },
                    rate: { data: "stats", fallback: 0 }, direction: "shape", speed: [0.14, 0.36], spread: 8,
                    lifetime: [7, 13], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xC07CFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "flow_potion", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    shape: { kind: "line", length: { data: "span", fallback: 4 } },
                    rate: { data: "potions", fallback: 0 }, direction: "shape", speed: [0.1, 0.3], spread: 10,
                    lifetime: [8, 15], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xE9C6FF, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "pip_stage", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "stats", fallback: 0 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [9, 16], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xC07CFF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "pip_potion", bind: "source", fit: "body", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "potions", fallback: 0 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [9, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE9C6FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "settle_ring", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.3, 0.75], sizeMode: "sin",
                    color: 0xE9C6FF, alpha: [0.55, 0], light: "full", maxParticles: 16
                },
                {
                    name: "settle_stage", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "stats", fallback: 0 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.01, drag: 0.94,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xC07CFF, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "settle_potion", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "potions", fallback: 0 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01, drag: 0.94,
                    lifetime: [12, 22], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xE9C6FF, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychup", 1, PsychupSceneDefinition);
