/**
 * 月亮之力 / moonblast 的客户端表现。
 *
 * 一句话：施法者抬头，头顶的月光一缕缕拢进身前一颗球里 → 球飞出去、拖一条月尘 → 命中炸开一牙弯月与放射辉光
 * → 若被夺走集中力，目标头顶再飘起几缕月光散掉；飞空则只落一撮月尘。
 * 色相家族：月白与暖金（0xF6EFD0 / 0xFFF3D6）为主，银紫（0xE4DEFF）作暗部，近白只给击点；粉尘收在灰白。
 * 拍子：起 charge（拢光）→ 行 flight（球＋月尘）→ 击 burst（月牙）→ 夺 drain（可选的降攻）／空 fizzle。
 * 范围：这招只作用在目标一点，各层都绑 `projectile`／`target`／`source`；`data.rays` 决定爆开时放射几道。
 * 运动：charge 的月光向内收拢，flight 沿弹道直飞，burst 的辉光沿半径向外射、月尘向外散落。
 * 数：`data.moon`（月华比例，世界事实派生）抬高弥散与亮度，`data.orb`（判定半径派生）决定球的画多大，
 *   `data.motes`（特攻派生）决定被夺光点数量。
 */
const MoonblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "tempo", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: { data: "moonRate", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [{ data: "moonSize", fallback: 0.34 }, 0.05],
                    color: 0xFFF3D6, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 18, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.11], spin: 8,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xF6EFD0, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        flight: {
            duration: 70,
            exit: { stop: 60, drain: 16 },
            emitters: [
                {
                    name: "ball", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 40, shape: { kind: "sphere", radius: 0.12 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [5, 12], size: [{ data: "orb", fallback: 0.4 }, 0.06],
                    color: 0xFFF3D6, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "trail", bind: "projectile", fit: "none", trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "away", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xE4DEFF, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 8, drain: 22 },
            emitters: [
                {
                    name: "crescent", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 3 },
                    shape: { kind: "sphere", radius: { data: "burst", fallback: 0.95 } },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [{ data: "orb", fallback: 0.4 }, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 8
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.4, 0.9],
                    color: 0xFFF3D6, alpha: [0.8, 0], light: "full", maxParticles: 8
                },
                {
                    name: "rays", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.4], spread: 24,
                    lifetime: [8, 18], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xF6EFD0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.02,
                    lifetime: [10, 22], size: [0.05, 0.01],
                    color: 0xE4DEFF, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        drain: {
            duration: 34,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "leak", bind: "target", offset: [0, 0.65, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 4, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.11],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFF3D6, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xE4DEFF, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_moonblast", 1, MoonblastDefinition);
