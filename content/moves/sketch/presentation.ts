/**
 * 写生 / sketch 的客户端表现。
 *
 * 一句话：施法者俯身看准目标那一手，墨点在它和自己之间牵成一条墨线，随即在施法者身上落下一片墨色笔触，
 * 把那手描进自己的招式表；没有可描的一手时，墨迹在半空化开。
 * 色相家族：墨黑与深靛（ink / shadow）为底，纸白只出现在落笔的核心与边缘，是画面里唯一的亮点。
 * 拍子：起（draw 0–18t 看准）→ 描（ink 0–44t，击 0–14t，收 14–44t）／空（fizzle 0–24t）。
 * 范围：draw 的墨线是 path，从实际示范者流向施法者、落进写生所在的槽位；ink 的笔触全绑在施法者身上——描的是自己。
 * 运动：墨点沿线从目标涌回施法者；落笔时笔触从身体中心向外扫开。
 * 数：服务端把 `strokes`（随特攻派生）交给发射器决定笔触与纸点数量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SketchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 20,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "ink_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/drip",
                    rate: { data: "strokes", fallback: 8 }, trail: { minDistance: 0.2 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.11],
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0x2B2B33, alpha: [0.85, 0], light: "world", maxParticles: 100
                },
                {
                    name: "paper_glow", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "strokes", fallback: 8 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xF4F0E0, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        ink: {
            duration: 46,
            exit: { stop: 26, drain: 30 },
            emitters: [
                {
                    name: "brushstroke", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "strokes", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.6, randomDirection: 0.4 },
                    direction: "outward", speed: [0.12, 0.3], spread: 12,
                    lifetime: [10, 16], size: [0.4, 0.05], sizeMode: "index",
                    color: 0x23232B, alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "ink_pages", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: { data: "strokes", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [14, 24], size: [0.12, 0.02],
                    color: 0x4A4A66, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "paper_motes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "strokes", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [16, 28], size: [0.08, 0.01],
                    color: 0xF4F0E0, alpha: [0.7, 0], light: "full", maxParticles: 100
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "blot", bind: "point", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "strokes", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.16, 0.26],
                    color: 0x3A3A46, alpha: [0.34, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sketch", 1, SketchDefinition);
