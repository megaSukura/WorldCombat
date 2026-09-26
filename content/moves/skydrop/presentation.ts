/**
 * 自由落体 / skydrop 的客户端表现。
 *
 * 一句话：施法者贴到对手身上一把抓住，脚下卷起一阵上升气流；两者一起被拎上天，被抓住的对手头顶罩着
 * 一圈紧绷的浮空环、脚下拖着往上抽的风丝；随后风丝一松，对手沿一条向下的速度线被摔到地面，落点炸开
 * 一圈飞行系冲击与尘土；施法者跟着落回。
 * 色相家族：风青与近白（gust / small_gust / speedlines / impact_flying）为主体，落尘用中性 tinydust。
 * 拍子：起（windup 收气）→ 抓（grab 上冲）→ 滞（hold 浮空环）→ 摔（fall 速度线、slam 落点）→ 收（land 落尘）。
 * 范围：hold 的浮空环按目标身体画；slam 的一圈按 `data.count`（本击威力派生）与 `data.intensity` 铺开。
 * 运动：grab／hold 是向上的气柱，fall 是向下的速度线，slam 是向外压平的冲击环。
 * 数：`data.count`（摔落威力派生）决定落点碎块量，`data.intensity` 抬高撞击亮度，`data.altitude` 决定滞空环的高度。
 */
const SkydropDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        release:{duration:12,emitters:[{name:"broken_grip",bind:"target",fit:"body",particle:"world_combat_core:cobblemon/generic/tinydust",burst:{count:6},shape:{kind:"sphere_surface",radius:.35},lifetime:[4,8],size:[.08,.01],color:0x9FC6E8,alpha:[.4,0]}]},
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "coil", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xBFD8EE, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "feet", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.06, 0.01],
                    color: 0x9FC6E8, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        grab: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 22, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.22], spread: 20,
                    lifetime: [8, 16], size: [0.22, 0.05],
                    color: 0xBFD8EE, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dash", bind: "source", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [6, 11], size: [0.18, 0.03],
                    color: 0xE8F4FF, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        hold: {
            duration: 60,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 10, shape: { kind: "ring", radius: 0.55 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.36, 0.14], sizeMode: "index",
                    color: 0x9FC6E8, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "lift", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "circle", radius: 0.45 },
                    direction: "up", speed: [0.06, 0.2], spread: 8,
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xDCEBFA, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        fall: {
            duration: 40,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "streak", bind: "target",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: { data: "rate", fallback: 60 }, shape: { kind: "sphere", radius: 0.4 },
                    trail: { minDistance: 0.4 }, direction: "up", speed: [0.04, 0.14],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xBFD8EE, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dust", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    gravity: 0.03, drag: 0.93,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9FC6E8, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "count", fallback: 48 }, at: 1, interval: 1, repeats: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.36], spread: 24,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF0F6FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "count", fallback: 48 }, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.28],
                    lifetime: [10, 16], size: [0.4, 0.12], sizeMode: "index",
                    color: 0xCFE4F6, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "debris", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 48 }, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xAFC4D6, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        land: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 15], size: [0.06, 0.01],
                    color: 0xAFC4D6, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skydrop", 1, SkydropDefinition);
