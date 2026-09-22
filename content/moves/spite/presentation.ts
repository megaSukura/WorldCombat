/**
 * 怨恨 / spite 的客户端表现。
 *
 * 一句话：施法者头顶聚起一团暗紫怨念，脱手后自己扭着追向目标；咬中的一刻在目标身上炸出一圈碎念，
 * 抽走的 PP 越多，迸出的碎片越多、越亮。
 * 色相家族：暗紫与靛蓝为底（fire/wisp 的紫、smoke 的深灰紫），骨白只出现在“咬”的核心与碎片上。
 * 拍子：起（windup 0–12t 凝聚）→ 追（travel 尾迹）→ 咬（bite 0–34t，击 0–12t，收 12–34t）／空（fizzle 0–22t）。
 * 范围：travel 沿投射物画轨迹，咬中的一圈绑在目标身上——画出的就是怨念真正咬到了谁。
 * 运动：怨念拖一条深紫尾掠过去；命中时碎片从目标身上向外炸开又收回。
 * 数：服务端把 `shards`（随特攻派生）、`taken`（实际扣掉的 PP）与 `flow` 交给发射器；碎片数量与咬的亮度由机制值决定。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SpiteDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "grudge_kindle", bind: "source", offset: [0, 0.75, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "shards", fallback: 8 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0x6B4FB8, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "grudge_pull", bind: "source", offset: [0, 0.75, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xD9CFF2, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        travel: {
            duration: 90,
            exit: { stop: 90, drain: 14 },
            emitters: [
                {
                    name: "bolt_core", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "flow", fallback: 24 }, trail: { minDistance: 0.18 },
                    shape: { kind: "sphere", radius: 0.07 }, direction: "shape", speed: [0, 0.02],
                    lifetime: [8, 14], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0x8F6BE0, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "bolt_trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "flow", fallback: 16 }, trail: { minDistance: 0.26 },
                    direction: "shape", speed: [0, 0.03], drag: 0.9,
                    lifetime: [14, 24], size: [0.14, 0.04],
                    color: 0x2E2340, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        bite: {
            duration: 36,
            exit: { stop: 18, drain: 24 },
            emitters: [
                {
                    name: "bite_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "shards", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: { data: "intensity", fallback: 0.25 },
                    lifetime: [8, 14], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xC9B8F0, alpha: [1, 0], light: "full", bloom: 0.55
                },
                {
                    name: "pp_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: { data: "intensity", fallback: 0.25 },
                    lifetime: [12, 22], size: { data: "size", fallback: 0.12 },
                    color: 0xE6DEFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "bite_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "shards", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.06, 0.14],
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0x6B4FB8, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "snuff", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.18, 0.28],
                    color: 0x2E2340, alpha: [0.32, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spite", 1, SpiteDefinition);
