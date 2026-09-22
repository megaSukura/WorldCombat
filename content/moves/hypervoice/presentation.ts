/**
 * 巨声 / hypervoice 的客户端表现。
 *
 * 一句话：施法者扎住脚、气与尘往喉口收，随后一堵发白的声墙沿正前方整片压出去——扇形里气浪向外翻卷、
 * 边缘卷着白亮的声纹，被扫到的人身上炸开一蓬尘点并被朝前推。
 * 色相家族：冷白与青灰（sonicboom / giantring_white / swirlingwind / tinydust / orb），近白只给声墙核心与边缘。
 * 拍子：起（charge 收气拢尘）→ 吼（wave 声墙整片扫出）→ 击（hit 逐处轰中）→ 收（miss 落空 / 余波散去）。
 * 范围：wave 的扇面用服务端传的 `data.path`（与判定 `WorldGeometry.sector` 同一组顶点）填出，`data.reach`
 *   与 `data.half` 是同一份长度与半张角——玩家看到的扇形就是会被轰到的地。
 * 运动：charge 尘点向内收；wave 声墙沿 `data.direction` 从身上整片向外推、地面尘被掀起；hit 在目标身上向外甩出。
 * 数：`data.flow`（张角与射程派生）决定声墙与地面尘的密度，`data.marks`（威力派生）决定核心高光量，
 *   `data.count`（本次威力×衰减派生）决定命中量，`data.strength` 决定命中强弱。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const HypervoiceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.6, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.16], spread: 14, spin: 10,
                    lifetime: [9, 16], size: [0.3, 0.08],
                    color: 0x8FA2BC, alpha: [0.45, 0], light: "world", maxParticles: 48
                },
                {
                    name: "throat", bind: "source", offset: [0, 0.7, 0.1], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 10, at: 2 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [7, 13], size: [0.11, 0.02],
                    color: 0xEDF0F8, alpha: [0.8, 0], light: "full", maxParticles: 26
                },
                {
                    name: "foot", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 1.2 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x9AA0B0, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        wave: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "body", bind: "source", offset: [0, 0, 0], height: 0.7, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: { data: "marks", fallback: 20 }, at: 0 }, amount: 1,
                    shape: { kind: "cone_volume", radius: 0.4, length: { data: "reach", fallback: 7.2 }, angleDegrees: { data: "half", fallback: 50 } },
                    direction: "shape", speed: [0.12, 0.42], spread: 18,
                    lifetime: [7, 13], size: [0.6, 1.5], sizeMode: "index",
                    color: 0xF2F4FA, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "air", bind: "path", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "polygon" },
                    rate: { data: "flow", fallback: 90 }, direction: "shape", speed: [0.1, 0.3], spread: 6, spin: 12,
                    lifetime: [7, 14], size: [0.2, 0.04],
                    color: 0xB8C0D0, alpha: [0.4, 0], light: "world", maxParticles: 320
                },
                {
                    name: "edge", bind: "path", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "flow", fallback: 90 }, direction: "shape", speed: [0.08, 0.26], spread: 10,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xEDF0F8, alpha: [0.8, 0], light: "full", maxParticles: 240
                },
                {
                    name: "ground", bind: "path", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "flow", fallback: 80 }, direction: "outward", speed: [0.06, 0.22], spread: 20, drag: 0.93,
                    gravity: 0.008, lifetime: [9, 18], size: [0.07, 0.01],
                    color: 0x9AA0B0, alpha: [0.45, 0], light: "world", maxParticles: 260
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [6, 12], size: [0.45, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "shove", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: { data: "count", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.24, 0.6], spread: 22,
                    lifetime: [9, 16], size: [0.18, 0.03],
                    color: 0xD8DCE8, alpha: [0.7, 0], light: "full", maxParticles: 56
                },
                {
                    name: "ring", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1], spread: 6,
                    lifetime: [10, 16], size: [0.36, 0.62], sizeMode: "linear",
                    color: 0xE4E8F2, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "puff", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.18], spread: 14,
                    gravity: 0.02, drag: 0.9, lifetime: [12, 20], size: [0.2, 0.05],
                    color: 0xB8B8C0, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hypervoice", 1, HypervoiceDefinition);
