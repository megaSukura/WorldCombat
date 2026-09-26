/**
 * 吼叫 / roar 的客户端表现。
 *
 * 一句话：施法者胸口鼓起一圈暖褐声光，随即仰头吼出——一圈声浪贴着地面从脚下铺开、边界一圈风线鼓起，
 *   被扫到的敌人头顶炸开一记惊愕的冲击、身上挂着逃散的风尘。
 * 色相家族：暖褐／琥珀（0xE0B24A 主体、0xB08A38 余韵）＋近白（0xF6E8C0）只做吼点高光；没有第二个色相。
 * 拍子：起（windup 攒声）→ 击（wave 声浪铺开，只播一次）→ 结果（rout 逐目标惊愕一击）→ 持续（flee 逃跑风尘）→ 空（miss 尘土）。
 * 范围：wave 的圆环半径就是判定用的声浪半径（`data.scale`＝实际半径 / 5，环定义在 5 格上），环摆在哪，哪就是会被吼到的边界；
 *   中间的尘土从圆心向外推，读得出「整块圆都扫过」。
 * 运动：声浪从脚下向外铺；被吼中者原地炸开一记冲击后挂着风尘向远处跑。
 * 数：声波道数由 `data.waves`（特攻派生）驱动；命中人数由 `data.hits`（机制结果）影响响度层的量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const RoarDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        resist:{duration:14,emitters:[{name:"unmoved",bind:"target",fit:"body",particle:"world_combat_core:cobblemon/generic/tinydust",burst:{count:6},shape:{kind:"sphere_surface",radius:.4},direction:"outward",speed:[.01,.03],lifetime:[4,10],size:[.05,.01],color:0xA89170,alpha:[.4,0]}]},
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.35, 0.25], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 20, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xE0B24A, alpha: [0.7, 0], light: "full", maxParticles: 52
                },
                {
                    name: "chest", bind: "source", offset: [0, 0.4, 0.2], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 3, interval: 5, repeats: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xF6E8C0, alpha: [0.8, 0], light: "full", maxParticles: 16
                }
            ]
        },
        wave: {
            duration: 28,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "edge", bind: "point", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "waves", fallback: 12 }, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 5 },
                    direction: "outward", speed: [0.06, 0.2], spread: 8,
                    lifetime: [10, 18], size: [0.32, 0.08],
                    color: 0xE0B24A, alpha: [0.7, 0], light: "full", maxParticles: 340
                },
                {
                    name: "ground", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 90, shape: { kind: "circle", radius: 4.4, thickness: 0 },
                    direction: "outward", speed: [0.35, 0.8], spread: 6, gravity: 0.01,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xB08A38, alpha: [0.55, 0], light: "world", maxParticles: 420
                },
                {
                    name: "shout", bind: "source", offset: [0, 0.3, 0.2], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 6 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF6E8C0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 20
                }
            ]
        },
        rout: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shock", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 26,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xE0B24A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "startle", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.04],
                    lifetime: [12, 18], size: [0.34, 0.12],
                    color: 0xF6E8C0, alpha: [0.9, 0], light: "full", maxParticles: 3
                }
            ]
        },
        flee: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "dust", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xB08A38, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 26
                },
                {
                    name: "lines", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 4, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.16, 0.02],
                    color: 0xF6E8C0, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "hush", bind: "point", fit: "none", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x9A8458, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_roar", 1, RoarDefinition);
