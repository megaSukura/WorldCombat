/**
 * 集沙 / Shore Up 的粒子语言。
 *
 * 一句话：脚边实际有沙的位置被一股吸力从四周拉起、旋着糊到身上，压实后从身上落下一点余尘；沙暴里整场都是流沙、还镀着亮沙。
 * 色相家族：沙金 0xD8B26A 作主体，浅砂 0xF0E0B0 作高光，土褐 0x8A6A3A 作余尘；沙暴时细节层用亮沙 0xF7E7A8。
 * 拍子：起（windup）／取（gather + 每个真实沙位的 gather_site）／糊（pack）／余（settle）。
 * 范围：作用于自己，绑 source（fit body）；取沙的外环半径绑定 data.reach（探沙范围），玩家看得出它能从多远的沙地取材。
 * 机制驱动：gather/pack 的沙粒数绑定 data.motes（沙粒密度 × 收走的浮沙量 × 沙暴算出）、pack 的数量已按**实际回复**
 *   缩放；每个 gather_site 落在服务端真实采样到的沙位（data 只带该点的粒数与尺寸）；沙暴中额外一层亮沙绑定 data.gild；
 *   整体尺寸绑定 data.scale、糊身尺寸绑定 data.packSize —— 沙越多、暴越烈、补得越足，画面越密越亮越大。
 */
const ShoreupDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "suck_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "motes", fallback: 14 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.6 }, direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.26, 0.08],
                    color: 0xD8B26A, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "lift", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "circle", radius: 0.5 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xF0E0B0, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        gather: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "inflow", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 2.2 } }, direction: "inward",
                    speed: [0.08, 0.22], drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0xD8B26A, alpha: [0.85, 0], light: "world", maxParticles: 80
                },
                {
                    name: "spiral", bind: "source", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 20 }, shape: { kind: "cylinder", radius: { data: "reach", fallback: 2.2 }, length: 0.8 },
                    direction: "inward", speed: [0.03, 0.1], spin: 4,
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xF0E0B0, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "ground_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2 }, shape: { kind: "circle", radius: { data: "reach", fallback: 2.2 } },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: { data: "scale", fallback: 0.3 },
                    color: 0x8A6A3A, alpha: [0.5, 0], light: "world", maxParticles: 12
                }
            ]
        },
        gather_site: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "pull", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 6 } }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.05, 0.16], drag: 0.9,
                    lifetime: [10, 18], size: { data: "siteSize", fallback: 0.06 },
                    color: 0xF0E0B0, alpha: [0.85, 0], light: "world", maxParticles: 24
                }
            ]
        },
        pack: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "source", offset: [0, 0.45, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [8, 16], size: { data: "packSize", fallback: 0.22 }, sizeMode: "index",
                    color: 0xD8B26A, alpha: [1, 0], light: "full", maxParticles: 60
                },
                {
                    name: "settle_dust", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.5 }, direction: "outward", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [14, 24], size: [0.2, 0.05],
                    color: 0x8A6A3A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "storm_gild", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "gild", fallback: 0 } }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xF7E7A8, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "falling", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.5 }, direction: "down", speed: [0.02, 0.06], gravity: 0.01,
                    lifetime: [10, 18], size: { data: "scale", fallback: 0.06 },
                    color: 0x8A6A3A, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shoreup", 1, ShoreupDefinition);
