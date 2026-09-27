/**
 * 闪电强袭 / supercellslam 的客户端表现。
 *
 * 一句话：按住技能键短跳蓄电，身体上按真实计时亮起的电花越聚越密；一个落在当前可达准线上的小标识
 * 跟着瞄点走，松手后沿真实扫过的短子段压下去，撞上就炸开一团电击与电花，落空则是带电身体砸地四散。
 * 色相家族：电黄（0xFFE463）与近白（0xFFF6C8／0xFFFFFF）为主体，落尘用中性 tinydust 作底。
 * 拍子：windup（聚电）→ charge（离地蓄电，三档密度）→ mark（可达落点小标识）→ dive（真实子段尾迹）→ impact／crash。
 * 数：`data.motes`／`data.pips`（蓄电档位派生）决定 charge 电花密度，`data.count`（本档强袭威力派生）决定命中迸发量，
 *   `data.sparks` 决定放电电花数量、`data.dust` 决定扬尘密度、`data.intensity` 抬高亮度、`data.radius` 决定落点标识大小。
 * 无圈伤／旁弧／残留印记：落点只画一个会随瞄点移动的小标识，下坠只画真实子段。
 */
const SupercellslamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "precharge", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 6, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.08], spread: 8,
                    lifetime: [6, 10], size: [0.14, 0.03],
                    color: 0xFFE463, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "spark", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [5, 9], size: [0.08, 0.02],
                    color: 0xFFF6C8, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        charge: {
            duration: 40,
            exit: { stop: 40, drain: 10 },
            emitters: [
                {
                    name: "charge", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12], spread: 10,
                    lifetime: [5, 10], size: [0.16, 0.04],
                    color: 0xFFE463, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "core", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "pips", fallback: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.10],
                    lifetime: [6, 11], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        mark: {
            duration: 40,
            exit: { stop: 40, drain: 8 },
            emitters: [
                {
                    name: "beacon", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 8, shape: { kind: "ring", radius: { data: "radius", fallback: 0.7 }, thickness: 0.16 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [6, 10], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFE463, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "box", size: [{ data: "radius", fallback: 0.7 }, 0.1, { data: "radius", fallback: 0.7 }] },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC8B890, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        dive: {
            duration: 20,
            exit: { stop: 20, drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "path", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" },
                    rate: 40, speed: [0.02, 0.09], spread: 12,
                    lifetime: [4, 8], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFE463, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "body", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 16, shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.12, 0.03],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "count", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.09, 0.32], spread: 16,
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "sparks", bind: "point", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.26], spread: 20,
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xFFE463, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.18], spread: 12,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 17], size: [0.07, 0.01], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        crash: {
            duration: 28,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "dust", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2], spread: 14,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 17], size: [0.08, 0.01], sizeMode: "index",
                    color: 0xC8B890, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "short", bind: "point", height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.26], spread: 22,
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xFFE463, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_supercellslam", 1, SupercellslamDefinition);
