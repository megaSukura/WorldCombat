/**
 * 同步干扰 / synchronoise 的客户端表现。
 *
 * 一句话：施法者头顶聚起一团自己属性色的频率光，电波以自身为圆心扫开一圈；被扫过的同频目标身上炸开
 * 锁光、并从施法者牵出一条同频连线，不同频的目标只被波淡淡穿过；被锁住的目标持续亮着同频显形，
 * 直到记号到期或被清除才随托管效果一起收走；扫完身周留下一圈圈同频余音。
 * 色相家族：整招只有**施法者属性的颜色**一家（服务端把属性色作为载荷 `tint` 传入，贴图数字按白色书写，
 * 由引擎按 tint 染色），外加中性近白做频率核心。
 * 拍子：起（attune 聚频，`data.resonances` 记可共振人数）→ 播（wave 电波扫开、lock 锁住同频＋连线 / pass 穿过不同频）
 *   → 持（resonance 随记号存续的显形）→ 收（echo 余音 / miss 白扫）。
 * 范围：attune / wave / echo 的地面圈按服务端传的 `data.radius`（真实电波半径）画出，玩家看到的圈就是会被扫到的地。
 * 运动：电波从圆心同时向外扫开，同频目标身上的光沿连线向内收拢锁住，不同频的目标只是被一圈淡纹穿过后散掉。
 * 数：`data.resonances`（预告里可共振的人数）决定起手聚起的频率点，`data.links`（实际被锁住的同频人数）决定频率核心的爆开量，
 * `data.marks`（特攻与等级派生）决定余音环数，`data.flow`（半径派生）决定环上密度，`data.count`（威力派生）决定锁住的爆光量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SynchronoiseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        attune: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1], spread: 12,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "rings", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.06], spread: 10,
                    lifetime: [10, 18], size: [0.3, 0.12],
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "full", maxParticles: 24
                },
                {
                    name: "echoes", bind: "source", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "resonances", fallback: 0 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        wave: {
            duration: 28,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "front", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "flow", fallback: 70 }, shape: { kind: "ring", radius: { data: "radius", fallback: 5.2 } },
                    direction: "outward", speed: [0.03, 0.12], spread: 8,
                    lifetime: [12, 20], size: [0.7, 1.2], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "spiral", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "circle", radius: { data: "radius", fallback: 5.2 }, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.1], spread: 12,
                    lifetime: [14, 24], size: [0.35, 0.6],
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "full", maxParticles: 140
                },
                {
                    name: "marks", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "marks", fallback: 6 }, interval: 3, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 5.2 } },
                    direction: "outward", speed: [0.02, 0.08], spread: 10,
                    lifetime: [10, 18], size: [0.4, 0.7], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "core", bind: "source", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/psychicsend",
                    burst: { count: { data: "links", fallback: 1 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.15, 0.5], spread: 18,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        lock: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/moves/psychichit",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.35], spread: 20,
                    lifetime: [8, 16], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "bond", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "count", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [10, 18], size: [0.24, 0.05],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.08], spread: 6,
                    lifetime: [10, 18], size: [0.3, 0.55], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", maxParticles: 12
                },
                {
                    name: "link", bind: "path", height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    shape: { kind: "polyline" }, rate: 22,
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.18, 0.05],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        resonance: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "outline", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.01, 0.05], spread: 10,
                    lifetime: [10, 18], size: [0.3, 0.1],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "motes", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 6, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.01, 0.04], spread: 12,
                    lifetime: [12, 22], size: [0.07, 0.02],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "band", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: 4, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.01, 0.04], spread: 6,
                    lifetime: [10, 18], size: [0.3, 0.55], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.4, 0], light: "full", maxParticles: 20
                }
            ]
        },
        pass: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "through", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 14], size: [0.2, 0.4],
                    color: 0xFFFFFF, alpha: [0.22, 0], light: "world", maxParticles: 16
                }
            ]
        },
        echo: {
            duration: 30,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "tone", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: { data: "flow", fallback: 50 }, shape: { kind: "ring", radius: { data: "radius", fallback: 5.2 } },
                    direction: "outward", speed: [0.01, 0.05], spread: 8,
                    lifetime: [14, 26], size: [0.5, 0.9], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.35, 0], light: "full", maxParticles: 90
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 5.2 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xFFFFFF, alpha: [0.3, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.1], spread: 10,
                    lifetime: [10, 18], size: [0.4, 0.8], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.3, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_synchronoise", 1, SynchronoiseDefinition);
