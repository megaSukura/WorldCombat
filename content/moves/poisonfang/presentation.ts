/**
 * 剧毒牙 / poisonfang 的客户端表现。
 *
 * 一句话：牙面挂起毒滴、毒雾绕口打转 → 合牙的一刻只在接触点短合牙与獠牙剪影 → 压一小拍时接触处攥起小毒囊 →
 * 毒真的渗开才向受体冒出一簇毒泡（加重成剧毒则更暗更密）；若目标挣脱口边，毒滴只在原处落空；
 * 若毒被拒（免疫等），毒滴在接触处散落而不向受体扩散。
 * 色相家族：毒绿（0x9BE86B）与深绿（0x5FBF3A），近白青（0xD4F58A）只做高光；剧毒用同一族的更暗绿，不引入第二色相。
 * 拍子：起 charge（挂毒）→ 咬 bite（短合牙，命中）／ miss → 压 pump（毒囊压缩，时长读 data.hold）→
 *   灌 venom（渗毒，剧毒更暗）／ refuse（被拒散滴）／ drip（挣脱落空）。
 * 范围：bite 绑命中点、pump／refuse／drip 绑接触点、venom 绑受体，画出的就是咬中的位置与毒的去向。
 * 运动：venom 的毒泡从受体向上冒并慢慢破开；pump 的毒囊向内压缩；refuse／drip 的毒珠在接触点向下滴落。
 * 数：`data.drops`（特攻派生）决定渗出毒泡的数量；`data.intensity`（威力 / 54）抬高密度与亮度；
 * `data.scale`（獠牙判定 / 0.40）放大牙影与判定环；`data.toxic`（1 为剧毒）把毒泡换成更暗更密的一层。
 */
const PoisonfangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "world", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "droplets", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    rate: 8, shape: { kind: "ring", radius: 0.26, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.05,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x5FBF3A, alpha: [0.9, 0], light: "world", maxParticles: 32
                }
            ]
        },
        bite: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fang_frames", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 11], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xD4F58A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "snap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 4, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [5, 9], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xEAF7C8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 24
                }
            ]
        },
        pump: {
            duration: { data: "hold", fallback: 6 },
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "sac", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 9, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.16, 0.05],
                    color: 0x9BE86B, alpha: [0.9, 0], light: "world", bloom: 0.2, maxParticles: 36
                },
                {
                    name: "press", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    rate: 5, shape: { kind: "ring", radius: 0.22, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x5FBF3A, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        venom: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "spread", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "drops", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.05, 0.22],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "seep", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 8 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.14, 0.04], sizeMode: "index",
                    color: 0x9BE86B, alpha: [0.85, 0], light: "world", bloom: 0.25, maxParticles: 46
                },
                {
                    name: "toxic_pulse", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 8 }, interval: 3 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0x5FBF3A, alpha: 0.55, light: "world", maxParticles: 40
                },
                {
                    name: "coil", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.07], spread: 12,
                    lifetime: [10, 16], size: [0.1, 0.03],
                    color: 0x5FBF3A, alpha: [0.8, 0], light: "world", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        refuse: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "bead", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.12, drag: 0.96,
                    lifetime: [8, 14], size: [0.11, 0.03], sizeMode: "index",
                    color: 0x7FB84A, alpha: [0.7, 0], light: "world", maxParticles: 44
                },
                {
                    name: "slip", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.22, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.01, 0.04], gravity: 0.14, drag: 0.98,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0x5FBF3A, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        drip: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fall", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05], gravity: 0.14, drag: 0.98,
                    lifetime: [10, 18], size: [0.09, 0.03], sizeMode: "index",
                    color: 0x5FBF3A, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "waste", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.24, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.08,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xA8C88A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poisonfang", 1, PoisonfangDefinition);
