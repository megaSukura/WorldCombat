/**
 * 延后 / quash 的客户端表现。
 *
 * 一句话：目标头顶先罩下一圈暗影，随后一道暗紫的压制之力自下砸落，把目标钉在原地——脚边留一圈暗环，头顶落下暗色微尘。
 * 色相家族：暗紫与近黑（impact_dark / psyring / smallfadeorb），只用一点亮紫做压下的核心。
 * 拍子：起（windup 0–8t，暗影下降）→ 击（strike 砸落 / pin 钉住）→ 收（release 暗环散去；fizzle 是打空的结局）。
 * 范围：strike 与 pin 都绑目标身体，pin 的暗环就是被压住的脚下位置——画出的就是压制真正落点。
 * 运动：暗影自上而下收拢，压下的力道贴地扩散，微尘持续向下落。
 * 数：服务端把压制时长换算成 `count`／`size`／`speed` 交给 strike 的爆点，压得越久画面越大越密。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const QuashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "shadow_ring", bind: "target", offset: [0, 1.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "down", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.4, 0.24], sizeMode: "sin",
                    color: 0x6A4FA8, alpha: [0.5, 0], light: "world", maxParticles: 16
                },
                {
                    name: "falling", bind: "target", offset: [0, 1.9, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 14, shape: { kind: "circle", radius: 0.55 },
                    direction: "down", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0x3A2E5A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        strike: {
            duration: 30,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.8, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: { data: "count", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "shape", speed: { data: "speed", fallback: 0.24 },
                    lifetime: [8, 15], size: { data: "size", fallback: 0.4 }, sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "column", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 22 } },
                    shape: { kind: "cylinder", radius: 0.5, length: 2.6 },
                    direction: "down", speed: { data: "speed", fallback: 0.3 },
                    lifetime: [8, 14], size: { data: "size", fallback: 0.26 }, sizeMode: "index",
                    alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "ground", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: { data: "speed", fallback: 0.16 },
                    lifetime: [12, 20], size: { data: "size", fallback: 0.3 },
                    color: 0x4A3A72, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        pin: {
            emitters: [
                {
                    name: "nail_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 4, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [24, 36], size: [0.42, 0.28], sizeMode: "sin",
                    color: 0x6A4FA8, alpha: [0.35, 0.06], alphaMode: "sin", light: "world", maxParticles: 16
                },
                {
                    name: "weight", bind: "target", offset: [0, 1.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "circle", radius: 0.45 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [18, 30], size: [0.06, 0.02],
                    color: 0x3A2E5A, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        release: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lift", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.16, 0.24],
                    color: 0x4A3A72, alpha: [0.28, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "waste", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x4A3A72, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_quash", 1, QuashDefinition);
