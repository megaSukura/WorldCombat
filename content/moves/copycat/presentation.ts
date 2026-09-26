/**
 * 仿效 / copycat 的客户端表现。
 *
 * 一句话：整座场地上刚刚响过的那一手，在施法者身上重新亮起——脚下先荡开一圈低低的青白回声，
 *   那一手的光随即在身周聚成一阵环流；若场上还没人出过手，只余一撮发闷的灰烟。
 * 色相家族：青白 0x9FE8DC（回声本身）加一点镜面虹彩（提示这是别人的手迹）；灰只用在落空。
 * 拍子：listen 起（0–16t 脚下回声）→ replay 击（0–14t 聚光，收 14–30t 散去）／empty 空（0–20t 灰烟）。
 * 范围：listen 的环以施法者为心向外扩；replay 的环流绑施法者随其移动。
 * 运动：回声圈由内向外荡开，聚光由外向内收回。
 * 数：服务端把 echoes（特攻派生）交给回声圈、环流与虹彩的数量，层数随它增减。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const copycatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        listen: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "echo_ring", bind: "source", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "echoes", fallback: 6 }, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.22, 0.4], spread: 2,
                    lifetime: [14, 20], size: [0.26, 0.06],
                    color: 0x9FE8DC, alpha: [0.5, 0], light: "full", maxParticles: 70
                },
                {
                    name: "echo_motes", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "echoes", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.1, 0.01],
                    color: 0xD8F6FF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 70
                }
            ]
        },
        replay: {
            duration: 30,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "replay_thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: { data: "echoes", fallback: 6 }, trail: { minDistance: 0.25 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.14, 0.3],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x9FE8DC, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "replay_shell", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: { data: "echoes", fallback: 6 } },
                    shape: { kind: "sphere_surface", radius: 0.58 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [14, 22], size: [0.18, 0.04],
                    color: 0x9FE8DC, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "replay_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.25, 0.5], spread: 4,
                    lifetime: [12, 20], size: 0.32,
                    color: 0xD8F6FF, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "replay_rainbow", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "echoes", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.26], spread: 12,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 90
                }
            ]
        },
        empty: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "empty_puff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [0.16, 0.26],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 24
                },
                {
                    name: "empty_question", bind: "source", offset: [0, 1.0, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: 2 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 22], size: [0.26, 0.08], sizeMode: "sin",
                    color: 0x8FA6B0, alpha: [0.8, 0], light: "full", maxParticles: 4
                }
            ]
        },
        // 借到了那一手，但这次瞄准没给出它需要的目标：来源的影子在身前打转又散，提示“还差一个目标”。
        aimless: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "aimless_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 10, interval: 5, repeats: 2 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.12, 0.24],
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0x8FA6B0, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "aimless_mark", bind: "source", offset: [0, 1.0, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: 2 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 22], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0x9FE8DC, alpha: [0.8, 0], light: "full", maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_copycat", 1, copycatDefinition);
