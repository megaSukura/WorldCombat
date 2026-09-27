/**
 * 烈焰溅射 / flameburst 的客户端表现。
 *
 * 一句话：掌心凝出一颗火球射出去，火球拖着焰尾沿浅弧飞行；命中点炸开一团火，同一刻用一条短闪线把火分到旁边每个
 * 被波及的对手身上，各自绽开一小簇火。
 * 色相家族：橙红（0xFF8A3C）与余烬黄（0xFFD06A），烟收在深褐（0x3A2A22）；饱和只出现在火球、爆点与火滴的小面积。
 * 拍子：起（gather 凝火）→ 飞（flight 焰尾）→ 击（burst 爆点接触火星）→ 界（boundary 只在主爆真正结算后勾出）
 *   → 溅（splash 短闪线 → drop 落点，同刻）／散（scatter 撞墙或非活体只散火）→ 收（fade 残烟）。
 * 范围：`boundary` 的 `impact_edge` 直接用 `data.radius`（机制 splashRadius）在冲击点勾出一圈短火点，半径就是机制里的
 *   溅射半径——玩家一眼看出站得离目标多近会被溅到；主爆被拒、无人分伤时服务端不发这一幕。撞到方块/非活体只播 `scatter`。
 * 运动：火球沿浅弧飞出并撒火星；`splash` 是同一刻沿 `data.path`（爆点→被溅到的对手）整段随机发射的一次短闪线，
 *   `drop` 在对手身上绽放，两者同刻出现，呈现一次分溅而非火滴飞行；`scatter` 在受击方块面上向外散火，画的就是撞墙那一下。
 * 数：`burst`／`scatter` 的粒子量绑 `data.drops`（特攻与等级换算出机制数），强度绑 `data.intensity`（主爆威力派生），
 *   飞行火星量绑 `data.embers`。
 */
const FlameburstDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "kindle", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    rate: 10, shape: { kind: "ring", radius: 0.3 }, direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.05], color: 0xFF8A3C, alpha: [0.9, 0], light: "full", maxParticles: 26
                },
                {
                    name: "flame", bind: "source", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 14, shape: { kind: "sphere", radius: 0.22 }, direction: "up", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.18, 0.03], color: 0xFFD06A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        flight: {
            emitters: [
                {
                    name: "head", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    trail: { minDistance: 0.26 }, rate: 22,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.32, 0.14],
                    color: 0xFF8A3C, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "embers", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    trail: { minDistance: 0.2 }, rate: { data: "embers", fallback: 16 },
                    direction: "velocity", speed: [0.0, 0.06], spread: 26,
                    gravity: 0.03, drag: 0.93,
                    lifetime: [6, 13], size: [0.1, 0.01],
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", maxParticles: 120
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "blast", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "drops", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [7, 13], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 110
                },
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.2, 0.34],
                    color: 0x3A2A22, alpha: [0.25, 0], light: "world", maxParticles: 20
                }
            ]
        },
        boundary: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact_edge", bind: "point", fit: "world", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2 } }, direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.18, 0.05], sizeMode: "index",
                    color: 0xFF8A3C, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        splash: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "flash_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "drops", fallback: 12 }, at: 0 }, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.08, 0.28], gravity: 0.04, drag: 0.95,
                    lifetime: [5, 10], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", maxParticles: 70
                }
            ]
        },
        drop: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "splash_small", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "ember_target", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFF8A3C, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "residue", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.02, 0.08], gravity: 0.05,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0x9A8258, alpha: [0.25, 0], light: "world", maxParticles: 24
                }
            ]
        },
        scatter: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "spray", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "drops", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.05, 0.2], spread: 22,
                    gravity: 0.08, drag: 0.94,
                    lifetime: [8, 14], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xFFD06A, alpha: [0.9, 0], light: "full", maxParticles: 48
                },
                {
                    name: "hiss", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.16, 0.26],
                    color: 0x3A2A22, alpha: [0.22, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flameburst", 1, FlameburstDefinition);
