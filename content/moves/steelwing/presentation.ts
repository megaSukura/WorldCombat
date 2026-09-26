/**
 * 钢翼 / steelwing 的客户端表现。
 *
 * 一句话：双翼先收到身前、翼缘亮起钢光，随后从正前方展开到两侧；两条硬亮翼缘贴着当刻真实判定线扫过身侧，
 *   擦到实体或墙的那一侧溅出铁火星与钢羽，磨硬时施法者身上升起一圈钢白光环。
 * 色相家族：冷钢灰蓝（0xB8C4D6）与近白高光（0xEDF2FA）为主，中性尘（tinydust）只做余韵。
 * 拍子：起（windup 收翼聚光）→ 展（unfold 两翼展开）→ 掠（glide 滑行残影）→ 缘（wing 两条真实翼缘）
 *   → 击（hit 钢羽火星）→ 挡（wall 翼尖撞墙）→ 磨（harden 升环）→ 空（miss 散羽）。
 * 范围：`wing` 的折线顶点就是服务端当刻一次 `trace` 的肩点与真实首碰点，画到哪就判到哪；`body` 跟随施法者真实位置。
 * 运动：翼缘沿 `data.path` 铺设（`polyline` 在整条边上采样），墙/实体处收束；钢羽被气流带起后受重力下落。
 * 数：`data.feathers`（防御与速度派生）绑定钢羽与火星的数量，`data.scale`（翼缘长度派生）缩放尺寸，
 *   `data.intensity`（本次威力比例）缩放发射量，`data.stages`（实际升防级数）绑定升防光环的数量。
 */

const SteelwingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "winglight", bind: "source", offset: [0, 0.6, 0.2], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xEDF2FA, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "feathers_in", bind: "source", offset: [0, 0.5, 0.2], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0x8C94A3, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        unfold: {
            duration: 0,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "open_gust", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    rate: { data: "feathers", fallback: 14 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "away", speed: [0.06, 0.26], drag: 0.9,
                    lifetime: [6, 12], size: [0.34, 0.08], sizeMode: "sin",
                    color: 0xB8C4D6, alpha: [0.4, 0], light: "full", bloom: 0.2, maxParticles: 70
                },
                {
                    name: "feathers_out", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "feathers", fallback: 12 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.65 },
                    direction: "away", speed: [0.12, 0.38], gravity: 0.04, drag: 0.9,
                    lifetime: [9, 18], size: [0.1, 0.02],
                    color: 0xB8C4D6, alpha: [0.85, 0], light: "full", maxParticles: 100
                }
            ]
        },
        glide: {
            duration: 0,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "streak", bind: "source", offset: [0, 0.35, 0], height: 0.35, trail: { minDistance: 0.16 },
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    rate: 26, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.03, 0.14], drag: 0.9,
                    lifetime: [6, 12], size: [0.3, 0.06],
                    color: 0xB8C4D6, alpha: [0.5, 0], light: "full", maxParticles: 60
                },
                {
                    name: "gust", bind: "source", offset: [0, 0.2, 0], height: 0.2, trail: { minDistance: 0.22 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "sphere", radius: 0.25 },
                    direction: "away", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8C94A3, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        wing: {
            duration: 0,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: { data: "feathers", fallback: 12 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xEDF2FA, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "edge_steel", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    rate: { data: "feathers", fallback: 12 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.03, 0.14], drag: 0.9,
                    lifetime: [6, 12], size: [0.5, 0.12], sizeMode: "index",
                    color: 0xB8C4D6, alpha: [0.35, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "tip", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "feathers", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.25 },
                    direction: "outward", speed: [0.08, 0.28], spread: 20,
                    lifetime: [4, 9], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEDF2FA, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 50
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "steelburst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "feathers", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [6, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xEDF2FA, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "feathers", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.12, 0.38], gravity: 0.035, drag: 0.9,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0xB8C4D6, alpha: [0.9, 0], light: "full", maxParticles: 120
                }
            ]
        },
        wall: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "spark", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "feathers", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.32], spread: 24,
                    lifetime: [5, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xEDF2FA, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "feathers", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.88,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0x8C94A3, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        harden: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "brace_ring", bind: "source", offset: [0, 0.08, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "stages", fallback: 1 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 17], size: [0.3, 0.6],
                    color: 0xEDF2FA, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "brace_up", bind: "source", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "circle", radius: 0.6 },
                    direction: "up", speed: [0.08, 0.28], drag: 0.9,
                    lifetime: [8, 15], size: [0.13, 0.03],
                    color: 0xEDF2FA, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "feathers", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.88,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0x8C94A3, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_steelwing", 1, SteelwingDefinition);
