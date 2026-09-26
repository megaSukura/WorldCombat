/**
 * 画龙点睛 / dragonascent 的客户端表现。
 *
 * 一句话：施法者屈腿蓄势、气流在脚下收拢 → 猛地窜上天、身上甩下风线 → 从正上方沿斜线俯冲、身体周围卷着气旋 →
 *   落地砸出一圈近白的尘环、冲击波向外荡开 → 落地后重心一沉，身上浮起脱力灰气。
 * 色相家族：天青 0x7FC8D8 与近白 0xE8F6FA 为主体，暖灰 0x8C7448 / 0x777066 作地面尘与碎石，无第二色相。
 * 拍子：起 ready（屈腿蓄势）→ 弃守 guard（护罩碎裂）→ 升 climb（窜空）→ 坠 dive（俯冲）→ 击 hit／land（砸实＋冲击波）→ 收 slump（脱力）。
 * 范围：land 的 `ring`、`shock`、`shockwave` 绑落点、`fit:"none"`，半径按 `data.scale`（冲击半径 / 2）推出，画出的圈就是被震到的范围。
 * 运动：起手气流向内收；升空时向下的风线与脚边外卷；俯冲贴着身体拖风线、气旋外卷；落地时地环外推、碎土与石块向外崩、白环向外荡开。
 * 数：hit/land 的尘与碎屑量绑 `data.motes`（物攻派生），核心强度绑 `data.intensity`（威力派生；主目标已吃满时服务端会把 land 调弱，不再画第二满击）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DragonAscentDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        ready: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.3, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.14, 0.02],
                    color: 0x7FC8D8, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "crouch", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE8F6FA, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        guard: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crack", bind: "source", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.92,
                    lifetime: [8, 14], size: [0.26, 0.07], sizeMode: "index",
                    color: 0x7FC8D8, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 36
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "up", speed: [0.03, 0.12], gravity: 0.07, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x8C7448, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        climb: {
            duration: 0,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "wind", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "ring", radius: 0.45, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [6, 12], size: [0.18, 0.04],
                    color: 0x7FC8D8, alpha: [0.55, 0], light: "full", maxParticles: 50
                },
                {
                    name: "streak", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 8, at: 0 }, shape: { kind: "line", length: 1.2 },
                    direction: "down", speed: [0.1, 0.3], drag: 0.9,
                    lifetime: [5, 10], size: [0.4, 0.08],
                    color: 0xE8F6FA, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        dive: {
            duration: 0,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "shroud", bind: "source", offset: [0, 0.2, 0], height: 0.3, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 18, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xE8F6FA, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "dash", bind: "source", offset: [0, 0.3, 0], height: 0.3, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    trail: { minDistance: 0.28 }, rate: 22,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.3, 0.08],
                    color: 0xBFE8F0, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "body", bind: "target", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.28], spread: 28,
                    lifetime: [7, 13], size: [0.36, 0.06], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "spark", bind: "target", height: 0.7, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [9, 16], size: [0.09, 0.01],
                    color: 0xE8F6FA, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        land: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.3, 0.6], drag: 0.94,
                    lifetime: [8, 14], size: [1.1, 0.18], sizeMode: "index",
                    color: 0xE8F6FA, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 4
                },
                {
                    name: "shock", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.12, 0.34], spread: 30,
                    lifetime: [8, 14], size: [0.36, 0.06], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "soil", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 110
                },
                {
                    name: "rock", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.14, 0.32], gravity: 0.14, drag: 0.94,
                    lifetime: [10, 18], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x777066, alpha: [0.85, 0], light: "world", maxParticles: 18
                },
                {
                    name: "shockwave", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.2, 0.46],
                    lifetime: [8, 14], size: [0.7, 0.14], sizeMode: "index",
                    color: 0xD8CFC0, alpha: [0.7, 0], light: "world", maxParticles: 6
                }
            ]
        },
        slump: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.6, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x9A968C, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonascent", 1, DragonAscentDefinition);
