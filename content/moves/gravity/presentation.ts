/**
 * 重力 / gravity 的客户端表现。
 *
 * 一句话：施法者把脚下的尘土先吸起再狠狠压下去 → 落点塌出一口重力井，石屑与尘被持续拽向地面 →
 * 井里的活体被拽落、浮空身份被扯掉。
 * 色相家族：灰紫 0x9B8FC2 作井的主体、尘褐 0xB8AFA0 作被拽落的尘土、近白只在扯掉浮空时出现。
 * 起击收：起 windup 22t ／击 fall 46t ／持 field 每 5 刻续期 ／击 pin 20t ／击 stripped 24t。
 * 持续状态：field 是贴地转动的边圈加向下落的尘，低密度、贴脚边，不遮视线；边圈画出「站哪里会被压住」。
 * 机制驱动：井半径决定边圈与尘柱的实际大小（data.scale = 半径/3.4），向下落的尘量直接读 fieldDensity，
 * 落点冲击强度读 shock。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 吸尘 tinydust      球面向内聚拢   0.02-0.06 12-20 0.7→0 ≤140
 * windup 压环 mediumring    环面向下压     0.3-0.5   14-22 0.6→0 ≤40
 * fall   冲击 impact_ground 环面向外       0.4-0.7   14-24 0.7→0 ≤60
 * fall   尘柱 tinydust      柱面内下落     0.02-0.08 12-22 0.6→0 ≤160
 * fall   地环 groundquake   贴地外扩       0.5-0.9   16-26 0.5→0 ≤40
 * field  边圈 warblingring  环上脉冲       0.5-0.9   20-34 0.3→0 ≤40
 * field  落尘 tinydust      圆面内下落     0.02-0.07 16-28 0.4→0 ≤200
 * field  石屑 earth         圆面内下落     0.03-0.09 20-32 0.28→0 ≤120
 * pin    落地 impact_ground 球面向下       0.05-0.22 10-20 1→0 ≤36
 * stripped 剥离 smallsparkle 球面向外      0.02-0.08 10-18 0.9→0 ≤30
 * stripped 崩断 impact_normal 环面向外     0.05-0.2  8-16 0.9→0 ≤30
 */
const GravityDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                { name: "suck", bind: "source", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 90, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 1.4 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x9B8FC2, alpha: [0.7, 0], light: "world", maxParticles: 140 },
                { name: "press", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 18, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "down", speed: [0.08, 0.2],
                    lifetime: [14, 22], size: [0.3, 0.5], sizeMode: "sin",
                    color: 0x8A7FB0, alpha: [0.6, 0], light: "world", maxParticles: 40 }
            ]
        },
        fall: {
            duration: 46,
            exit: { stop: 24, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 24, at: 1 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.18, 0.3],
                    lifetime: [16, 26], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x9B8FC2, alpha: [0.5, 0], light: "world", maxParticles: 40 },
                { name: "impact", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 32, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.2, 0.4],
                    lifetime: [14, 24], size: [0.4, 0.7],
                    color: 0x9A8C7A, alpha: [0.7, 0], light: "world", bloom: 0.15, maxParticles: 60 },
                { name: "drop", bind: "point", offset: [0, 1.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shock", fallback: 8 }, interval: 2, repeats: 5 }, shape: { kind: "cylinder", radius: 2.6, length: 3 },
                    direction: "down", speed: [0.15, 0.35],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xB8AFA0, alpha: [0.6, 0], light: "world", maxParticles: 160 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 7, shape: { kind: "ring", radius: 2.9 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 34], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x9B8FC2, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 40 },
                { name: "falling", bind: "point", offset: [0, 1.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "density", fallback: 22 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "down", speed: [0.04, 0.14],
                    lifetime: [16, 28], size: [0.07, 0.02],
                    color: 0xB8AFA0, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 200 },
                { name: "grit", bind: "point", offset: [0, 0.9, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "circle", radius: 2.5 },
                    direction: "down", speed: [0.02, 0.07],
                    lifetime: [20, 32], size: [0.09, 0.03],
                    color: 0x8A7F6C, alpha: [0.28, 0], light: "world", maxParticles: 120 }
            ]
        },
        pin: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "land", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "shock", fallback: 8 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "down", speed: [0.06, 0.2],
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0xB8AFA0, alpha: [1, 0], light: "world", maxParticles: 36 }
            ]
        },
        stripped: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                { name: "tear", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xD8D2F0, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 30 },
                { name: "snap", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 16], size: [0.2, 0.05],
                    color: 0xC9C2E8, alpha: [0.9, 0], light: "full", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gravity", 1, GravityDefinition);
