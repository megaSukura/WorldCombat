/**
 * 花瓣舞 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者屈膝起势、脚下先聚起粉色花点；随后一圈中空的花裙随身体旋舞移动，外沿扫人、裙内露出地面；
 *   被外沿扫到的人身上炸开一撮粉色花点，落脚处有花瓣扑簌簌地铺开；舞完头顶转起眩晕的气流。
 * 色相家族：粉色 0xE58FB0 与近白 0xFFF0F5 为主，叶片绿 0x7FB56A 只做外圈与余韵；花与叶是一组自然的双色。
 * 层次：聚拢起势（tempo）→ 中空花裙（dance）→ 一圈收束（bloom）→ 命中花点（lash）→ 落地花瓣（residue）→ 收束眩晕（spent）→ 持续眩晕（dizzy）。
 * 范围：dance 的 `skirt_outer`／`skirt_inner` 用 `ring` 在当刻身体位置画出外半径 `data.outer` 与内半径 `data.inner` 两道环，
 *   两环之间就是会被扫到的花裙、内环以内是安全中空；服务端按同一组内／外半径判定，画面与判定同源。
 * 运动：花裙随身体真实舞步一起移动；命中处向外炸开；落地花瓣向上翻起再落下。
 * 数：服务端把 `data.motes`（花瓣点数）、`data.intensity`（威力）与 `data.scale`（风暴半径）交给发射器，数量和强度按机制走。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PetalDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tempo: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.09, 0.01],
                    color: 0xFFF0F5, alpha: [0.8, 0], light: "full", maxParticles: 36
                },
                {
                    name: "leaf_swirl", bind: "source", offset: [0, 0.25, 0], height: 0.15, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "circle", radius: 1.2 }, spin: 16,
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x7FB56A, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        dance: {
            duration: 0,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "skirt_outer", bind: "point", offset: [0, 0.2, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "ring", radius: { data: "outer", fallback: 5.0 } },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9, spin: 20,
                    lifetime: [12, 22], size: [0.16, 0.02],
                    color: 0x7FB56A, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "skirt_inner", bind: "point", offset: [0, 0.2, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 8, shape: { kind: "ring", radius: { data: "inner", fallback: 2.25 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92, spin: 14,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x7FB56A, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "skirt_petals", bind: "point", offset: [0, 0.55, 0], height: 0.3, fit: "none", spin: 14,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "sphere_surface", radius: { data: "outer", fallback: 5.0 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xFFF0F5, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        bloom: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "storm_ring", bind: "point", offset: [0, 0.2, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "ring", radius: { data: "outer", fallback: 5.0 } },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9, spin: 20,
                    lifetime: [12, 22], size: [0.16, 0.02],
                    color: 0x7FB56A, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "bloom_ring", bind: "point", offset: [0, 0.24, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "outer", fallback: 5.0 } },
                    direction: "outward", speed: [0.08, 0.24], drag: 0.9,
                    lifetime: [12, 20], size: [1.4, 0.1], sizeMode: "sin",
                    color: 0xE58FB0, alpha: [0.5, 0], light: "world", maxParticles: 8
                },
                {
                    name: "petal_motes", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "body", spin: 14,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 24, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xFFF0F5, alpha: [0.7, 0], light: "full", maxParticles: 70
                }
            ]
        },
        lash: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "cut", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spin: 18,
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0x7FB56A, alpha: [0.75, 0], light: "world", maxParticles: 30
                },
                {
                    name: "cut_pink", bind: "target", height: 0.7, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xFFF0F5, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        residue: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "settle", bind: "source", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 14 }, shape: { kind: "circle", radius: 2.2 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [14, 24], size: [0.08, 0.01],
                    color: 0xFFF0F5, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "settle_leaf", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none", spin: 20,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 10 }, shape: { kind: "circle", radius: 2.0 },
                    direction: "up", speed: [0.02, 0.07], drag: 0.92,
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x7FB56A, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        },
        spent: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "dizzy", bind: "source", offset: [0, 1.1, 0], height: 0.2, fit: "body", spin: 12,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 10, repeats: 2, interval: 8 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 26], size: [0.22, 0.06],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "petal_fall", bind: "source", offset: [0, 0.9, 0], height: 0.4, fit: "body", spin: 8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [14, 24], size: [0.08, 0.01],
                    color: 0xFFF0F5, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        punish: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "backlash", bind: "source", offset: [0, 0.8, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.18], spin: 16,
                    lifetime: [8, 14], size: [0.16, 0.02],
                    color: 0x7FB56A, alpha: [0.8, 0], light: "world", maxParticles: 24
                }
            ]
        },
        dizzy: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "dizzy_loop", bind: "source", offset: [0, 1.1, 0], height: 0.15, fit: "body", spin: 9,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 4, shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.18, 0.05],
                    alpha: [0.4, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_petaldance", 1, PetalDanceDefinition);
