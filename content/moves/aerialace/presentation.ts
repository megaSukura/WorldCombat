/**
 * 燕返 / aerialace 的客户端表现。
 *
 * 一句话：施法者压低身子，脚下的风线一收；随后整道身影贴着一条风线掠出去，掠过之处同时划出若干道交叉刀光，
 * 被扫到的人身上炸开一小撮风屑；人落在对手身后，扬起一圈尘。
 * 色相家族：冷天空蓝与近白（swipe／cut／quickattack_dashlines），强调处用一点亮青。
 * 拍子：起（gather 聚风）→ 掠（dash 拉出风线、cut 交叉刀光与命中）→ 收（past 落地扬尘 / miss 空挥）。
 * 范围：cut 用 `data.path` 画出服务端从起点到命中点的同一组顶点，刀光划到哪、够多宽，画面就是那条线。
 * 运动：风线从身上向后拉出，刀光沿 path 交叉扫过，命中处风屑向外炸开。
 * 数：`data.cuts`（速度派生的刀数）决定刀光条数，`data.notes`（威力派生）决定命中风屑量，
 * `data.intensity`（单刀威力×刀数派生）抬高亮度与发射率，`data.scale`（刀路宽度派生）缩放扫过的宽度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AerialaceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 26, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.08, 0.3],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xBFE6FF, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.08, 0.02],
                    color: 0xEAF6FF, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 50
                }
            ]
        },
        dash: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "streak", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 40, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.18, 0.5],
                    lifetime: [5, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xBFE6FF, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "trail", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 30, shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.02, 0.12], spin: 60,
                    lifetime: [4, 9], size: [0.34, 0.06],
                    color: 0xEAF6FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 110
                }
            ]
        },
        cut: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "blade", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polyline" },
                    rate: 80, direction: "shape", speed: [0.05, 0.2], spread: 12,
                    lifetime: [5, 11], size: [0.4, 0.08], sizeMode: "index",
                    color: 0xDCF1FF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "blade_cut", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 60, direction: "shape", speed: [0.08, 0.26], spread: 16,
                    lifetime: [4, 10], size: [0.16, 0.03],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.5,
                    burst: { count: { data: "cuts", fallback: 2 }, at: 0 }, maxParticles: 130
                },
                {
                    name: "impact", bind: "target", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "notes", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xBFE6FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "wisp", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xDCEFFF, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        past: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "land", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.05, drag: 0.88,
                    lifetime: [9, 18], size: [0.08, 0.02],
                    color: 0xE6F2F8, alpha: [0.55, 0], light: "world", maxParticles: 50
                },
                {
                    name: "settle", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xBFE6FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xBFE6FF, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aerialace", 1, AerialaceDefinition);
