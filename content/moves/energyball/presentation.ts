/**
 * 能量球 / energyball —— 客户端表现。
 *
 * 一句话：每个真实植被点一条绿线、小点按实际准备进度吸进身前的草能球 → 球沿直线飞出、一路抛落草叶与光尘 →
 * 命中活物时炸开成一圈草种与光点，只在真实接触的合法生长面按确认格位逐株出芽。
 * 色相家族：草绿（0x7FBF3A / 0x8FD14A）为主，嫩绿高光（0xEFFFC8）只给球心与击点，暗绿（0x3E6B2A）做余韵。
 * 拍子：起 gather（真实植被点连线＋小点吸向球心）→ 行 travel（飞行）→ 击 burst（炸开）→ 绽 bloom（落地生长）／空 fizzle。
 * 范围：单发点射，由 travel 的直线轨迹读出；gather 的线读服务端真实取样点，不是均匀圆环。
 * 运动：每个有效植物点为起点，种子小点按 `serverTick` 与真实准备时长 lerp 到球心；球沿直线飞出（服务端速度）。
 *   gather 线与 bloom 芽由自定义场景逐帧画；不再用整段 polyline 同时撒，也不在 0.9 圆盘上随机出芽。
 * 数：gather 的 `data.sites` 是保留的植被点数、球大小随 `data.scale`；
 *   bloom 的花粉读 `data.planted`（`terrainResult` 真正放下的格数），种子数读 `data.seeds`，强度读 `data.intensity`。
 */
const EnergyBallDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "gather_core", bind: "source", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 26, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.2, 0.04],
                    color: 0x8FD14A, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "gather_motes", bind: "source", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xEFFFC8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        travel: {
            duration: 100,
            exit: { stop: 80, drain: 16 },
            emitters: [
                {
                    name: "orb_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 44, shape: { kind: "sphere", radius: 0.18 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.3, 0.06],
                    color: 0x8FD14A, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 48
                },
                {
                    name: "orb_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    trail: { minDistance: 0.34 }, rate: 26,
                    direction: "away", speed: [0.0, 0.08], spread: 26, spin: 16,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x6FA83A, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "burst_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEFFFC8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "burst_seeds", bind: "target", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spread: 32, spin: 20,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0x7FBF3A, alpha: [0.8, 0], light: "world", maxParticles: 110
                },
                {
                    name: "burst_ring", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [10, 18], size: [0.28, 0.6],
                    color: 0x3E6B2A, alpha: [0.7, 0], light: "world", maxParticles: 6
                }
            ]
        },
        bloom: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "bloom_seeds", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spread: 30, spin: 18,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [12, 24], size: [0.07, 0.01],
                    color: 0x8FD14A, alpha: [0.7, 0], light: "world", maxParticles: 100
                },
                {
                    name: "bloom_motes", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "planted", fallback: 0 } },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xEFFFC8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "fizzle_smoke", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x5A7A44, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "fizzle_seeds", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.12], spread: 30, spin: 16,
                    gravity: 0.03,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x7FBF3A, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_energyball", 1, EnergyBallDefinition);

/**
 * 起手吸收：服务端上传实际采样到的植被点、球心与真实准备时长；每个有效点一条静态绿线，
 * 种子小点按 `serverTick` 与准备进度从各自的真实点 lerp 到同一个球心。整段不是 polyline 同时撒。
 */
WorldCombatClient.scene("world_combat:move_energyball_gather", 1, function (frame) {
    const entry: CombatSceneEntry<{ sites?: number[][]; origin?: number[]; start?: number; duration?: number; scale?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    const origin = Array.isArray(data.origin) && data.origin.length === 3 ? data.origin : null;
    if (!origin) return;
    const duration = typeof data.duration === "number" && data.duration > 0 ? data.duration : 1;
    const start = typeof data.start === "number" ? data.start : frame.serverTick();
    const progress = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    if (progress >= 1) return;
    const strength = typeof data.scale === "number" ? data.scale : 1;
    frame.ring(origin[0], origin[1], origin[2], Math.max(0.08, 0.12 + 0.14 * progress * Math.max(0.6, Math.min(2.2, strength))), (0xCC << 24) | 0x8FD14A);
    const sites = Array.isArray(data.sites) ? data.sites : [];
    const seedFrame = Math.floor(frame.serverTick() * 0.5) % 8;
    for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        if (!Array.isArray(site) || site.length !== 3) continue;
        frame.line(site[0], site[1], site[2], origin[0], origin[1], origin[2], (0x55 << 24) | 0x7FBF3A);
        frame.sprite("cobblemon:particle/generic/grass/xsseed", site[0] + (origin[0] - site[0]) * progress,
            site[1] + (origin[1] - site[1]) * progress, site[2] + (origin[2] - site[2]) * progress,
            0.16, 0, (0xCC << 24) | 0xEFFFC8, seedFrame, true);
    }
});

/** 真放置坐标逐株出芽：只画 `terrainResult` 确认的格位，没有合法落点时不发射。 */
WorldCombatClient.scene("world_combat:move_energyball_bloom", 1, function (frame) {
    const entry: CombatSceneEntry<{ placed?: number[][] }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const placed = entry.data && Array.isArray(entry.data.placed) ? entry.data.placed : [];
    if (!placed.length) return;
    const frameIndex = Math.floor(frame.serverTick() * 0.34) % 6;
    for (let i = 0; i < placed.length; i++) {
        const cell = placed[i];
        if (!Array.isArray(cell) || cell.length !== 3) continue;
        frame.sprite("cobblemon:particle/generic/grass/sprout", cell[0], cell[1] + 0.04, cell[2], 0.34, 0, (0xE0 << 24) | 0x7FBF3A, frameIndex, false);
    }
});
