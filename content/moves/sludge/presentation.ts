/**
 * 污泥攻击 / sludge 的客户端表现。
 *
 * 一句话：施法者从脚边抓起一团湿泥、掌心泥点聚拢，低弧甩出去；泥团拖着泥点飞，落在谁身上就摊开、
 *   顺着往下淌，够脏时从泥缝里冒起一小撮毒紫泡。
 * 色相家族：污泥绿（goo/chemicalball / mudsplash / ooze）为主体，毒紫（poisonbubble）只在毒泡的小面积上。
 * 拍子：起（gather 泥点聚拢）→ 击（flight 拖尾、hit 摊开 / immune 免疫、splat 落地）→ 收（泥点落尽）。
 * 范围：hit / splat 的摊开半径按服务端传的 `data.scale`（泥团判定半径派生）画出。
 * 运动：泥团沿服务端算好的低弧飞（projectile 绑定的尾迹），落点由弧线自己读出。
 * 数：`data.drops`（特攻派生）决定溅开的泥点数，`data.intensity`（威力派生）决定命中的亮度与密度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SludgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "clump", bind: "source", offset: [0, 0.55, 0.35], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: { data: "drops", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "toward", speed: [0.01, 0.05], spread: 30,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0x6E8C3A, alpha: [0.7, 0], light: "world", maxParticles: 26
                },
                {
                    name: "ooze", bind: "source", offset: [0, 0.5, 0.32], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0x7FB84A, alpha: [0.6, 0], light: "world", maxParticles: 18
                }
            ]
        },
        flight: {
            duration: 60,
            exit: { stop: 50, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile", trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "drops", fallback: 12 },
                    direction: "down", speed: [0.01, 0.05], spread: 24,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x6E8C3A, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dots", bind: "projectile", trail: { minDistance: 0.35 },
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    rate: { data: "drops", fallback: 12 },
                    direction: "away", speed: [0.02, 0.08], spread: 26,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x5E7A30, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "smear", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: { data: "drops", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [10, 20], size: [0.18, 0.03],
                    color: 0x7FB84A, alpha: [0.85, 0], light: "world", maxParticles: 44
                },
                {
                    name: "impact", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "sparks", fallback: 8 }, at: 1 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 12
                },
                {
                    name: "toxwisp", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 10, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.09], spread: 16,
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x9B6BC8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        immune: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slide", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "away", speed: [0.03, 0.12],
                    gravity: 0.08, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x6E8C3A, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        splat: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "ground_splat", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "drops", fallback: 12 }, at: 1 },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.12], spread: 18,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x6E8C3A, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sludge", 1, SludgeDefinition);
