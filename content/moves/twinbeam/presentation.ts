/**
 * 双光束 / twinbeam 的客户端表现。
 *
 * 一句话：施法者双眼聚起两点灵光，随后左眼先射出一道、右眼再射出一道；两道光从两个眼位收拢、在目标身上汇成
 *   同一个亮点，第二道命中时亮点再炸开一圈共鸣。
 * 色相家族：灵紫粉（0xE8A6E6、0xC77BE0）做光与亮点，青白（0xF2ECFF）做光路核心，近白只给共鸣那一下。
 * 拍子：起 raise（双眼聚光）→ 射 beam（两道光路）→ 中 spark（落点亮点）→ 鸣 resonance（第二道共鸣）→ 收 settle。
 * 范围：beam 直接消费 `data.path`（从真实眼位到该道第一接触的两个世界顶点），画面里的两条光就是判定的两条线；
 *   打空/被墙挡时线仍画到接触点。spark 落在该道真实首触，resonance 只在两道确实打中同一目标时出现。
 * 运动：两道光从 `data.side` 两侧的真实眼位出发、沿 `data.direction` 朝同一瞄点收拢并继续飞完射程，`data.index` 区分第一/第二道。
 * 数：`data.motes`（特攻派生）绑定落点光点量，`data.beamRadius`（特攻派生）绑定光路粗细，`data.intensity`
 *   （实际威力派生）抬高亮度，`data.eyeSpan` 决定两眼起点分得多开。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const TwinbeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "charge", bind: "source", offset: [0, { data: "eyeHeight", fallback: 0.85 }, 0.2], height: 0.0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 2, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.1], spread: 10,
                    lifetime: [5, 10], size: [0.14, 0.02],
                    color: 0xE8A6E6, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "brow", bind: "source", offset: [0, { data: "eyeHeight", fallback: 0.85 }, 0.15], height: 0.0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 8, shape: { kind: "box", size: [0.4, 0.06, 0.06] },
                    direction: "inward", speed: [0.01, 0.06], spread: 8,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xF2ECFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        beam: {
            duration: 20,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 90, shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.02, 0.12], spread: 4,
                    lifetime: [4, 8], size: [{ data: "beamRadius", fallback: 0.1 }, 0.02],
                    color: 0xF2ECFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "shimmer", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 54, shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.03, 0.16], spread: 8,
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0xE8A6E6, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        spark: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "flash", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/moves/psychichit",
                    burst: { count: { data: "motes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.06, 0.28], spread: 22,
                    lifetime: [5, 11], size: [{ data: "beamRadius", fallback: 0.1 }, 0.03], sizeMode: "index",
                    color: 0xF2ECFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "drops", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.1, 0.36], spread: 26, drag: 0.92,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0xE8A6E6, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        resonance: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "harmony", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [8, 14], size: [{ data: "beamRadius", fallback: 0.1 }, 0.02], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 40
                },
                {
                    name: "echo", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "motes", fallback: 16 }, at: 2, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.32 }, direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [8, 15], size: [0.13, 0.02],
                    color: 0xE8A6E6, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.03, 0.14], spread: 18,
                    lifetime: [9, 16], size: [0.11, 0.02],
                    color: 0xE8A6E6, alpha: [0.4, 0], light: "full", maxParticles: 24
                }
            ]
        },
        settle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.85, 0], height: 0.0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 12], size: [0.13, 0.04],
                    color: 0xE8A6E6, alpha: [0.35, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_twinbeam", 1, TwinbeamDefinition);
