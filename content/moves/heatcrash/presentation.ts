/**
 * 高温重压 / heatcrash 的客户端表现。
 *
 * 一句话：施法者全身火苗卷起、越烧越旺 → 带着一条火尾腾空翻转 → 以火身砸在落点上，火浪与燃烧的碎石向外炸开 →
 * 被砸中的目标身上窜起明火，落点留下一片仍在冒火星的焦土。
 * 色相家族：暖橙到深红（flame / ember / wisp / impact_fire）为主体，焦黑（floorscorch_big / burning_rock）作地面，
 * 烟灰（smoke / tinydust）作余韵；只在核心与明火层出现高饱和橙。
 * 拍子：起（windup 蓄火）→ 行（leap 火尾腾空）→ 击（crash 火浪、impact 命中）→ 收（burn 明火、焦土余烬）。
 * 范围：crash 绑落点、fit none，火浪环按 `data.scale`（实际落点半径 / 1.8）、焦土面按 `data.scorch`（焦土半径 / 1.8）铺开。
 * 运动：腾空时火苗沿历史拖尾并向上卷，落地是贴地外扩的火浪加向上崩的燃石，明火层贴目标向上窜。
 * 数：crash 的燃石量绑 `data.bursts`（命中目标数派生）、强度绑 `data.intensity`；impact 是否起明火由 `data.burn` 决定。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HeatCrashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "gather_flame", bind: "source", offset: [0, 0.7, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 22, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03], sizeMode: "sin",
                    alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "ember_feet", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 16, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.04, 0.14],
                    gravity: -0.01, drag: 0.94,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFB347, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        leap: {
            duration: 28,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "fire_trail", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 40, trail: { minDistance: 0.28 },
                    shape: { kind: "box", size: [0.4, 0.5, 0.4] },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: -0.01, drag: 0.95,
                    lifetime: [8, 14], size: [0.2, 0.02], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 180
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 30, trail: { minDistance: 0.24 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.06, drag: 0.93,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xFFC46A, alpha: [0.8, 0], light: "full", maxParticles: 140
                }
            ]
        },
        crash: {
            duration: 36,
            exit: { stop: 18, drain: 22 },
            emitters: [
                {
                    name: "fire_wave", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "ring", radius: 1.8 },
                    direction: "outward", speed: [0.16, 0.42],
                    lifetime: [7, 13], size: [0.7, 0.14], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "burning_rocks", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "bursts", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 1.1 },
                    direction: "outward", speed: [0.12, 0.4], spread: 40,
                    gravity: 0.12, drag: 0.93,
                    collision: { bounces: 2, verticalBounce: 0.4, dragAfter: 0.6 },
                    lifetime: [14, 26], size: [0.2, 0.04], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 130
                },
                {
                    name: "flame_burst", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 46, at: 1 },
                    shape: { kind: "sphere", radius: 1.0 },
                    direction: "up", speed: [0.06, 0.28],
                    gravity: -0.02, drag: 0.93,
                    lifetime: [10, 20], size: [0.24, 0.02], sizeMode: "index",
                    alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "scorch_face", bind: "point", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch_big",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "circle", radius: 1.8 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [26, 34], size: [3.4, 3.6],
                    alpha: [0.8, 0], light: "world", maxParticles: 4
                },
                {
                    name: "ash_smoke", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 28, shape: { kind: "circle", radius: 1.4, thickness: 0.7 },
                    direction: "up", speed: [0.03, 0.12],
                    gravity: -0.01, drag: 0.95,
                    lifetime: [22, 36], size: [0.36, 0.5],
                    color: 0x40342C, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.1, 0.32],
                    lifetime: [6, 11], size: [0.42, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "hit_embers", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.26],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    alpha: [0.9, 0], light: "full", maxParticles: 120
                }
            ]
        },
        burn: {
            duration: { data: "burnTicks", fallback: 60 },
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "alight", bind: "target", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/flame",
                    rate: { data: "embers", fallback: 26 },
                    shape: { kind: "box", size: [0.5, 0.7, 0.5] },
                    direction: "up", speed: [0.02, 0.08],
                    gravity: -0.01, drag: 0.96,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "burn_smoke", bind: "target", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "embers", fallback: 26 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    gravity: -0.005, drag: 0.96,
                    lifetime: [14, 24], size: [0.2, 0.3],
                    color: 0x3A302A, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_heatcrash", 1, HeatCrashDefinition);
