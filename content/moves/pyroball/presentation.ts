/**
 * 火焰球 / pyroball 的客户端表现。
 *
 * 一句话：脚边的小石被点着，火苗从脚面升起，随后一颗拖着焰尾的火球被踢出、沿低弧飞出，命中炸开
 * 成一团火与碎石，地上烧出一圈慢慢淡去的焦土。
 * 色相家族：橙（0xFF8A3C）与余烬黄（0xFFD06A），烟收在深褐（0x3A2A22）；饱和只出现在火球与命中的小面积。
 * 拍子：起 gather（点火）→ 飞 flight（焰尾）→ 击 burst（炸开）→ 收 scorch（焦土）与 burn（引燃目标）。
 * 范围：burst／scorch 的半径用 `data.heat`（机制焦土半径）铺开，玩家一眼看出这一脚烧到多大一片。
 * 运动：火球沿低弧飞行（服务端速度与下坠），火星向外抛、焦土贴地留下。
 * 数：burst 的火星数绑定 `data.sparks`（物攻与等级换算），强度绑定火球威力，火球大小由 `data.scale`
 *    （判定半径 / 0.26）放大；焦土的存活时长绑定 `data.scorch`（机制焦土时长）。
 */
const PyroballDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "kindle", bind: "source", offset: [0, 0.12, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xFF8A3C, alpha: [0.9, 0], light: "full", maxParticles: 26
                },
                {
                    name: "flame", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 14, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.18, 0.03],
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
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
