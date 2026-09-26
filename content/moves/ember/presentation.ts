/**
 * 火花 / ember 的客户端表现。
 *
 * 一句话：指尖先亮起一点火，随即一粒小而亮的火种被弹出、拖着一条短焰尾沿浅弧飞出，命中碎成一撮火星；
 * **只有真的点着**时才在身侧挂一层持续的小火，没点着只有短火星，不误导读作已烧着。
 * 色相家族：火苗橙（0xFF9A3C）与火心黄（0xFFD06A），烟收在深褐（0x3A2A22）。
 * 拍子：起 kindle（团火）→ 飞 flight（短尾）→ 击 burst（碎火，`data.burned` 标记是否点着）→ burn（贴火）／fizzle（空放末端）。
 * 范围：本招没有区域判定，burst 的碎火半径固定为一点，画面读出的就是「一粒火打在身上」。
 * 运动：flight 尾巴绑定服务端给的**真实弹体 UUID**（`data.projectile`），逐帧贴住弹体走浅弧；碎火向外散、贴火向上飘。
 * 数：burst 的火星数绑定 `data.sparks`（特攻与等级换算），强度绑定 `data.intensity`（威力派生）。
 */
const EmberDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kindle: {
            duration: 10,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "seed", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 12, shape: { kind: "sphere", radius: 0.12 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [5, 9], size: [0.14, 0.03],
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        flight: {
            emitters: [
                {
                    name: "head", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    trail: { minDistance: 0.22 }, rate: 26,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [5, 9], size: [0.24, 0.1],
                    color: 0xFF9A3C, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 46
                },
                {
                    name: "tail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    trail: { minDistance: 0.18 }, rate: 18,
                    direction: "velocity", speed: [0.0, 0.05], spread: 24,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [5, 11], size: [0.07, 0.01],
                    color: 0xFFD06A, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "sparks", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.06, 0.26], spread: 22,
                    lifetime: [5, 10], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "sparks", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.14 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 15], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xFF9A3C, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        burn: {
            duration: 0,
            emitters: [
                {
                    name: "clinging", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "sparks", fallback: 8 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.08, 0.01],
                    color: 0xFF9A3C, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 26
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [8, 15], size: [0.18, 0.3],
                    color: 0x3A2A22, alpha: [0.3, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ember", 1, EmberDefinition);
