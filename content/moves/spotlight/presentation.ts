/**
 * 聚光灯 / Spotlight 的客户端表现。
 *
 * 一句话：掌心聚起一束光（windup）→ 光柱从施法者直射目标、在它身上炸开成一圈刺目光晕（beam）→
 *   被照亮者头顶悬着一盏可辨的聚光灯、光点绕身上升（lit）→ 真被转向的生物向它牵出一条短连线（link）→
 *   每次有人打中它，光晕在真实受击点猛地一闪（flare）→ 照明走完，光点升散（fade）。
 * 色相家族：暖白金 0xFFF0A8 作主体，亮白 0xFFFDF0 作高光，青白 0xCFF4FF 只画「谁被转向了」的短连线。
 * 范围：beam 与 link 都用 `data.path` 画 polyline，光从谁照到谁、谁转向了谁一眼可见；扫过范围随 `data.scale`。
 * 运动：光沿两人连线直射、命中时向外炸、持续光点绕身慢升、link 沿线轻轻流向被照者。
 * 数：光点数 `data.motes`、被转向者数 `data.lured`、曝光规模 `data.burst`、暴露比例 `data.bonus`
 *   都来自本招算出的机制值；flare 落在服务端给的真实受击点 `data.point`。
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 */
const SpotlightDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                { name: "charge", bind: "source", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 20, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 11], size: [0.1, 0.03],
                    color: 0xFFF0A8, alpha: [0.8, 0], light: "full", maxParticles: 46 },
                { name: "charge_core", bind: "source", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 6, shape: { kind: "point" },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [6, 12], size: [0.18, 0.3],
                    color: 0xFFFDF0, alpha: [0.6, 0], light: "full", maxParticles: 18 }
            ]
        },
        beam: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                { name: "ray", bind: "path", offset: [0, 0.75, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "shape", speed: [0.02, 0.08], trail: { minDistance: 0.1 },
                    lifetime: [7, 12], size: [0.16, 0.05], sizeMode: "index",
                    color: 0xFFF0A8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 140 },
                { name: "ray_core", bind: "path", offset: [0, 0.72, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xFFFDF0, alpha: [0.8, 0], light: "full", maxParticles: 110 },
                { name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.06, 0.18],
                    lifetime: [7, 13], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFDF0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40 }
            ]
        },
        lit: {
            exit: { drain: 26 },
            emitters: [
                { name: "glow", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 20 }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "up", speed: [0.005, 0.025], spin: 14,
                    lifetime: [18, 30], size: [0.12, 0.03],
                    color: 0xFFF0A8, alpha: [0.45, 0], alphaMode: "sin", light: "full", maxParticles: 44 },
                { name: "halo", bind: "target", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.004, 0.02],
                    lifetime: [14, 24], size: [0.4, 0.72], sizeMode: "sin",
                    color: 0xFFFDF0, alpha: [0.35, 0], light: "full", maxParticles: 14 },
                { name: "beacon", bind: "target", offset: [0, 1.15, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 8, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.006, 0.024], spin: 10,
                    lifetime: [16, 26], size: [0.22, 0.44], sizeMode: "sin",
                    color: 0xFFFDF0, alpha: [0.5, 0], light: "full", maxParticles: 18 },
                { name: "descend", bind: "target", offset: [0, 1.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "point" },
                    direction: "down", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFFF0A8, alpha: [0.7, 0], light: "full", maxParticles: 24 }
            ]
        },
        link: {
            exit: { drain: 20 },
            emitters: [
                { name: "tie", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "polyline" },
                    rate: { data: "lured", fallback: 1 }, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xCFF4FF, alpha: [0.55, 0], light: "full", maxParticles: 40 },
                { name: "tie_mote", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polyline" },
                    rate: 8, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [5, 9], size: [0.05, 0.015],
                    color: 0xCFF4FF, alpha: [0.45, 0], light: "full", maxParticles: 30 }
            ]
        },
        flare: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                { name: "pop", bind: "point", height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24], drag: 0.9,
                    lifetime: [8, 15], size: [0.18, 0.04],
                    color: 0xFFFDF0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50 },
                { name: "pop_ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.3, 0.62], sizeMode: "sin",
                    color: 0xFFF0A8, alpha: [0.6, 0], light: "full", maxParticles: 12 }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                { name: "dissipate", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.14, 0.32],
                    color: 0xFFF0A8, alpha: [0.3, 0], light: "world", maxParticles: 26 },
                { name: "last_mote", bind: "target", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFFDF0, alpha: [0.3, 0], light: "full", maxParticles: 22 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spotlight", 1, SpotlightDefinition);
