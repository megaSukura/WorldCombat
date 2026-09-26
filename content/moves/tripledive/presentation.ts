/**
 * 三连钻 / tripledive 的客户端表现。
 *
 * 一句话：屈膝收身时脚边水光打转，随后连跳三次——每一跳沿施术者真实起落的身体拖一条水线，下落扎到敌人身上时
 *   溅起一整片水花；被打湿的目标身上水光还没散，后两钻落上去时水花更大。
 * 色相家族：水青（waterjet / bubble / impact_water）与近白（水花尖），只在湿身那一层多一点点高饱和青。
 * 拍子：起 coil（收身）→ 升 rise（真实上升的身体水线）→ 落 fall（真实下落的身体水线）→ 击 splash（命中水花外爆）／空放 land。
 * 位置：rise／fall 的发射器绑 source，随施术者真实移动逐刻留下水线（trail），不画计划弧线；splash 绑 target、land 绑 point。
 * 数：`data.splashes`（物攻派生的水花点数）驱动 coil 与命中的粒子量；`data.rise`（本钻实际跳跃高度）驱动上升水滴速度；
 *   `data.soak`（目标已湿身时 1）额外冒一层大泡；`data.scale`（水花判定半径派生）缩放尺寸；`data.intensity`（本钻威力 / 15）放大整幕。
 */
const TriplediveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "swirl", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 18, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x8FD8F0, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 44
                },
                {
                    name: "drops", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "splashes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xA8E4F4, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        rise: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    trail: { minDistance: 0.12 },
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: { data: "splashes", fallback: 20 }, direction: "up",
                    speed: { data: "rise", fallback: 0.5 },
                    lifetime: [6, 10], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xA8E4F4, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 46
                },
                {
                    name: "beads", bind: "source", offset: [0, 0.05, 0], height: 0.05,
                    trail: { minDistance: 0.1 },
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fall: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "plunge", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    trail: { minDistance: 0.1 },
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    rate: 26, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05,
                    lifetime: [6, 11], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xBFEAF6, alpha: [0.75, 0], light: "world", maxParticles: 48
                },
                {
                    name: "streak", bind: "source", offset: [0, 0.25, 0], height: 0.25,
                    trail: { minDistance: 0.12 },
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 16, direction: "up", speed: [0.05, 0.16],
                    lifetime: [5, 9], size: [0.1, 0.02],
                    color: 0xA8E4F4, alpha: [0.7, 0], light: "full", maxParticles: 32
                }
            ]
        },
        splash: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 26
                },
                {
                    name: "spray", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "splashes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "up", speed: [0.08, 0.26], spread: 40, gravity: 0.16, drag: 0.98,
                    lifetime: [9, 17], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xA8E4F4, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "soak", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/largebubble",
                    burst: { count: { data: "soak", fallback: 0 }, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x6FD0EA, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        land: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "dot", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 10, at: 0 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.1,
                    lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x8FD8F0, alpha: [0.55, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tripledive", 1, TriplediveDefinition);
