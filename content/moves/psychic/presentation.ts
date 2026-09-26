/**
 * 精神强念 / psychic 的客户端表现。
 *
 * 一句话：施法者身前收拢一团深紫念力 → 目标脚边合拢一圈念力环、身上缠起向内的念力丝，并牵一条连到
 * 念力锚点的丝线随持续瞄准移动 → 窗口结束整团猛地一挤、炸开一圈白边大环；被压到特防时冒一圈紫星。
 * 色相家族：深紫蓝（0x7A52E6 主 / 0xB49CF0 亮 / 0x4A2FA0 暗）为主体，近白只给挤压核心。
 * 拍子：起 windup/lock（聚念与锁定）→ 握 grip（合拢、缠丝、锚点连线，随操纵窗口每刻更新）→ 挤 squeeze（爆发）
 *   → 压 sunder（特防）→ 松 release 与空握 empty。
 * 范围：grip 的贴地环与 squeeze 的冲击环按 `data.scale`（擒压威力 / 92）铺开，就是这一握压住的那块地方。
 * 运动：windup 向内收；lock 的环缓缓自转；grip 的念力丝由外向内收拢、丝线连到当刻锚点；squeeze 整团向外炸开。
 * 数：`data.spirals`（特攻与等级派生）决定缠丝、丝线、贴地环与释放的密度，`data.intensity` 抬高亮度；
 *   实际抗位移时服务端把 intensity 抬高，读作念力手绷紧而目标没有被推走。
 */
const PsychicDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0.68,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 24, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.22, 0.04], sizeMode: "sin",
                    color: 0x7A52E6, alpha: [0.85, 0], light: "full", maxParticles: 48
                },
                {
                    name: "core", bind: "source", offset: [0, 0.05, 0], height: 0.68,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 9, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xB49CF0, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        lock: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "lock_ring", bind: "target", offset: [0, 0.14, 0], height: 0.75, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: 6, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.005, 0.02], spin: 12,
                    lifetime: [12, 20], size: [0.22, 0.42],
                    color: 0x9B7BEE, alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        },
        grip: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "cage", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: { data: "spirals", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.22], drag: 0.9,
                    lifetime: [10, 20], size: [0.24, 0.03],
                    color: 0x7A52E6, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "ground", bind: "target", offset: [0, 0.04, 0], height: 0.05, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.4, 0.72],
                    color: 0x4A2FA0, alpha: [0.7, 0], light: "world", maxParticles: 6
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.06, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "spirals", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x8E7BC0, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "tether", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "spirals", fallback: 14 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.02, 0.09], spread: 14, spin: 8,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xB49CF0, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "anchor", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [8, 14], size: [0.16, 0.34],
                    color: 0x9B7BEE, alpha: [0.7, 0], light: "full", maxParticles: 8
                }
            ]
        },
        squeeze: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "crush", bind: "target", offset: [0, 0.18, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF0E4FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 10
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.1, 0], height: 0.4, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.14, 0.4],
                    lifetime: [12, 20], size: [0.4, 1.1],
                    color: 0x7A52E6, alpha: [0.65, 0], light: "full", maxParticles: 5
                },
                {
                    name: "debris", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "spirals", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.3], spread: 30, gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xB49CF0, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        sunder: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crack", bind: "target", offset: [0, 0.16, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 2, interval: 3 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 16], size: [0.24, 0.5],
                    color: 0xE070D0, alpha: [0.7, 0], light: "full", maxParticles: 10
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.16, 0.02],
                    color: 0x6B58A0, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        empty: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "clench", bind: "point", fit: "none", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: { data: "spirals", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0x7A52E6, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        release: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slip", bind: "target", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "spirals", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26, spin: 6,
                    lifetime: [10, 16], size: [0.14, 0.02],
                    color: 0x6B58A0, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychic", 1, PsychicDefinition);
