/**
 * Ｖ热焰 / vcreate 的客户端表现。
 *
 * 一句话：前额先炸开一团炽白的火、火舌向两侧张成一个 V，随后整个人拖着这道 V 形焰尾撞进目标怀里；命中时爆成
 *   一团火球，撞完身上的火焰萎落成两条残焰，V 一点点暗下去——那就是三段降级的样子。
 * 色相家族：炽白（0xFFF0C0）到橙红（0xFF7A2E），烟收在深褐（0x3A241C）；饱和集中在额焰、命中与残焰的小面积。
 * 拍子：起（kindle 额焰张成 V）→ 冲（hurl V 形焰尾）→ 击（impact 爆开）→ 萎（slump 残焰与落灰）／失（miss）。
 * 范围：`impact` 的爆开与 `ring` 用 `data.scale`（前额火焰判定 / 0.5）铺开，画出来的就是撞面宽度。
 * 运动：`hurl` 的 trail 沿施法者实际扑过的路线铺开，画面即那条冲刺线；命中时火与碎石向外抛。
 * 数：`impact`／`kindle` 的火舌量绑 `data.flames`（物攻换算出机制数），强度绑 `data.intensity`（实际威力派生）；
 *   `data.progress` 让冲程中的火焰随前进更盛，`data.nova` 区分尽燃／收焰。
 */
const VcreateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kindle: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "forehead_core", bind: "source", offset: [0, 0.85, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "flames", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.25 }, direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [6, 12], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "v_left", bind: "source", offset: [0, 0.85, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 12, shape: { kind: "line", length: 0.9, rotation: [0, 55, 0] }, direction: "shape",
                    speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.16, 0.03], color: 0xFF7A2E, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "v_right", bind: "source", offset: [0, 0.85, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 12, shape: { kind: "line", length: 0.9, rotation: [0, -55, 0] }, direction: "shape",
                    speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.16, 0.03], color: 0xFF7A2E, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "v_smoke", bind: "source", offset: [0, 0.9, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "sphere", radius: 0.22 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.18, 0.3], color: 0x3A241C, alpha: [0.22, 0], light: "world", maxParticles: 24
                }
            ]
        },
        hurl: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "head", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 30, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFF7A2E, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "core", bind: "source", offset: [0, 0.7, 0], height: 0.7,
                    trail: { minDistance: 0.25 },
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 18, shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 11], size: [0.16, 0.02], color: 0xFFF0C0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "ash", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    trail: { minDistance: 0.35 },
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.2, 0.32], color: 0x3A241C, alpha: [0.25, 0], light: "world", maxParticles: 50
                },
                {
                    name: "speed_lines", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 16, shape: { kind: "line", length: 0.9, rotation: [0, 0, 90] }, direction: "shape",
                    speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.32, 0.06], color: 0xFFE0A0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blast", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "flames", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.1, 0.34], spread: 22,
                    lifetime: [7, 13], size: [0.46, 0.06], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 120
                },
                {
                    name: "rocks", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.1, 0.32], gravity: 0.1, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFF8A3C, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 1.2 }, direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 16], size: [0.4, 0.9], color: 0xFF5A2E, alpha: [0.55, 0], light: "world", maxParticles: 4
                },
                {
                    name: "flash", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 1 },
                    shape: { kind: "point" }, direction: "up", speed: [0, 0],
                    lifetime: [8, 14], size: [0.6, 0.1], color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 6
                }
            ]
        },
        slump: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "v_left_dim", bind: "source", offset: [0, 0.85, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 6, shape: { kind: "line", length: 0.7, rotation: [0, 55, 0] }, direction: "shape",
                    speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.12, 0.02], color: 0x8A3A1E, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "v_right_dim", bind: "source", offset: [0, 0.85, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 6, shape: { kind: "line", length: 0.7, rotation: [0, -55, 0] }, direction: "shape",
                    speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.12, 0.02], color: 0x8A3A1E, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "gutter", bind: "source", offset: [0, 0.7, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.12, 0.02], color: 0xFF7A2E, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "falling_ash", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "sphere", radius: 0.35 }, direction: "down", speed: [0.02, 0.08], gravity: 0.08,
                    lifetime: [10, 18], size: [0.07, 0.02], color: 0x6A5548, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.12], gravity: 0.08,
                    lifetime: [10, 16], size: [0.06, 0.02], color: 0x9A8C6C, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vcreate", 1, VcreateDefinition);
