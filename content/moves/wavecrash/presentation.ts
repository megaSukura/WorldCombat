/**
 * 波动冲 / wavecrash 的客户端表现。
 *
 * 一句话：水先在身上收拢成一层涨满的壳，随人一起涌出去，撞实的一刻整片水墙从接触面炸开、把目标浇透并冲开，
 * 冲空则水壳散成一地水花。
 * 色相家族：水蓝与近白泡沫（0x4F9FD4 / 0xEAF6FF）为主，深青只给水壳与命中核心的一点高饱和。
 * 拍子：起 cloak（聚水成壳）→ 涌 surge（水墙前进）→ 击 impact（水墙炸开）＋ drench（浇透）／ spill（散开）。
 * 范围：surge 的水壳与尾迹贴施法者、随它涌过整段路；impact 与 drench 绑命中点，画的就是水墙拍到哪里。
 * 运动：聚水向内收成壳；涌进时水花沿历史拖尾向后溅；命中时整片向外爆开，浇透幕是一圈向内收的水纹。
 * 数：`data.spray`（速度与物攻派生）决定涌进与命中的总溅水量，`data.intensity`（威力 / 115 ×湿身与厚水壳加成）
 * 抬高密度与亮度，`data.scale`（判定半径 / 0.6）放大水墙与水环，`data.ratio` 让涌进水花随路程变浓。
 */
const WavecrashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        cloak: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 20, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [8, 15], size: [0.18, 0.04],
                    color: 0x6FB6E8, alpha: [0.6, 0], light: "full", maxParticles: 64
                },
                {
                    name: "damp", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0x8FA6B8, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        surge: {
            duration: 50,
            exit: { stop: 34, drain: 14 },
            emitters: [
                {
                    name: "shell", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 42, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.24, 0.05], sizeMode: "sin",
                    color: 0x4F9FD4, alpha: [0.62, 0], light: "full", maxParticles: 240
                },
                {
                    name: "jet", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: { data: "spray", fallback: 26 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "away", speed: [0.08, 0.24], spread: 10, trail: { minDistance: 0.24 },
                    lifetime: [5, 10], size: [0.18, 0.04],
                    alpha: [0.85, 0], light: "full", maxParticles: 220
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 30, shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0x9FC6DE, alpha: [0.5, 0], light: "world", maxParticles: 160
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 22, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.07, 0.28], spread: 16,
                    lifetime: [7, 12], size: [0.44, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "wall", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "spray", fallback: 26 } },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.09, 0.32],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.26, 0.05],
                    color: 0xBFE6FF, alpha: [0.8, 0], light: "full", maxParticles: 280
                }
            ]
        },
        drench: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "soak_ring", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.44 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0x3E8FCB, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "drip", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "spray", fallback: 26 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.06, drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x9FD0F0, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        spill: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "spill", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "spray", fallback: 26 } },
                    shape: { kind: "ring", radius: 0.48, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.22],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.2, 0.04],
                    color: 0x9FC6DE, alpha: [0.55, 0], light: "world", maxParticles: 120
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wavecrash", 1, WavecrashDefinition);
