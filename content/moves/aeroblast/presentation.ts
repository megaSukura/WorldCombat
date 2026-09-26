/**
 * 气旋攻击 / aeroblast 的客户端表现。
 *
 * 一句话：施法者口边的空气先旋起、越拧越紧，随后朝锁定方向连续压出三拍灰青涡流细束；每一拍都从身前一直
 * 连到真实的射线落点（首个活体或挡墙处），命中处在目标身上炸开一小团涡光，打到墙则只在墙面收束。
 * 色相家族：灰青与近白（swirlingwind／spiral／impact_flying），近白高光只给命中与暴击那一下。
 * 拍子：起（charge 拧气）→ 射（flight 三拍细束，每拍画到真实落点）→ 爆（burst 命中炸开；wall 墙面收束）→ 强调（crit）。
 * 范围：flight 每拍的 `data.path` 就是服务端这一拍 `trace` 的起点与真实落点，`data.length` 是实际束长；
 *   画多长，判定就到哪——挡墙会截短这一拍。
 * 运动：charge 的风点向内旋入；flight 的涡流沿 `data.path` 由近及远铺开、绕轴自转；burst 只在首接触处向外炸开一小团。
 * 数：`data.spiral`（特攻派生）决定束身与命中的涡光密度，`data.radius` 决定单拍判定粗细，`data.pulse`／`data.beats`
 *   让第几拍可读，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AeroblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charge_spiral", bind: "source", offset: [0, 0.55, 0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 30, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.18], spread: 10, spin: 16,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xCFEFF5, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "charge_core", bind: "source", offset: [0, 0.55, 0.35], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/vanilla/spiral",
                    rate: 22, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.1], spread: 8, spin: 22,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xEAFBFF, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 44
                }
            ]
        },
        flight: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "vortex_core", bind: "path", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "spiral", fallback: 30 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.12], spread: 8, spin: 26, sizeMode: "index",
                    lifetime: [7, 13], size: [0.28, 0.06],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 140
                },
                {
                    name: "vortex_thread", bind: "path", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/spiral",
                    rate: { data: "spiral", fallback: 30 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.03, 0.14], spread: 12, spin: 18,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x9FD8E8, alpha: [0.5, 0], light: "full", maxParticles: 140
                },
                {
                    name: "muzzle", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 18,
                    lifetime: [5, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xDFF6FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_core", bind: "point", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 30 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.18, 0.55], spread: 12, spin: 10,
                    lifetime: [7, 14], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 110
                },
                {
                    name: "burst_wind", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    burst: { count: 8, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.34], spread: 16, drag: 0.9,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xBCE6F2, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "wall_scatter", bind: "point", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.12, 0.4], spread: 24, gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xCFEFF5, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "wall_dust", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 18, gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0xBFCED6, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        crit: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_core", bind: "point", offset: [0, 0.55, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 30 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.22, 0.65], spread: 10, spin: 12,
                    lifetime: [7, 14], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 120
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14], spread: 18, gravity: 0.01, drag: 0.92,
                    lifetime: [12, 20], size: [0.16, 0.02],
                    color: 0xC9E2EA, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aeroblast", 1, AeroblastDefinition);
