/**
 * 火之舞 / fierydance 的客户端表现。
 *
 * 一句话：火焰先裹住施法者全身，随后两片相对的火焰翼尖从身周起转、绕身体扫过半圈，半径一路展到外圈；
 *   被翼尖扫到处炸开火团，舞到兴头时施法者身上升起一圈更旺的火焰。
 * 色相家族：橙红（0xF08030 / 0xC03818）与近白高光（0xFFE8A0）为主，与火系同族一致；烟（smoke）只做余韵。
 * 拍子：起（gather 裹身火焰）→ 舞（dance 两片火翼的当前真实路径）→ 击（hit 火团）→ 挡（wall 翼尖撞墙）
 *   → 旺（surge 升环）→ 空（miss 收焰）。
 * 范围：`dance` 的折线顶点就是服务端当刻两条翼缘 `trace` 的起止点，画到哪就判到哪；`data.radius` 是当刻实际半径。
 * 运动：火焰沿 `data.path` 铺设（`polyline` 在整条边上采样），身后留一条短尾说明上一刻路径；火团从命中点外爆下落。
 * 数：`data.spin`（特攻派生）绑定翼缘与火团的粒子数，`data.scale`（终止半径派生）缩放尺寸，
 *   `data.intensity`（本次威力比例）缩放发射量，`data.stages`（实际涨特攻级数）绑定升光环的数量。
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
        dance: {
            duration: 0,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wing_flame", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "spin", fallback: 16 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.05, 0.22], drag: 0.88,
                    lifetime: [5, 11], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF08030, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 150
                },
                {
                    name: "wing_core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "spin", fallback: 16 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.03, 0.14], drag: 0.9,
                    lifetime: [6, 12], size: [0.36, 0.1], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [0.55, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "wing_tip", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "spin", fallback: 12 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24], spin: 4,
                    lifetime: [4, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 80
                },
                {
                    name: "tail", bind: "source", offset: [0, 0.4, 0], height: 0.4, trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "spin", fallback: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xC03818, alpha: [0.6, 0], light: "world", maxParticles: 60
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
        wall: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "scorch", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "spin", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.26], spread: 20,
                    lifetime: [5, 11], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "spin", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.16, 0.26],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 20
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
