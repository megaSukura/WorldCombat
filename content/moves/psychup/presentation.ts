/**
 * 自我暗示 / psychup 的客户端表现。
 *
 * 一句话：一道读解视线从施法者落到对手身上，把它的能力阶梯扫进来 → 这股架势沿两人的连线抽回施法者体内，
 *         身上按抄到的项数逐条亮起 → 光带收束、光点慢慢散去。
 * 色相家族：灵能紫 0xC07CFF 作主体，淡紫白 0xE9C6FF 作高光与细节；不引入第二个色相。
 * 拍子：起 read 0–12t ／ 击 mirror 22t（回响抽回＋按项点亮）／ 收 settle 24t。
 * 范围：read/mirror 的发射器绑 `data.path`（施法者与对手两个实体顶点画的 polyline），画的就是“读到多远、
 *   从谁身上读”的连线；对手身上的扫描环绑 target。
 * 运动：扫视环在对手身上开合；回响沿连线抽回；施法者身上按 `data.stats`（实际抄到的项数）跳出光点。
 * 数：回响条数绑 `data.echoes`（特攻派生），点亮项数绑 `data.stats`（本次真实改变的能力项数），
 *   整体强弱绑 `data.intensity`（各级差绝对值之和派生）。
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
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "mirror_ribbon", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polyline" },
                    rate: { data: "echoes", fallback: 10 }, direction: "shape", speed: [0.08, 0.24], spread: 6,
                    lifetime: [8, 15], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xC07CFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 150
                },
                {
                    name: "gather_echo", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: { data: "echoes", fallback: 10 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE9C6FF, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "pip_light", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "stats", fallback: 3 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [9, 16], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xC07CFF, alpha: [0.95, 0], light: "full", bloom: 0.35,
                    maxParticles: { data: "echoes", fallback: 30 }
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
                    name: "settle_dust", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "stats", fallback: 4 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.01, drag: 0.94,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xC07CFF, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychup", 1, PsychupSceneDefinition);
