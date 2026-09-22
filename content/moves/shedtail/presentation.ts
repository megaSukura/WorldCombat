/**
 * 断尾 / shedtail 的客户端表现。
 *
 * 一句话：身侧一道弧光收紧 → 一截血肉尾巴被切下来留在原地 → 自己拉着一串速度线沿撤离方向窜出去 →
 * 尾巴每 20 刻朝四周收紧一圈，把敌人的注意力牵回自己身上 → 尾巴被啃碎时血肉外抛，或到点淡去。
 * 色相家族：血肉褐红为主（0xB0705A、0x8A4A3C），撤离速度线用暖白，只有牵引环用一点饱和的红。
 * 拍子：起（windup 0–10t）→ 击（shed 1–18t）→ 收（depart 8–22t 与 lure 持续 / break、expire 20–28t）。
 * 范围：shed 绑尾巴落点、lure 的环半径按 `data.scale`（牵引范围 / 8）画出尾巴真正拉得住的范围，
 *       站进这个环的敌人就是会被牵住的那些。
 * 运动：断尾瞬间血肉向外甩；撤离速度线沿 `data.direction` 拖出；牵引环由外向内收紧，表示把敌人往尾巴上拉。
 * 数：`data.scale`（尾巴耐久 / 0.25 最大生命）缩放 shed 的血肉爆；`data.intensity`（被牵住的敌人数 / 2）
 *     抬高 lure 的环亮度与数量——拉住的敌人越多，画面越明显。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ShedTailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "coil_glint", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 12, shape: { kind: "arc", radius: 0.42, arcDegrees: 220, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xE7C7B0, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "coil_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xC79A6B, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        shed: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "shed_core", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xE7B9A0, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "shed_flesh", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xB0705A, alpha: [0.75, 0], gravity: 0.05, drag: 0.88, light: "world", maxParticles: 120
                },
                {
                    name: "shed_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 18], size: [0.34, 0.12],
                    color: 0x8A4A3C, alpha: [0.5, 0], light: "world"
                }
            ]
        },
        depart: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "depart_lines", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 34, shape: { kind: "box", size: [0.3, 0.24, 0.3] }, orient: "direction",
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.2 },
                    lifetime: [5, 9], size: [0.18, 0.05],
                    color: 0xFFE4CC, alpha: [0.7, 0], light: "full", maxParticles: 200
                },
                {
                    name: "depart_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "box", size: [0.3, 0.16, 0.3] }, orient: "direction",
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xC79A6B, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        lure: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "lure_ring", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [16, 24], size: [0.42, 0.14], sizeMode: "sin",
                    color: 0xB0503C, alpha: [0.32, 0], light: "full", maxParticles: 16
                },
                {
                    name: "lure_twitch", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE7A090, alpha: [0.3, 0], light: "full", maxParticles: 14
                }
            ]
        },
        break: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "break_flesh", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 44 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xB0705A, alpha: [0.8, 0], gravity: 0.06, drag: 0.86, light: "world", maxParticles: 120
                },
                {
                    name: "break_puff", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [14, 24], size: [0.26, 0.06],
                    color: 0x7A4A3C, alpha: [0.3, 0], light: "world", maxParticles: 56
                }
            ]
        },
        expire: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "expire_ring", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 22], size: [0.3, 0.06],
                    color: 0x8A4A3C, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "expire_motes", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 28], size: [0.09, 0.01],
                    color: 0xD9B0A0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shedtail", 1, ShedTailDefinition);
