/**
 * 薄雾球 / mistball 的客户端表现。
 *
 * 一句话：施法者身前吹起一团羽绒与雾 → 一颗灰白的雾球拖着羽绒慢悠悠地划出一道弧线 → 落在目标身上炸开成
 * 一团羽绒浓雾 → 若糊住了，雾就贴在目标身上继续飘一小段。
 * 色相家族：雾白与淡紫（0xEDEAF7 / 0xD8D2EE）为主，羽绒近白（0xFFFFFF）作高光，尘收在灰（0xB9B4C6）。
 * 拍子：起 charge（吹起）→ 行 flight（弧线）→ 击 burst（炸开）＋ cloud（雾团）→ 缠 cling（可选）／空 fizzle。
 * 范围：这招只作用在目标一点；`data.cloud`（体型与特攻派生）决定雾团画多大，玩家一眼看出雾罩住的是哪块。
 * 运动：charge 的羽绒向内收成球，flight 沿弧线下坠，burst 的羽绒向外炸开，cloud 的雾慢慢向外散、cling 的雾贴在身上打转。
 * 数：`data.cloud` 定雾团尺度，`data.motes`（特攻派生）定羽绒密度，`data.intensity`（本次威力派生）抬高炸开亮度。
 */
const MistballDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather_orb", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    rate: 14, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.24, 0.05],
                    color: 0xD8D2EE, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather_down", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 20, shape: { kind: "sphere", radius: 0.65 },
                    direction: "inward", speed: [0.02, 0.09], spin: 6,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        flight: {
            duration: 80,
            exit: { stop: 66, drain: 18 },
            emitters: [
                {
                    name: "ball", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    rate: 34, shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.3, 0.05],
                    color: 0xEDEAF7, alpha: [0.85, 0], light: "world", maxParticles: 44
                },
                {
                    name: "down_trail", bind: "projectile", fit: "none", trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 26, shape: { kind: "sphere", radius: 0.14 },
                    direction: "away", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "pop", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.015,
                    lifetime: [10, 20], size: [0.26, 0.06],
                    color: 0xD8D2EE, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fluff", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 26 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.02,
                    lifetime: [10, 22], size: [0.08, 0.015],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "world", maxParticles: 90
                }
            ]
        },
        cloud: {
            duration: 40,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "envelope", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 40,
                    shape: { kind: "sphere", radius: { data: "cloud", fallback: 1.2 } },
                    direction: "outward", speed: [0.03, 0.12], spin: 4,
                    lifetime: [14, 26], size: [0.4, 0.12],
                    color: 0xEDEAF7, alpha: [0.34, 0], light: "world", maxParticles: 160
                },
                {
                    name: "drift", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: { data: "motes", fallback: 26 },
                    shape: { kind: "sphere", radius: { data: "cloud", fallback: 1.2 } },
                    direction: "shape", speed: [0.02, 0.1], gravity: 0.01, spin: 5,
                    lifetime: [14, 28], size: [0.09, 0.02],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "world", maxParticles: 140
                }
            ]
        },
        cling: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "wrap", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 26,
                    shape: { kind: "sphere", radius: { data: "cloud", fallback: 1.2 } },
                    direction: "inward", speed: [0.02, 0.08], spin: 3,
                    lifetime: [12, 22], size: [0.24, 0.06],
                    color: 0xD8D2EE, alpha: [0.3, 0], light: "world", maxParticles: 80
                },
                {
                    name: "stuck_down", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 20,
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.01, 0.06], gravity: -0.005, spin: 7,
                    lifetime: [12, 24], size: [0.07, 0.015],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0xB9B4C6, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mistball", 1, MistballDefinition);
