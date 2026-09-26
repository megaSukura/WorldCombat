/**
 * 蛮干 / endeavor 的客户端表现。
 *
 * 一句话：两人之间拉出一根赤金的量尺，量出「你落后多少」；随后施法者贴地扑过去，撞上的一刻把对手的血线
 * 拽下来——落后的差越大，这一下炸得越亮越密；自己不落后时只在对手身上擦出一撮灰。
 * 色相家族：赤红到暗金（impact_fighting / largering / flat），尘与地环用焦土中性色。
 * 拍子：起（brace 站定收气）→ 示（measure 量尺）→ 击（dash 扑身、equalize 拉平 / flat 空响）→ 收（settle 扬尘）。
 * 范围：量尺画在两个参与者之间，长度就是这一记要拉平的生命差所在；equalize/flat 绑命中点。
 * 运动：量尺两端钉在两人身上随移动紧跟；扑身速度线沿施法者实际方向铺开；拉平时血光从命中点向外爆。
 * 数：equalize 的 burst.count 由服务端按「实际扣血 / 对手最大生命」算好传入（data.count）；
 * 被免疫或护盾完全挡下时服务端改播 blocked（冷灰护壁环，无血光），与真正拉平的赤金爆点分开。
 */
const EndeavorDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0xB5342B, alpha: [0.55, 0], light: "full", maxParticles: 30
                },
                {
                    name: "breath", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 14, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xD8483A, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        measure: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "gap_rod", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/flat",
                    rate: 44, shape: { kind: "polyline", closed: false },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [4, 9], size: [0.11, 0.03],
                    color: 0xE0603A, alpha: [0.8, 0], light: "full", maxParticles: 120
                },
                {
                    name: "gap_mark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xE8B34A, alpha: [0.75, 0], light: "full", maxParticles: 40
                }
            ]
        },
        dash: {
            duration: 24,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "rush_line", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 30, shape: { kind: "line", length: 1.2 },
                    orient: "direction", direction: "shape", speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.16, 0.05],
                    color: 0xE0603A, alpha: [0.75, 0], light: "full", maxParticles: 160
                },
                {
                    name: "toe_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "point" },
                    direction: "outward", speed: [0.05, 0.16], trail: { minDistance: 0.22 },
                    lifetime: [7, 13], size: [0.06, 0.015], sizeMode: "index",
                    color: 0xC9A377, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        },
        equalize: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "pull_flash", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.05, 0.22],
                    lifetime: [7, 12], size: [0.36, 0.06],
                    color: 0xE0603A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "level_grit", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.07, 0.28],
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0xD8B888, alpha: [0.7, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 160
                },
                {
                    name: "level_hit", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 2, at: 1 },
                    shape: { kind: "point" }, lifetime: [5, 9], size: [0.34, 0.08],
                    color: 0xF0D08A, alpha: [0.95, 0], light: "full", maxParticles: 6
                }
            ]
        },
        flat: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dead_air", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.015],
                    color: 0xB9AFA0, alpha: [0.5, 0], gravity: 0.02, light: "world", maxParticles: 48
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "ward_ring", bind: "target", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.26, 0.08],
                    color: 0x8FA0B8, alpha: [0.6, 0], light: "world", maxParticles: 36
                },
                {
                    name: "ward_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 3, at: 1 },
                    shape: { kind: "point" }, lifetime: [5, 9], size: [0.3, 0.07],
                    color: 0xC8D2DE, alpha: [0.8, 0], light: "full", maxParticles: 6
                }
            ]
        },
        settle: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "skid_ring", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [9, 15], size: [0.3, 0.12],
                    color: 0xA89162, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "settle_dust", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0x8C5A3A, alpha: [0.55, 0], gravity: 0.03, light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_endeavor", 1, EndeavorDefinition);
