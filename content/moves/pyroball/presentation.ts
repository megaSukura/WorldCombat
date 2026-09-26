/**
 * 火焰球 / pyroball 的客户端表现。
 *
 * 一句话：脚边固定着一颗小石球，火苗先舔上石面，随后这颗「烧红的石」从脚下短滚到踢点、被一脚抽出去，
 * 拖着一道焰尾沿低弧飞出，命中炸开成一团火与碎石，地上留下一圈很快淡去的焦痕。
 * 色相家族：橙（0xFF8A3C）与余烬黄（0xFFD06A），石体收在暖褐（0x7A6553），烟收在深褐（0x3A2A22）。
 * 拍子：起 gather（脚边小石被点着）→ 滚 roll（短滚到踢点）→ 飞 flight（焰尾）→ 击 burst（炸开）→
 *   收 scorch（焦痕）与 burn（引燃目标）——小石→点燃→离脚抽飞三个时点从画面直接读出。
 * 范围：burst／scorch 的半径用 `data.heat`（机制焦痕半径）铺开，玩家一眼看出这一脚烧到多大一片。
 * 运动：火球本体是投射物绑定的实心方块外观，粒子只做焰尾；焦痕贴地留下并按时长淡去。
 * 数：burst 的火星数绑定 `data.sparks`（物攻与等级换算），强度绑定火球威力，火球周围粒子由 `data.scale`
 *    （判定半径 / 0.26）放大；焦痕的存活时长绑定 `data.scorch`（机制焦痕时长，已压短，不表示持续灼地）。
 */
const PyroballDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "stone", bind: "source", offset: [0, -0.45, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 7, shape: { kind: "sphere", radius: 0.13 },
                    direction: "inward", speed: [0.0, 0.03],
                    lifetime: [4, 8], size: [0.24, 0.2],
                    color: 0x7A6553, alpha: [0.9, 0.35], light: "world", maxParticles: 10
                },
                {
                    name: "kindle", bind: "source", offset: [0, -0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    rate: 10, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xFF8A3C, alpha: [0.9, 0], light: "full", maxParticles: 26
                },
                {
                    name: "flame", bind: "source", offset: [0, -0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 14, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.18, 0.03],
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        roll: {
            duration: 0,
            emitters: [
                {
                    name: "stone", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 26, shape: { kind: "sphere", radius: 0.13 },
                    direction: "up", speed: [0.0, 0.04],
                    lifetime: [4, 7], size: [0.26, 0.16],
                    color: 0x7A6553, alpha: [0.95, 0.3], light: "world", maxParticles: 14
                },
                {
                    name: "spark", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 9, shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [5, 9], size: [0.09, 0.01],
                    color: 0xFFD06A, alpha: [0.7, 0], light: "full", maxParticles: 22
                }
            ]
        },
        flight: {
            emitters: [
                {
                    name: "head", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    trail: { minDistance: 0.28 }, rate: 24,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.34, 0.16],
                    color: 0xFF8A3C, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "embers", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    trail: { minDistance: 0.22 }, rate: { data: "sparks", fallback: 24 },
                    direction: "velocity", speed: [0.0, 0.06], spread: 26,
                    gravity: 0.03, drag: 0.93,
                    lifetime: [6, 13], size: [0.1, 0.01],
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "smoke", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    trail: { minDistance: 0.5 }, rate: 8,
                    direction: "velocity", speed: [0.0, 0.02], spread: 18,
                    lifetime: [10, 18], size: [0.2, 0.35],
                    color: 0x3A2A22, alpha: [0.28, 0], light: "world", maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "blast", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.3], spread: 18,
                    lifetime: [7, 13], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "sparks", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.42], spread: 24,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFF8A3C, alpha: [0.95, 0], light: "world", maxParticles: 120
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "heat", fallback: 1.2 } },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 16], size: [0.36, 0.8],
                    color: 0xFF8A3C, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        scorch: {
            duration: 0,
            emitters: [
                {
                    name: "mark", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0, 0],
                    lifetime: { data: "scorch", fallback: 80 }, size: { data: "heat", fallback: 1.2 },
                    color: 0x4A2E22, alpha: [0.85, 0], light: "world", maxParticles: 2
                },
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 4, shape: { kind: "circle", radius: { data: "heat", fallback: 1.2 } },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 24], size: [0.12, 0.02],
                    color: 0xFFD06A, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        burn: {
            duration: 0,
            emitters: [
                {
                    name: "clinging", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 5, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xFF8A3C, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pyroball", 1, PyroballDefinition);
