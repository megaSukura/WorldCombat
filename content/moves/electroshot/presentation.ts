/**
 * 电光束 / electroshot 的客户端表现。
 *
 * 一句话：电沿着地面和身体四周爬升、在身前卷成一道矛尖，随后一束高压电矛按真实投射物飞出去、真命中处炸开电花并落下闪光；
 *         被挡下只留一记散电，打空沿末方向散掉。
 * 色相家族：电黄（0xFFE84D / 0xFFF6C8）＋近白蓝的芯（0xEAF6FF）；中性尘只作衬托。
 * 拍子：起 gather（爬电成矛）→ shot（矛尖迸发）→ travel（电矛飞行）→ burst（真命中）／resist（被免疫）／ward（护住同伴）／fizzle（撞墙或打空）。
 * 范围：单发点射，由 travel 的真实投射物轨迹读出；没有地面范围。
 * 运动：travel 绑在服务端电矛的原生实体上（选中实体时朝它修正）；gather 的电弧由外向内、向上收束；burst 向外炸开。
 * 数：`data.arcs`（特攻与雨量换算）决定电弧与电花的密度，`data.intensity`（威力/130）决定亮度，
 *     `data.scale`（威力/130 的尺度）决定整体大小。
 */
const ElectroShotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 24 },
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "gather_arcs", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "arcs", fallback: 12 }, shape: { kind: "cylinder", radius: 0.55, length: 1.4 },
                    direction: "up", speed: [0.03, 0.12], spin: 16,
                    lifetime: [5, 11], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFE84D, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "gather_ground", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 18, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xEAF6FF, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.05, 0.02],
                    color: 0xB8C0C8, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        shot: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "shot_muzzle", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.26], spread: 20,
                    lifetime: [5, 11], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "shot_ring", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [7, 13], size: [0.26, 0.6],
                    color: 0xFFE84D, alpha: [0.7, 0], light: "full", maxParticles: 8
                }
            ]
        },
        travel: {
            duration: 90,
            exit: { stop: 70, drain: 14 },
            emitters: [
                {
                    name: "travel_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 40, shape: { kind: "sphere", radius: 0.14 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [4, 9], size: [0.26, 0.06],
                    color: 0xFFF6C8, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "travel_arcs", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    trail: { minDistance: 0.3 }, rate: { data: "arcs", fallback: 16 },
                    direction: "away", speed: [0.01, 0.05], spread: 26,
                    lifetime: [5, 11], size: [0.09, 0.02],
                    color: 0xEAF6FF, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst_flash", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 16 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.34 } },
                    direction: "outward", speed: [0.08, 0.28], spread: 24,
                    lifetime: [5, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "burst_sparks", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    burst: { count: 4 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.36 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 13], size: [0.4, 0.12], sizeMode: "index",
                    color: 0xFFE84D, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "burst_arcs", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "arcs", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xFFE84D, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        resist: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "resist_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 6 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.3 } },
                    direction: "outward", speed: [0.04, 0.16], spread: 30,
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xEAF6FF, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        ward: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "ward_scatter", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 6 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.3 } },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xFFE84D, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle_arcs", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFE84D, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_electroshot", 1, ElectroShotDefinition);
