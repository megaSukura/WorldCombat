/**
 * 三连钻 / tripledive 的客户端表现。
 *
 * 一句话：屈膝收身时脚边水光打转，随后连跳三次、每次沿目标方向扎下去，落点溅起一整片水花；水花贴在目标身上
 *   还没散，第二、三钻落上去时水光更亮、水花更大。
 * 色相家族：水青（waterjet / bubble / impact_water）与近白（水花尖），只在湿身那一层多一点点高饱和青。
 * 拍子：起 coil（收身）→ 跳 leap（起跳）→ 钻 dive（下扎）→ 击 splash（水花外爆）／ 空 miss。
 * 范围：dive 的水线沿 `data.direction` 指向钻击方向；splash 的水花落在命中点、范围随 `data.scale`。
 * 运动：起跳时水珠向上飞；下扎时水线沿方向前射、贴地的水环荡开；命中时水花从目标身上向上爆开并回落。
 * 数：`data.splashes`（物攻派生的水花点数）驱动每一钻与命中的粒子量；`data.soak`（目标已湿身时 1）让命中的
 *   水光更亮更大；`data.index`／`data.dives` 让第几钻的进度从画面读出；`data.intensity`（本钻威力 / 15）放大整幕。
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
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xA8E4F4, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        leap: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "up", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "rise", fallback: 8 }, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.1, 0.3],
                    lifetime: [8, 14], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xA8E4F4, alpha: [0.75, 0], light: "full", maxParticles: 26
                }
            ]
        },
        dive: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "jet", bind: "source", offset: [0, 0.4, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    orient: "direction", shape: { kind: "cone_volume", radius: 0.26, angleDegrees: 18, length: 1.6 },
                    rate: { data: "splashes", fallback: 20 }, direction: "shape", speed: [0.08, 0.3], spread: 10,
                    lifetime: [5, 9], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xA8E4F4, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "wake", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    burst: { count: 10, at: 0 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05,
                    lifetime: [7, 13], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xA8E4F4, alpha: [0.6, 0], light: "world", maxParticles: 30
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
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.12,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x8FD8F0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tripledive", 1, TriplediveDefinition);
