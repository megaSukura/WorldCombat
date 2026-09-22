/**
 * 热风 / heatwave 的客户端表现。
 *
 * 一句话：施法者嗓子与胸前先透出一层热光、周围空气发亮，随后一道扇形热浪贴着地面从身前整片推出去，
 *   热浪里夹着细小的火星与卷起的尘，被扫到的人身上炸开一圈火；推到最后余热与尘慢慢散。
 * 色相家族：热浪的橙（0xFF8A3C）与近白的热芯（0xFFE2B0）为主体，卷起的暖灰尘（0xC0A070）衬托。
 * 拍子：起 inhale（焐气）→ 吹 wave（扇面逐格推开）→ 击 hit（扫到目标）→ 散 dissipate（余热散去）。
 * 范围：wave 沿服务端传的 `data.path`（与判定同一组扇面顶点）用 polygon 填出面，画面推到哪就烧到哪。
 * 运动：扇面每刻由服务端的 `data.reach` 决定外缘位置，粒子沿扇形向前、向外；命中者沿离身方向被推。
 * 数：wave 的密度绑定 `data.embers`（特攻与速度换算），hit 的火量绑定 `data.count`（威力派生），
 *   强度绑定 `data.intensity`（威力派生）。
 */
const HeatwaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 16, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 11], size: [0.22, 0.05],
                    color: 0xFFE2B0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.15, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.4],
                    color: 0xC0A070, alpha: [0.25, 0], light: "world", maxParticles: 24
                }
            ]
        },
        wave: {
            duration: 0,
            emitters: [
                {
                    name: "front", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "embers", fallback: 30 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.13], spread: 12,
                    lifetime: [5, 10], size: [0.28, 0.05],
                    color: 0xFF8A3C, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 200
                },
                {
                    name: "core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "embers", fallback: 18 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.02, 0.09], spread: 8,
                    lifetime: [5, 9], size: [0.22, 0.04],
                    color: 0xFFE2B0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "embers", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 20 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [6, 14], size: [0.07, 0.01],
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", maxParticles: 200
                },
                {
                    name: "dust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 22], size: [0.3, 0.5],
                    color: 0xC0A070, alpha: [0.22, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 46
                },
                {
                    name: "scorch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [10, 20], size: [0.2, 0.04],
                    color: 0xFF8A3C, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        dissipate: {
            duration: 24,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "dying_dust", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 26], size: [0.36, 0.6],
                    color: 0x8A7A62, alpha: [0.25, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_heatwave", 1, HeatwaveDefinition);
