/**
 * 紧咬不放 / jawlock 的客户端表现。
 *
 * 一句话：施法者压低身、张开的颚间亮起一对獠牙 → 猛扑上去咬中，目标身上炸开一圈恶色咬痕与飞散的牙屑 →
 *   咬住期间两者之间绷着一条噬合的暗色链、目标身上持续有牙屑被啃下 → 直到被拉开或倒下，链断、双方各自震开。
 * 色相家族：暗紫（0x6E4A8C / 0x9A7BFF）作恶属性主体，象牙白（0xF2EAD8）只给獠牙与咬痕高光，烟黑收地面。
 * 拍子：起 gather（张颚）→ 击 lock（咬中并成锁）/ snap（咬中但目标免疫束缚，只留这一口）→ 持 hold（互锁的链）→ 收 release（松口）/ break（被拉开）/ free（施法者脱身）。
 * 范围：这招作用在两者之间，lock/free 绑各自的身体，hold 沿 `data.path` 的两个实体顶点画一条链——
 *   链绷在谁和谁之间，玩家一眼看出这两只被锁在一起；`data.grip` 决定 lock 那一圈咬痕半径。
 * 运动：咬痕与牙屑从咬点向外迸，链上的粒子贴着连线往复噬动，被拉开时链上粒子向两侧甩开。
 * 数：`data.maw`（物攻派生）决定咬痕与牙屑的数量，`data.beats`（对峙时长换算）决定咬住后一圈圈收束的次数，强度读 `data.intensity`（咬合威力）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const JawlockMoveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gape", bind: "source", offset: [0, 0.35, 0.3], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 2, interval: 3, repeats: 2 },
                    shape: { kind: "box", size: [0.34, 0.14, 0.14] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.14, 0.03],
                    color: 0xF2EAD8, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: { data: "maw", fallback: 18 }
                },
                {
                    name: "threat", bind: "source", offset: [0, 0.3, 0.32], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [5, 11], size: [0.08, 0.02],
                    color: 0x6E4A8C, alpha: [0.7, 0], light: "full", maxParticles: 22
                }
            ]
        },
        lock: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "bite", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 26
                },
                {
                    name: "shatter", bind: "target", height: 0.48,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "maw", fallback: 12 }, at: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 18, gravity: 0.04, drag: 0.9,
                    lifetime: [8, 15], size: [0.13, 0.03],
                    color: 0xF2EAD8, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "clench", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0, interval: 6, repeats: { data: "beats", fallback: 1 } },
                    shape: { kind: "ring", radius: { data: "grip", fallback: 2.4 } },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0x9A7BFF, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        snap: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crunch", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [5, 10], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 22
                },
                {
                    name: "chips", bind: "target", height: 0.48,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "maw", fallback: 12 }, at: 1 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.22], spread: 16, gravity: 0.04, drag: 0.9,
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0xF2EAD8, alpha: [0.85, 0], light: "world", maxParticles: 50
                }
            ]
        },
        hold: {
            exit: { drain: 14 },
            emitters: [
                {
                    name: "chain", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: { data: "maw", fallback: 12 }, direction: "away", speed: [0.01, 0.05], spread: 12,
                    lifetime: [8, 14], size: [0.06, 0.02], sizeMode: "sin",
                    color: 0x9A7BFF, alpha: [0.5, 0], light: "world", maxParticles: 70
                },
                {
                    name: "gnaw", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    rate: { data: "maw", fallback: 12 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0x6E4A8C, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "strain", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 12, repeats: { data: "beats", fallback: 2 } },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [8, 14], size: [0.18, 0.06],
                    color: 0x9A7BFF, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "loose", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [12, 22], size: [0.18, 0.05],
                    color: 0x3A2A55, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "part", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xF2EAD8, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        break: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30,
                    lifetime: [5, 11], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "wash", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0x3A2A55, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        free: {
            duration: 18,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "release", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.04],
                    color: 0x3A2A55, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.35, 0.35], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.13, 0.03],
                    color: 0x6E4A8C, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_jawlock", 1, JawlockMoveDefinition);
