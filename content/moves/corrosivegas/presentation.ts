/**
 * 腐蚀气体 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者体表鼓起酸气、向上翻泡，随后一圈强酸毒雾从脚下向外炸开、三百六十度罩住周围；
 *   雾里每件携带物被酸液舔过、化成酸花消失；没有携带物的活体只被裹上一层酸沫；散后在原地留一段贴地残雾。
 *
 * 色相家族：酸绿（0x8FD24A）画毒雾与酸花，亮黄绿（0xDFFF9B）做气泡与高光，暗绿（0x39511F）做酸液阴影，
 *   残雾用低饱和灰绿（0x6E8A55），让持续层退到视线之外。
 * 层次：起（windup 鼓泡）／炸（burst 整圈铺开）／溶（melt 道具化酸花）／空（fizz 无物可溶）／残（linger 贴地低密度）。
 * 起击收：windup 16t → burst 30t → melt／fizz 28t → linger 由服务端时长决定。
 * 范围：burst／linger 的环按 data.scale（真实雾半径／定义半径 3.2）铺开，画出的就是判定罩住的那圈。
 * 运动：酸泡由下往上翻；burst 的雾由中心向外铺满整圈；melt 的酸花在道具位置短促外爆再下沉；linger 贴地缓慢飘。
 * 数：撑雾的雾团数绑 data.cloudlets（体重派生），酸泡数绑 data.bubbles（等级派生），每件道具的溶蚀粒子绑 data.motes（特攻派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const CorrosiveGasDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "windup_bubbles", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "bubbles", fallback: 10 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.1], spin: 20,
                    lifetime: [8, 14], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x8FD24A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "windup_ooze", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 }, direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.16, 0.05],
                    color: 0x39511F, alpha: [0.7, 0.2], light: "world", maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "burst_ring", bind: "point", height: 0.05, offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "cloudlets", fallback: 16 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [12, 20], size: [0.3, 0.12], sizeMode: "index",
                    color: 0xDFFF9B, alpha: [0.6, 0], light: "full", bloom: 0.15, maxParticles: 60
                },
                {
                    name: "burst_splash", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: { data: "cloudlets", fallback: 16 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 30, gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0x8FD24A, alpha: [0.95, 0], light: "full", maxParticles: 160
                },
                {
                    name: "burst_bubbles", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "bubbles", fallback: 10 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } }, direction: "up", speed: [0.02, 0.1], spin: 24,
                    lifetime: [12, 20], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0xDFFF9B, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "burst_mist", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "cloudlets", fallback: 16 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } }, direction: "outward", speed: [0.03, 0.12], spread: 30,
                    gravity: 0.005, drag: 0.9,
                    lifetime: [16, 28], size: [0.28, 0.06],
                    color: 0x6E8A55, alpha: [0.35, 0], light: "world", render: "translucent", maxParticles: 120
                }
            ]
        },
        melt: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "melt_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28, gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.17, 0.03], sizeMode: "index",
                    color: 0x8FD24A, alpha: [0.95, 0], light: "full", bloom: 0.15, maxParticles: 140
                },
                {
                    name: "melt_drip", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "down", speed: [0.02, 0.12], gravity: 0.05, drag: 0.88,
                    lifetime: [10, 20], size: [0.2, 0.05],
                    color: 0x39511F, alpha: [0.8, 0.1], light: "world", maxParticles: 90
                },
                {
                    name: "melt_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 8 } }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.02,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xDFFF9B, alpha: [0.85, 0], light: "full", maxParticles: 90
                }
            ]
        },
        fizz: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizz_puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x6E8A55, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_mist", bind: "point", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "cloudlets", fallback: 16 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } }, direction: "up", speed: [0.01, 0.05], spread: 12,
                    gravity: -0.002, drag: 0.94,
                    lifetime: [20, 34], size: [0.28, 0.06],
                    color: 0x6E8A55, alpha: [0.22, 0], light: "world", render: "translucent", maxParticles: 90
                },
                {
                    name: "linger_bubbles", bind: "point", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "bubbles", fallback: 10 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } }, direction: "up", speed: [0.01, 0.06], spin: 16,
                    lifetime: [16, 28], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8FD24A, alpha: [0.3, 0], light: "full", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_corrosivegas", 1, CorrosiveGasDefinition);
