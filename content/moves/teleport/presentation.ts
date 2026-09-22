/**
 * 瞬间移动 / teleport 的客户端表现。
 *
 * 一句话：施法者脚边的空间先裂开一圈冷蓝漩涡 → 原地炸成一把蓝白光点、人消失 → 落点炸开一圈扩散的环与碎点、人出现。
 * 色相家族：空间蓝 0x8AB6FF 画主线，近白 0xE8F3FF 只给「进出」那两下，深蓝 0x2E3E6B 作余韵。
 * 起击收：起 fold 10t ／ 去 depart 22t ／ 来 arrive 24t（起落共用一次动作）。
 * 范围：本招是一条施法者→落点的线；depart 与 arrive 两处都画在地面/身体上，玩家一眼看出「从哪消失、在哪出现」。
 * 运动：depart 的碎点从身体向外炸开、原地收束；arrive 的环贴地外扩、碎点向外落下；两处都不移动身体本身。
 * 数：depart／arrive 的碎点数量直接读本招算出的 `motes`（速度＋特攻派生），arrive 的亮度读 `intensity`
 *   （被甩掉目标的敌人数派生），野生逃走的 `wild` 决定是否多一层白闪。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * fold   起始  psyring1       贴地旋转收拢 0.9-0.2 10-16 0.6→0 ≤40
 * fold   细节  glowingsparkle 向内收       0.07-0.01 8-14 0.7→0 ≤40
 * depart 强调  energyorb      球面向外     0.30-0.05 8-14 1→0   ≤54
 * depart 细节  glowingsparkle 向外散       0.08-0.02 8-14 0.8→0 ≤60
 * arrive 强调  mediumring     贴地外扩     1.6-0.4 18-26 0.7→0 ≤40
 * arrive 细节  energyorb      球向外       0.22-0.04 10-16 0.9→0 ≤48
 * arrive 余韵  tintdust       缓慢落下     0.10-0.03 14-24 0.5→0 ≤40
 */
const TeleportDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fold: {
            duration: 10,
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "vortex", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 6, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.16], spin: 12,
                    lifetime: [10, 16], size: [0.9, 0.2], sizeMode: "index",
                    color: 0x8AB6FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "suck", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 20, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xE8F3FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        depart: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "collapse", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.25 }, direction: "outward", speed: [0.05, 0.28], drag: 0.92,
                    lifetime: [8, 14], size: [0.30, 0.05], sizeMode: "index",
                    color: 0xE8F3FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 54
                },
                {
                    name: "sparks", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 40, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.02, 0.14],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8AB6FF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        arrive: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 }, shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.06, 0.1],
                    lifetime: [18, 26], size: [1.6, 0.4], sizeMode: "index",
                    color: 0x8AB6FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "open", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.22], drag: 0.9,
                    lifetime: [10, 16], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xE8F3FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "sphere", radius: 0.35 }, direction: "up", speed: [0.01, 0.06], drag: 0.9,
                    lifetime: [14, 24], size: [0.10, 0.03],
                    color: 0x2E3E6B, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_teleport", 1, TeleportDefinition);
