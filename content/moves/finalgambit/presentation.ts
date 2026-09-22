/**
 * 搏命 / finalgambit 的客户端表现。
 *
 * 一句话：施法者把全身气血提到顶点（气血越多，光越盛——画面直接告诉对手这一记要押多大），贴上去的瞬间
 * 连同自己一起炸成一团赤红，随后伏倒在地。
 * 色相家族：血红到暗金（impact_fighting / smallexplosion / groundquake），倒地用焦黑烟。
 * 拍子：起（charge 蓄气血，亮度随押上的生命比例）→ 扑（dash）→ 击（detonate 自爆）→ 殒（faint 倒地）／留（spent）。
 * 范围：detonate 的爆环与地裂画的就是爆裂半径（data.scale = 实际半径 / 1.2）。
 * 运动：赤红能量从脚下升起、在头顶聚成球；扑身速度线沿实际方向铺开；自爆以命中点为中心向外爆。
 * 数：charge 的亮度由 data.stake（押上的生命比例）决定，detonate 的爆点数量由 data.count（与伤害占最大生命比例相关）决定。
 */
const FinalGambitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 20,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "life_rise", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: { data: "stake", fallback: 1 },
                    shape: { kind: "ring", radius: 0.5 }, direction: "up", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xC0392B, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "life_core", bind: "source", offset: [0, 0.9, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [7, 12], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0xF0C060, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 48
                }
            ]
        },
        dash: {
            duration: 18,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "rush_line", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    rate: 26, shape: { kind: "line", length: 1.1 },
                    orient: "direction", direction: "shape", speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.2, 0.06],
                    color: 0xC0392B, alpha: [0.75, 0], light: "full", maxParticles: 120
                }
            ]
        },
        detonate: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "blast_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 40 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [7, 13], size: [0.4, 0.06],
                    color: 0xE0603A, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 110
                },
                {
                    name: "burst", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: 3, at: 1, interval: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.7, 0.2],
                    color: 0xF09050, alpha: [0.9, 0], light: "full", maxParticles: 12
                },
                {
                    name: "shock_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 20, at: 2 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.07, 0.22],
                    lifetime: [10, 16], size: [0.4, 0.14],
                    color: 0xB58A4A, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "embers", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xE8B34A, alpha: [0.8, 0], gravity: 0.04, drag: 0.9, light: "full", maxParticles: 160
                }
            ]
        },
        faint: {
            duration: 26,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "collapse", bind: "source", offset: [0, 0.2, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 26, at: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.03, 0.12],
                    lifetime: [12, 20], size: [0.2, 0.03],
                    color: 0x3A3038, alpha: [0.6, 0], gravity: -0.01, light: "world", maxParticles: 70
                },
                {
                    name: "last_glow", bind: "source", offset: [0, 0.8, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE8B34A, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        spent: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "hold_on", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 12], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xE8B34A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.05, 0.015],
                    color: 0xB9AFA0, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_finalgambit", 1, FinalGambitDefinition);
