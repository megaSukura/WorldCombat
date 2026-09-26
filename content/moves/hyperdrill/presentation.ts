/**
 * 强力钻 / hyperdrill 的客户端表现。
 *
 * 一句话：施法者压低身子、身前凝出一枚高速自转的银白钻头 → 钻头贴着地面直直凿出去，拖出一道钢蓝气流与
 *   飞溅的钻屑 → 钻到目标身上时，撑在它外面的守护先整层崩成冷白碎光，随后银白钻击炸开、目标被顶开。
 * 色相家族：冷银钢（0xC9D2E0 主体、0xEDF2F8 亮面、近白核心），余韵用中性灰（0x8A8F98）；无第二个色相。
 * 拍子：起 charge 0–18t ／ 钻 spin（逐刻续期）／ 凿 bore 0–26t ／ 中 drill ／ 收 skid ／ 空 miss。
 * 范围：bore／drill 钉在真实首接触点上（`bind: "point"`），半径按 `data.scale`（判定半径 / 0.5）缩放；
 *   spin 是一条沿 `data.direction` 的线，玩家一眼看出钻到哪、有多粗。
 * 运动：charge 的钻屑绕身体向内收成钻头；spin 的钢蓝气流沿方向拖尾、钻头自转；bore 的钻尖与拆盾碎片在同一
 *   接触点向外崩、钻屑受重力落下；skid 在真实停点收势。
 * 数：`data.grains`（物攻与速度派生的钻屑数）驱动 charge／spin／drill 的发射量，`data.broken`（凿开的守护
 *   层数）决定 bore 碎光的数量与亮度，`data.intensity`（威力 / 90）抬高命中那一下的密度。
 */
const HyperDrillDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 4, drain: 11 },
            emitters: [
                {
                    name: "cone", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: 26, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.2], spin: 30,
                    lifetime: [6, 12], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xC9D2E0, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "grains", fallback: 16 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16], spin: 18,
                    lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0xEDF2F8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                }
            ]
        },
        spin: {
            duration: 0,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "boreline", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    trail: { minDistance: 0.2 }, rate: 40,
                    direction: "velocity", speed: [0.0, 0.02], spin: 32,
                    lifetime: [5, 10], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xC9D2E0, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 130
                },
                {
                    name: "drillhead", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: 24, shape: { kind: "sphere", radius: 0.34 },
                    direction: "velocity", speed: [0.05, 0.18], spin: 34,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xEDF2F8, alpha: [0.6, 0], light: "world", maxParticles: 80
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "grains", fallback: 16 },
                    direction: "velocity", speed: [0.06, 0.2], spin: 20, spread: 24,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xEDF2F8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        bore: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "guard_shatter", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "broken", fallback: 1 }, interval: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.14, 0.34], spin: 26,
                    lifetime: [10, 18], size: [0.36, 0.64], sizeMode: "index",
                    color: 0xEDF2F8, alpha: [0.75, 0], light: "full", maxParticles: 26
                },
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "broken", fallback: 1 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.14, 0.36],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xEDF2F8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "grains", fallback: 16 }, at: 1 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.32], spread: 26,
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xEDF2F8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "gritfall", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grains", fallback: 16 } }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x8A8F98, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        drill: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "grains", fallback: 16 }, at: 1 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.32], spread: 26,
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xEDF2F8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 80
                }
            ]
        },
        skid: {
            duration: 18,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "settle", bind: "source", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grains", fallback: 14 } }, shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.12], gravity: 0.04,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x8A8F98, alpha: [0.45, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "stall", bind: "source", offset: [0, 0.3, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x8A8F98, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hyperdrill", 1, HyperDrillDefinition);
