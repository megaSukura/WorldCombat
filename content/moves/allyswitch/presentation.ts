/**
 * 交换场地 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者与同伴脚下同时亮起念力，两人被一条青蓝的力线一拽而瞬间对调；两处原地各留下一小撮偏紫的错位残影，
 *   慢慢淡去。
 *
 * 色相家族：青蓝（0x7FD8FF）为主体，近白（0xDFF4FF）做高光；错位残影用第二个色相淡紫（0xC9A6FF），
 *   因为「被留在原地的那个我」本身是另一个意思。
 * 层次：折空（起手，环向里收）／力线＋对调（起击）／残影（收，留在两处原地）。
 * 起击收：fold（折空）→ swap（对调）→ ghost（残影慢慢散去）。
 * 范围：`swap` 的 `data.path` 是服务端给出的两处旧位置（不是实体引用，因此不会跟着移动），力线连出的两点就是被对调的两个人。
 * 运动：力线沿两点之间拉紧；对调瞬间两点各炸开一圈；残影原地不动、缓慢上浮淡出。
 * 数：残影光点绑 `data.motes`（速度与特攻派生），误导人数 `data.misled` 决定对调爆发的强度 `data.intensity`。
 * 持续状态：残影低密度、贴地，很快就散，不遮挡目标。
 */
const AllySwitchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fold: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "fold_ring", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 14, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.1], spin: 10,
                    lifetime: [8, 14], size: [0.22, 0.5], sizeMode: "index",
                    color: 0x7FD8FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "fold_mote", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 10, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xDFF4FF, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        swap: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "swap_thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" }, rate: 110, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0x7FD8FF, alpha: [0.9, 0], light: "full", maxParticles: 160
                },
                {
                    name: "swap_flash", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9, spin: 12,
                    lifetime: [10, 20], size: [0.2, 0.04],
                    color: 0xDFF4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "swap_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 2, interval: 3 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [10, 18], size: [0.4, 0.85], sizeMode: "index",
                    color: 0x7FD8FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                },
                {
                    name: "swap_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0x7FD8FF, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        ghost: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "ghost_orb", bind: "point", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.008, 0.03], spin: 6,
                    lifetime: [18, 30], size: [0.1, 0.02],
                    color: 0xC9A6FF, alpha: [0.35, 0], alphaMode: "sin", light: "full", maxParticles: 36
                },
                {
                    name: "ghost_dust", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.05, 0.01],
                    color: 0xC9A6FF, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_allyswitch", 1, AllySwitchDefinition);
