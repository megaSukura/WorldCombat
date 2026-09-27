/**
 * 突飞猛扑 / headlongrush 的客户端表现。
 *
 * 一句话：施法者低头屈腿、脚边的土被向后扫起（眉光落在真实朝向的前点）→ 贴地一路冲过去，身后甩下土线与翻起的尘，
 *   撞上目标时地面炸开一圈翻土 → 冲完收势，没撞到就扬一记真实刹尘，然后重心一沉、身上浮起脱力灰气。
 * 色相家族：土褐 0xB4793F 与 0x8C7448 为主体，深褐 0x6B5232 作余韵，近白 0xE8D9B0 只给起手的低头光；无第二色相。
 * 拍子：起 ready（低头蓄势）→ 弃守 guard（护罩碎裂＋踢土）→ 冲 rush（贴地推尘，源随身体每刻翻土）→
 *   击 impact（撞实，每一下一次）→ 刹 brake（终点收势）→ 收 slump（脱力）。
 * 范围：impact/brake 绑落点、`fit:"none"`，圆环半径按 `data.scale`（擦痕宽度 / 1.2）推出，画出的圈就是撞开的地面。
 * 运动：rush 沿身体运动方向拖出土线、脚边环形卷土；impact 向外崩起翻土与碎块；brake 只在没撞到时扬尘；slump 灰气缓缓上浮。
 * 数：impact/brake 的翻土量绑 `data.dust`（体重派生）、刹尘量绑 `data.brake`（未命中才是 dust）、核心强度绑 `data.intensity`（威力派生）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HeadlongRushDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        ready: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "scrape", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.92,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 36
                },
                {
                    // 眉光落在服务端用朝向构造的真实前点（data.point），不再用固定的世界 +Z 偏移。
                    name: "brow", bind: "point", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xE8D9B0, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 18
                }
            ]
        },
        guard: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crack", bind: "source", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "guardCracks", fallback: 9 }, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.26], drag: 0.92,
                    lifetime: [8, 14], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x6B5232, alpha: [0.8, 0], light: "world", maxParticles: 34
                },
                {
                    name: "kick", bind: "source", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 18 }, at: 0 },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "up", speed: [0.04, 0.16], gravity: 0.08, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rush: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "source", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    trail: { minDistance: 0.3 }, rate: { data: "dust", fallback: 18 },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.28, 0.08],
                    color: 0xC9A26A, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "churn", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 20, shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.08, drag: 0.92,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 70
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "dust", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30,
                    lifetime: [7, 13], size: [0.34, 0.06], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "soil", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 18 }, at: 0 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.22], gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 120
                },
                {
                    name: "clod", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.12, 0.3], gravity: 0.12, drag: 0.94,
                    lifetime: [10, 18], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x6B5232, alpha: [0.85, 0], light: "world", maxParticles: 18
                }
            ]
        },
        brake: {
            // 终点收势：只有没撞到人时才扬一记刹尘（data.brake = dust），撞到过就交给每一下命中各自爆过，不重复伤害式爆点。
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "brake", fallback: 0 }, at: 0 },
                    shape: { kind: "circle", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.08, drag: 0.92,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x8C7448, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "brake", fallback: 0 }, at: 0 },
                    shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.08, 0.01],
                    color: 0xC9A26A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        slump: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.6, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "fatigue", fallback: 18 }, at: 0 },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x9A968C, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_headlongrush", 1, HeadlongRushDefinition);
