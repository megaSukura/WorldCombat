/**
 * 热沙大地 / scorchingsands 的客户端表现。
 *
 * 一句话：施法者脚边的沙粒先被热力吸起、地表微微发亮，随后一把滚烫的沙沿弧线撒向落点，
 *   落地整片炸开成飞散的沙砾与溅起的火星，地表被铺上一层还在冒火星的热沙；闷烧式下沙面持续泛着暗红。
 * 色相家族：沙金（0xD9A85C）与灼红的砂芯（0xC25A2A）为主体，热芯的白（0xFFE0A8）与尘灰（0x8A7150）衬托。
 * 拍子：起 gather（吸沙）→ 扬 fling（沙幕抛物线）→ 落 burst（铺开）→ 击 hit（烫到人）→ 烫 smolder（余温闷烧）。
 * 范围：burst / smolder 的地面盘按服务端传的 `data.radius`（真实落点半径）画出，圈就是会被烫到的地。
 * 运动：沙幕沿机制给的抛物线飞向落点（projectile 绑定），落地向外炸开、随后贴地上升。
 * 数：burst / smolder 的沙量与火星绑定 `data.embers`（特攻与体型换算）与 `data.cells`（实际铺沙格数），
 *   hit 的火量绑定 `data.count`（威力派生），强度绑定 `data.intensity`（威力派生）。
 */
const ScorchingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "grains", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.14], spread: 14,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xD9A85C, alpha: [0.9, 0], light: "world", maxParticles: 36
                },
                {
                    name: "glow", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xC25A2A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        fling: {
            duration: 0,
            emitters: [
                {
                    name: "mass", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    trail: { minDistance: 0.2 }, rate: 30,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [5, 9], size: [0.3, 0.12],
                    color: 0xD9A85C, alpha: [0.95, 0], light: "world", maxParticles: 40
                },
                {
                    name: "sparks", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    trail: { minDistance: 0.16 }, rate: 22,
                    direction: "velocity", speed: [0.0, 0.04], spread: 18,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xC25A2A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "dust", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.12 }, rate: 18,
                    direction: "velocity", speed: [0.0, 0.05], spread: 24,
                    drag: 0.92,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x8A7150, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "blast", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "embers", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.4], spread: 26,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD9A85C, alpha: [0.95, 0], light: "world", maxParticles: 70
                },
                {
                    name: "grit", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "embers", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.5], spread: 30,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01], sizeMode: "index",
                    color: 0xC25A2A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 110
                },
                {
                    name: "heat", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "embers", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [6, 12], size: [0.24, 0.04],
                    color: 0xFFE0A8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "embers", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [12, 24], size: [0.34, 0.56],
                    color: 0x8A7150, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFE0A8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "grit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xD9A85C, alpha: [0.9, 0], light: "world", maxParticles: 60
                }
            ]
        },
        smolder: {
            duration: 0,
            emitters: [
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 16 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.01, 0.06], gravity: 0.02,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xC25A2A, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "heat_floor", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 8, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.0, 0.04], drag: 0.92,
                    lifetime: [12, 22], size: [0.2, 0.34],
                    color: 0xB4542A, alpha: [0.2, 0], light: "world", maxParticles: 50
                },
                {
                    name: "sand_floor", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.0, 0.05], drag: 0.95,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xD9A85C, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_scorchingsands", 1, ScorchingDefinition);
