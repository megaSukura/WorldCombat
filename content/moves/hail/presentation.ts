/**
 * 冰雹 / hail 的客户端表现。
 *
 * 一句话：施法者头顶先凝起一层白霜 → 冰柱从高空崩落、硬雹砸在落点炸开 → 一整个雹区里冰雹成片往下砸，
 * 非冰之躯露天时身上炸开碎冰，冰之躯只被冷气裹上一层白霜，头顶有顶棚的人只在屋顶上碎冰、身体没有火花，
 * 地面只炸开一圈短存碎冰。
 * 色相家族：冰蓝 0xBFE9FF／0x8FD0EC 与近白 0xF2FAFF／0xEAF6FF；一个冷色相，无强调色。
 * 起击收：起 windup 22t ／击 burst 48t ／持 field 绑在雹区效果上 ／击 pelt 20t ／击 cover 20t ／击 coat 22t ／击 shatter 30t。
 * 持续状态：field 是从高空落下的成片冰雹加一层贴地霜雾；雹粒带真实方块碰撞，砸到屋顶就当场消失，不再穿顶棚；
 * 地面一圈冰环画出「云罩住哪里」。
 * 机制驱动：雹区半径决定冰雹与冰环的大小（data.scale = 半径/9），冰雹数量直接读本招算出的 stoneDensity，
 * 每趟砸击的碎冰数量由这一趟实际伤害派生（data.stones）；屋顶/露天由服务端的原始碰撞射线分列，
 * 受击列从上方垂落（data.drop），被顶棚挡住的则在 data.cover 高度碎掉。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup  凝霜  icy_snow        球面向内       0.12-0.03 10-18 0.6→0  ≤80
 * burst   冰环  mediumring      贴地外扩       2.6-0.6 20-34 0.6→0   ≤40
 * burst   坠雹  iceshard        高空下砸＋碰撞 0.24-0.06 12-22 0.85→0 ≤360
 * burst   霜雾  powdered_snow   下坠＋外散     0.3-0.08 14-26 0.5→0   ≤320
 * field   坠雹  iceshard        高空下砸＋碰撞 0.24-0.06 12-22 0.8→0   ≤560
 * field   霜雾  powdered_snow   缓慢下坠       0.3-0.08 16-30 0.4→0   ≤380
 * field   霜环  largering       贴地脉冲       0.5-0.9 24-40 0.25→0   ≤40
 * pelt    坠雹  iceshard        受击列上方落下 0.26-0.08 8-12 0.85→0   ≤10
 * pelt    碎冰  impact_ice      向外炸开       0.3-0.05 8-16 0.9→0    ≤40
 * cover   檐雹  iceshard        顶上落下＋碰撞 0.22-0.06 6-10 0.8→0    ≤30
 * cover   檐碎  impact_ice      屋顶炸开       0.2-0.04 6-12 0.85→0    ≤30
 * coat    裹霜  icy_snow        球面外散       0.1-0.02 10-20 0.8→0   ≤50
 * shatter 碎冰  impact_ice      贴地炸散       0.22-0.04 8-16 0.8→0   ≤120
 * shatter 霜雾  powdered_snow   贴地外涌       0.24-0.06 12-22 0.35→0 ≤100
 */
const HailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "freeze", bind: "source", offset: [0, 2.0, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 30, shape: { kind: "sphere_surface", radius: 1.0 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 80 }
            ]
        },
        burst: {
            duration: 48,
            exit: { stop: 26, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 30, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.22, 0.36],
                    lifetime: [20, 34], size: [2.6, 0.6],
                    color: 0xBFE9FF, alpha: [0.6, 0], light: "world", maxParticles: 40 },
                { name: "fall", bind: "point", offset: [0, 7.0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "density", fallback: 30 }, interval: 2, repeats: 18 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: 5 },
                    direction: "down", speed: [0.6, 1.1], gravity: 0.03, spin: 50,
                    collision: { bounces: 1, disappearAt: 1 },
                    lifetime: [12, 22], size: [0.24, 0.06],
                    color: 0xBFE9FF, alpha: [0.85, 0], light: "world", maxParticles: 360 },
                { name: "frost", bind: "point", offset: [0, 3.0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 60, shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: 6 },
                    direction: "down", speed: [0.2, 0.5], gravity: 0.01, drag: 0.96,
                    lifetime: [14, 26], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.5, 0], light: "world", maxParticles: 320 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "fall", bind: "point", offset: [0, 6.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: 5 },
                    direction: "down", speed: [0.6, 1.1], gravity: 0.03, spin: 45,
                    collision: { bounces: 1, disappearAt: 1 },
                    lifetime: [12, 22], size: [0.24, 0.06],
                    color: 0xBFE9FF, alpha: [0.8, 0], light: "world", maxParticles: 560 },
                { name: "powder", bind: "point", offset: [0, 2.6, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 9 }, length: 4 },
                    direction: "down", speed: [0.1, 0.3], gravity: 0.006, drag: 0.97,
                    lifetime: [16, 30], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.4, 0], light: "world", maxParticles: 380 },
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 6, shape: { kind: "ring", radius: { data: "radius", fallback: 9 } },
                    direction: "up", speed: [0.004, 0.012],
                    lifetime: [24, 40], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x8FD0EC, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 40 }
            ]
        },
        pelt: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                { name: "dropfall", bind: "target", offset: [0, { data: "drop", fallback: 6 }, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 3, at: 1 }, shape: { kind: "point" },
                    direction: "down", speed: [0.7, 1.0], gravity: 0.03, spin: 60,
                    collision: { bounces: 1, disappearAt: 1 },
                    lifetime: [7, 10], size: [0.26, 0.08],
                    color: 0xBFE9FF, alpha: [0.85, 0], light: "world", maxParticles: 10 },
                { name: "smash", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "stones", fallback: 14 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.02, spin: 60,
                    lifetime: [8, 16], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40 },
                { name: "chips", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xF2FAFF, alpha: [0.7, 0], light: "full", maxParticles: 30 }
            ]
        },
        cover: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "rooffall", bind: "target", offset: [0, { data: "cover", fallback: 3 }, 2.0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 4, interval: 2, repeats: 5 }, shape: { kind: "point" },
                    direction: "down", speed: [0.4, 0.7], gravity: 0.02, spin: 60,
                    collision: { bounces: 1, disappearAt: 1 },
                    lifetime: [6, 10], size: [0.22, 0.06],
                    color: 0xBFE9FF, alpha: [0.8, 0], light: "world", maxParticles: 30 },
                { name: "roofbreak", bind: "target", offset: [0, { data: "cover", fallback: 3 }, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 8 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18], gravity: 0.02, spin: 50,
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.85, 0], light: "world", maxParticles: 30 }
            ]
        },
        coat: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "rind", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xEAF6FF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 50 }
            ]
        },
        shatter: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                { name: "ground", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "density", fallback: 24 }, interval: 2, repeats: 6 },
                    shape: { kind: "cylinder", radius: 9, length: 0.4 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.03, drag: 0.9, spin: 50,
                    collision: { bounces: 2 },
                    lifetime: [8, 16], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.8, 0], light: "world", maxParticles: 120 },
                { name: "melt", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 20, interval: 3, repeats: 5 },
                    shape: { kind: "circle", radius: 9 },
                    direction: "outward", speed: [0.03, 0.12], gravity: -0.001, drag: 0.97,
                    lifetime: [12, 22], size: [0.24, 0.06],
                    color: 0xF2FAFF, alpha: [0.35, 0], light: "world", maxParticles: 100 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hail", 1, HailDefinition);
