/**
 * 起死回生 / reversal 的客户端表现。
 *
 * 一句话：贴着伤口亮起的橙红光在脚下攒成一圈，随后人一低身扑到对手身下，落地时朝身前掀开一道格斗系扇面，
 * 把扇面内的敌人伤害并掀开，真被推动的目标才带出位移痕；后方没有圈光。
 * 色相家族：格斗橙红与近白（impact_fighting、groundquake、energyorb、glowingsparkle_yellow、lightbeam）为主，
 * 扬尘用暖土橙；没有冷色。
 * 拍子：起（brace 攒力）→ 行（press 扑身）→ 击（burst 身前扇面）→ 中（shove 推开的位移痕 / strike 免位移只吃伤害）→ 收（fade 空喷 / spent 反噬）。
 * 范围：burst 沿服务端传来的 `data.path`（与 WorldGeometry.sector 同一组顶点）填出真正会打到的扇面，`data.arc` 是同一张角，玩家一眼知道站哪边会被掀到。
 * 运动：光从脚下向上攒起、扑身贴地拉出尘线、落地是向前上方的扇面炸开与向外的顶。
 * 数：`data.embers`（旧伤换算）决定起手攒起的光点数量，`data.count`（实际掀到的敌人数）决定喷发的冲击数量，
 * `data.moved`（真实推开距离）决定位移痕长度，`data.sparks` 决定扇面碎光量，`data.wound` 抬高整体亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ReversalDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "wound_glow", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 22, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [7, 13], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xFF8A5A, alpha: [{ data: "wound", fallback: 0.4 }, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "ember_gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "embers", fallback: 12 }, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xFFD0A0, alpha: [{ data: "wound", fallback: 0.4 }, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "brace_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 5, shape: { kind: "ring", radius: 0.44 },
                    direction: "inward", speed: [0.0, 0.02],
                    lifetime: [8, 14], size: [0.3, 0.6], sizeMode: "sin",
                    color: 0xE8603C, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        },
        press: {
            duration: 34,
            exit: { stop: 26, drain: 12 },
            emitters: [
                {
                    name: "drag", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 26, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [7, 14], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xB06A44, alpha: [0.55, 0], light: "world", maxParticles: 140
                },
                {
                    name: "low_glow", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 22, shape: { kind: "box", size: [0.3, 0.4, 0.3] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xFFB07A, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 100
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "column", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    burst: { count: { data: "count", fallback: 1 }, at: 0 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.5, 1.4], sizeMode: "index",
                    color: 0xFFB07A, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 8
                },
                {
                    name: "blast", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 1 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFE0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "fan_fill", bind: "path", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    shape: { kind: "polygon" },
                    rate: 44, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.4, 0.9],
                    color: 0xE8603C, alpha: [0.5, 0], light: "world", maxParticles: 140
                },
                {
                    name: "fan_edge", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    shape: { kind: "polyline" },
                    rate: 34, direction: "shape", speed: [0.06, 0.2],
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xFFB07A, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "fan_sparks", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polygon" },
                    burst: { count: { data: "sparks", fallback: 20 }, at: 0 },
                    direction: "shape", speed: [0.05, 0.24],
                    lifetime: [7, 14], size: [0.1, 0.03],
                    color: 0xFFF0C8, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 90
                }
            ]
        },
        shove: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shove_drag", bind: "target", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 12 },
                    shape: { kind: "line", length: { data: "moved", fallback: 0.4 } },
                    orient: "direction", direction: "shape", speed: [0.06, 0.2],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xB06A44, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shove_glow", bind: "target", fit: "none", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10 },
                    shape: { kind: "line", length: { data: "moved", fallback: 0.4 } },
                    orient: "direction", direction: "shape", speed: [0.05, 0.18],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xFFB07A, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        strike: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "hit", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.1, 0.4],
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFE0C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hollow", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xB06A44, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        spent: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "backlash", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14],
                    drag: 0.93,
                    lifetime: [8, 15], size: [0.14, 0.03],
                    color: 0xA04A3A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_reversal", 1, ReversalDefinition);
