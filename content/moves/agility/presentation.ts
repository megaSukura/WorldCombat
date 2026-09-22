/**
 * 高速移动 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把周身的空气先吸进脚下一圈，随后那圈风向外炸开、速度线沿身体冲起；
 *   轻身窗口内，身后一直拖着一串短短的残影。
 *
 * 色相家族：青蓝（0x8FE3F5）为主体，近白（0xEAFBFF）做速度线与高光，浅青（0x9FE8FA）作余韵。没有第二个色相。
 * 层次：内吸风点与碎光（起）／向外的地环、速度线与一下白闪（击）／残影与上升光点（收）。
 * 起击收：gather（聚风）→ burst（炸开）→ wake（拖着残影）。
 * 范围：地环绑脚点、fit none，半径按 `data.scale`（实际风爆半径 / 0.9）推出，画出来的圈就是风真正扫到的范围。
 * 运动：聚风期向内收；爆发期由体内向外炸、速度线沿自身运动甩出；余韵期沿移动轨迹留下残影。
 * 数：地环与速度线的数量绑 `data.motes`（速度派生），`data.scale` 同时放大整片半径与粒子尺寸。
 */
const AgilityDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "wind_in", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 12, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.08], spin: 60,
                    lifetime: [6, 11], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x8FE3F5, alpha: [0.55, 0], light: "full", maxParticles: 30
                },
                {
                    name: "spark_in", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 10, shape: { kind: "circle", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [5, 10], size: [0.06, 0.015],
                    color: 0xDFF9FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "gust_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: { data: "motes", fallback: 24 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.18], spin: 40,
                    lifetime: [10, 18], size: [0.36, 0.7], sizeMode: "index",
                    color: 0x8FE3F5, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "speed_lines", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: { data: "motes", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "velocity", speed: [0.15, 0.5],
                    lifetime: [7, 13], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "white_flash", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" },
                    lifetime: [3, 5], size: [0.5, 0.12],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 2
                },
                {
                    name: "ground_spark", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 24 } },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.05, 0.01],
                    color: 0xCFF4FF, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        wake: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "afterimage", bind: "source", height: 0.4, trail: { minDistance: 0.6 },
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 6, shape: { kind: "point" },
                    lifetime: [8, 14], size: [0.3, 0.05],
                    color: 0xBFEFFF, alpha: [0.35, 0], light: "full", maxParticles: 40
                },
                {
                    name: "wake_orbs", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0x9FE8FA, alpha: [0.3, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_agility", 1, AgilityDefinition);
