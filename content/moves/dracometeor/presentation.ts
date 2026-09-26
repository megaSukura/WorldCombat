/**
 * 流星群 / dracometeor 的客户端表现。
 *
 * 一句话：施法者抬头，落点逐颗亮起一圈标记、天上聚起一点将坠的光 → 陨石拖着紫绿的龙焰尾迹垂直砸下 →
 *   每颗在真实碰撞位置炸开一圈龙属性能量（撞在屋顶就在上层爆）。
 * 色相家族：龙焰的紫绿（0x9A8AF0 / 0x6FE0C8）为主体，燃石的橙（0xD98A4A）与深褐烟（0x2E2824）衬托。
 * 拍子：起 summon（聚落点）→ 标 mark（逐颗地面圈）→ 落 fall（下坠尾迹）→ 击 impact（命中）与 burst（炸点与余烬）。
 * 范围：mark 用 `data.radius`（每颗落点半径）画出会被砸到的地；burst 用 `data.impactRadius`。
 * 运动：陨石垂直向下、尾迹沿自身路径拖出；落点向外崩碎星与碎石。
 * 数：碎片数绑定 `data.shards`（特攻派生），强度绑定 `data.intensity`（单颗威力 / 120），
 *   落星数量由服务端逐颗触发 mark／fall／burst 表达。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DracometeorDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        summon: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "sky", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 20, shape: { kind: "sphere", radius: { data: "radius", fallback: 1.8 } },
                    direction: "inward", speed: [0.1, 0.4],
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x9A8AF0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "column", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsalphaboost",
                    rate: 24, shape: { kind: "line", length: 6 },
                    direction: "up", speed: [0.05, 0.2],
                    lifetime: [8, 15], size: [0.16, 0.02],
                    color: 0x6FE0C8, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 70
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { drain: 14 },
            emitters: [
                {
                    name: "landing", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 6, shape: { kind: "ring", radius: { data: "radius", fallback: 1.8 } },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.3, 0.5],
                    color: 0x9A8AF0, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 1.8 }, thickness: 0.85 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A7AB0, alpha: [0.35, 0], light: "world", maxParticles: 50
                }
            ]
        },
        fall: {
            duration: 0,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    trail: { minDistance: 0.35 }, rate: 40,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.26, 0.04],
                    color: 0x9A8AF0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    trail: { minDistance: 0.45 }, rate: 26,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x6FE0C8, alpha: [0.75, 0], light: "full", maxParticles: 70
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.36], spread: 22,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0x9A8AF0, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "shard", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "shards", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26, gravity: 0.07, drag: 0.9, spin: 20,
                    lifetime: [10, 20], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xD98A4A, alpha: [0.9, 0], light: "world", maxParticles: 120
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "impactRadius", fallback: 1.3 } },
                    direction: "outward", speed: [0.16, 0.4],
                    lifetime: [8, 14], size: [0.4, 0.08],
                    color: 0xC0B4E8, alpha: [0.75, 0], light: "world", maxParticles: 24
                },
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 20 } },
                    shape: { kind: "circle", radius: { data: "impactRadius", fallback: 1.3 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 40, gravity: 0.08, drag: 0.9, spin: 26,
                    lifetime: [10, 22], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x6A5A50, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: { data: "impactRadius", fallback: 1.3 } },
                    direction: "up", speed: [0.03, 0.14], drag: 0.9,
                    lifetime: [14, 26], size: [0.3, 0.52],
                    color: 0x2E2824, alpha: [0.35, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dracometeor", 1, DracometeorDefinition);
