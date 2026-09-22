/**
 * 火之舞 / fierydance 的客户端表现。
 *
 * 一句话：火焰先裹住施法者全身，随后贴着身体向外跳开——第一拍在脚边铺开一圈火，第二拍振翅把外圈再卷出去一截；
 *   被点着处炸开火团，舞到兴头时施法者身上升起一圈更旺的火焰。
 * 色相家族：橙红（0xF08030 / 0xC03818）与近白高光（0xFFE8A0）为主，与火系同族一致；烟（smoke）只做余韵。
 * 拍子：起（gather 裹身火焰）→ 内（unfurl 第一拍铺内圈）→ 外（sweep 第二拍卷外圈）→ 击（hit 火团）→ 旺（surge 升环）→ 空（miss 收拢）。
 * 范围：`unfurl` 的环半径绑定 `data.inner`、`sweep` 的环半径绑定 `data.outer`，服务端传的是机制同一份半径，
 *   两圈画多大，站哪会被第一拍/第二拍卷到，画面就是那块地。
 * 运动：火焰从全身向外卷、贴地铺开，第二拍再向外一截；火团从命中点外爆并受重力下落，地面焦痕停留一拍。
 * 数：`data.spin`（特攻派生）绑定火焰团数量，`data.scale` 缩放尺寸，`data.intensity`（本次威力比例）缩放发射量，
 *   `data.stages`（涨特攻级数）绑定升火光环的数量。
 */

const FierydanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "cloak", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 26, shape: { kind: "sphere", radius: 0.55 },
                    direction: "away", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [7, 13], size: [0.36, 0.1],
                    color: 0xF08030, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "rise", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 20, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.06, 0.24], drag: 0.9,
                    lifetime: [6, 12], size: [0.28, 0.08], sizeMode: "sin",
                    color: 0xFFE8A0, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "embers", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "sphere", radius: 0.45 },
                    direction: "away", speed: [0.08, 0.3], drag: 0.9,
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 50
                }
            ]
        },
        unfurl: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "inner_fill", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "spin", fallback: 18 } },
                    shape: { kind: "circle", radius: { data: "inner", fallback: 1.6 } },
                    direction: "outward", speed: [0.06, 0.24], drag: 0.88,
                    lifetime: [7, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF08030, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 150
                },
                {
                    name: "inner_ring", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "stages", fallback: 1 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "inner", fallback: 1.6 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.3, 0.55],
                    color: 0xFFE8A0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "inner_scorch", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1 },
                    shape: { kind: "circle", radius: { data: "inner", fallback: 1.6 } },
                    direction: "up", speed: [0, 0.02],
                    lifetime: [14, 22], size: [1.0, 0.7],
                    color: 0xC03818, alpha: [0.4, 0], light: "world", maxParticles: 4
                }
            ]
        },
        sweep: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "outer_fill", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "spin", fallback: 18 } },
                    shape: { kind: "ring", radius: { data: "outer", fallback: 2.8 } },
                    direction: "outward", speed: [0.08, 0.3], drag: 0.88,
                    lifetime: [7, 15], size: [0.32, 0.07], sizeMode: "index",
                    color: 0xF08030, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 180
                },
                {
                    name: "outer_ring", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "stages", fallback: 1 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "outer", fallback: 2.8 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.36, 0.7],
                    color: 0xFFE8A0, alpha: [0.7, 0], light: "full", bloom: 0.45, maxParticles: 24
                },
                {
                    name: "outer_embers", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "spin", fallback: 18 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "away", speed: [0.14, 0.44], gravity: 0.03, drag: 0.9,
                    lifetime: [9, 17], size: [0.1, 0.02],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 140
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "spin", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.36], spread: 18,
                    lifetime: [7, 14], size: [0.36, 0.07], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 160
                },
                {
                    name: "flames", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "spin", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], drag: 0.88,
                    lifetime: [8, 16], size: [0.34, 0.1],
                    color: 0xF08030, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 150
                }
            ]
        },
        surge: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "surge_ring", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "stages", fallback: 1 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 17], size: [0.3, 0.6],
                    color: 0xFFE8A0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "surge_up", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "circle", radius: 0.6 },
                    direction: "up", speed: [0.1, 0.34], drag: 0.9,
                    lifetime: [8, 15], size: [0.3, 0.08],
                    color: 0xFFE8A0, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "die", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "spin", fallback: 9 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.88,
                    lifetime: [6, 12], size: [0.09, 0.01],
                    color: 0xC03818, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fierydance", 1, FierydanceDefinition);
