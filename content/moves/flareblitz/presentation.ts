/**
 * 闪焰冲锋 / flareblitz 的客户端表现。
 *
 * 一句话：火焰从脚下烧到全身，整个人低头拖着一整条火线笔直撞出去；撞实的地方炸开一片火与烟，
 * 火顺着反震自己身上也回烧一下；冲空则火在脚下熄灭。
 * 色相家族：橙红（0xF2601E 与 0xC03818），白热核心（0xFFE8A0），烟灰（0x6A5B52）只在余韵出现。
 * 拍子：燃 ignite（烧身）→ 冲 charge（火线直线）→ 行 wake（余焰）→ 撞 impact（爆火）→ 反 recoil（回烧）／ 熄 skid（空冲熄灭）。
 * 范围：charge 的冲刺线沿 `data.path` 两顶点铺成一条火带，画的就是冲程覆盖到的区域（横向按 `data.scale` 缩放）。
 * 运动：火焰贴向身体、火星向后甩；wake 沿路径留下会慢慢暗下去的余焰。
 * 数：`data.embers`（速度与物攻派生）决定火星与爆火的密度，`data.intensity`（本次伤害派生）决定命中核心的亮度，
 * `data.burn`（1 表示目标被点着）决定命中核心是否多一圈燃烧辉光，`data.afterburn`（1 表示余焰式）在起手多烧一圈余烬。
 */
const FlareblitzDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        ignite: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "cloak", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.75 }, direction: "inward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.36, 0.12],
                    color: 0xF2601E, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "seed", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "ring", radius: 0.55 }, direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 44
                },
                {
                    // afterburn=1（余焰式）时先烧起一圈更厚的余烬，预告这一趟转成持续燃烧。
                    name: "afterburn", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "afterburn", fallback: 0 }, repeats: 8, interval: 1 },
                    shape: { kind: "sphere_surface", radius: 0.65 }, direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 15], size: [0.4, 0.14],
                    color: 0xC03818, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 50
                }
            ]
        },
        charge: {
            duration: 56,
            exit: { stop: 30, drain: 16 },
            emitters: [
                {
                    name: "track", bind: "path", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "polyline" },
                    rate: { data: "embers", fallback: 28 }, speed: [0.03, 0.12], spread: 22,
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF2601E, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 260
                },
                {
                    name: "body", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "embers", fallback: 28 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "away", speed: [0.05, 0.22], drag: 0.9,
                    lifetime: [7, 13], size: [0.44, 0.14],
                    color: 0xF2601E, alpha: [0.75, 0], light: "full", bloom: { data: "intensity", fallback: 0.35 }, maxParticles: 130
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 28 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "away", speed: [0.12, 0.45], spread: 20, drag: 0.9,
                    lifetime: [5, 10], size: [0.13, 0.02],
                    color: 0xFFE8A0, alpha: [0.95, 0], light: "full", bloom: 0.55, maxParticles: 110
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.32, 0.24, 0.32] }, direction: "shape", speed: [0.02, 0.1],
                    trail: { minDistance: 0.28 }, lifetime: [5, 8], size: [0.17, 0.05],
                    color: 0xFFE8A0, alpha: [0.6, 0], light: "full", maxParticles: 140
                }
            ]
        },
        wake: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "after", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "embers", fallback: 28 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.02, 0.1], drag: 0.9, gravity: -0.01,
                    lifetime: [10, 18], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xC03818, alpha: [0.6, 0], light: "full", bloom: { data: "intensity", fallback: 0.2 }, maxParticles: 150
                },
                {
                    name: "smolder", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.34 }, direction: "up", speed: [0.02, 0.08],
                    gravity: -0.02, drag: 0.9, lifetime: [14, 24], size: [0.3, 0.1],
                    color: 0x6A5B52, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "embers", fallback: 28 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.1, 0.34], spread: 18,
                    lifetime: [7, 14], size: [0.46, 0.06], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [1, 0], light: "full", bloom: { data: "intensity", fallback: 0.6 }
                },
                {
                    name: "bloom", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "embers", fallback: 28 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.12, 0.4], drag: 0.9,
                    lifetime: [8, 16], size: [0.4, 0.1], sizeMode: "index",
                    color: 0xF2601E, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 200
                },
                {
                    name: "burn_glow", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "burn", fallback: 0 }, repeats: 12, interval: 1 },
                    shape: { kind: "sphere_surface", radius: 0.4 }, direction: "outward", speed: [0.05, 0.18],
                    lifetime: [9, 16], size: [0.2, 0.03],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "smoke", bind: "target", offset: [0, 0.75, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.55 }, direction: "up",
                    speed: [0.03, 0.12], gravity: -0.02, drag: 0.9,
                    lifetime: [16, 28], size: [0.44, 0.18],
                    color: 0x6A5B52, alpha: [0.38, 0], light: "world", maxParticles: 50
                }
            ]
        },
        recoil: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "backfire", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "embers", fallback: 16 } },
                    shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.28],
                    lifetime: [8, 15], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xC03818, alpha: [0.8, 0], light: "full", bloom: { data: "intensity", fallback: 0.3 }, maxParticles: 70
                },
                {
                    name: "singe", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.42 }, direction: "outward",
                    speed: [0.03, 0.12], drag: 0.9, lifetime: [12, 22], size: [0.3, 0.12],
                    color: 0x6A5B52, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        skid: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "die", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 18 } },
                    shape: { kind: "ring", radius: 0.5 }, direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.02, drag: 0.9, lifetime: [8, 16], size: [0.1, 0.01],
                    color: 0xC03818, alpha: [0.65, 0], light: "world", bloom: { data: "intensity", fallback: 0.2 }, maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flareblitz", 1, FlareblitzDefinition);
