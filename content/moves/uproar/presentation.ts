/**
 * 吵闹 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抬头吸气、喉头亮起；随后一圈圈金色声波以他为中心荡开，撞在每个听见的人身上；
 *   只要还在喊，头顶就悬着一圈「不得入睡」的暖光。
 * 色相家族：暖金 0xE8C24A 与近白 0xFFF4D0 为主，低饱和灰金 0xB9A15A 只做余韵；一个色相。
 * 层次：声线内聚（windup）→ 环形声波＋音符（roar）→ 命中爆点（shock）→ 唤醒（wake）→ 余韵（fade）。
 * 范围：roar 的环半径直接读机制半径（data.radius），画出的圈就是会被震到、也会被吵得睡不着的范围。
 * 运动：声波从圆心向外一圈圈推开；音符随声浪向外翻飞，命中时在目标身上炸开一小团。
 * 数：服务端把 data.intensity（声浪威力）与 data.hits（这一圈震到几个）交给发射器，人越多、声越响画面越密。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const UproarDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "breath_in", bind: "source", offset: [0, 0.9, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0xFFF4D0, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "throat_glow", bind: "source", offset: [0, 0.85, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xE8C24A, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        roar: {
            duration: 28,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "wave_ring", bind: "source", offset: [0, 0.25, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "radius", fallback: 5 } },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.93,
                    lifetime: [14, 24], size: { data: "intensity", fallback: 1 },
                    sizeMode: "sin", color: 0xE8C24A, alpha: [0.55, 0], light: "full", maxParticles: 80
                },
                {
                    name: "wave_note", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 1 },
                    amount: 1,
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.26], drag: 0.94, spin: 8,
                    lifetime: [16, 26], size: [0.22, 0.05],
                    color: 0xFFF4D0, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "wave_dust", bind: "source", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "ring", radius: { data: "radius", fallback: 5 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xB9A15A, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        shock: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "hit_flash", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "hit_note", bind: "target", height: 0.7, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 6 }, amount: 1,
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [12, 22], size: [0.16, 0.03], spin: 10,
                    color: 0xFFF4D0, alpha: [0.75, 0], light: "full", maxParticles: 30
                }
            ]
        },
        wake: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "pop_zzz", bind: "target", height: 0.8, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.2, 0.04],
                    alpha: [0.7, 0], light: "world", maxParticles: 26
                },
                {
                    name: "wake_spark", bind: "target", height: 0.8, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xFFF4D0, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 28,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "echo_note", bind: "source", offset: [0, 1.1, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04], spin: 4,
                    lifetime: [18, 30], size: [0.14, 0.02],
                    color: 0xB9A15A, alpha: [0.4, 0], light: "full", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_uproar", 1, UproarDefinition);
