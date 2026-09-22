/**
 * 换档 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：一圈钢色齿轮环在施法者身侧加速旋转，到位后「咔」地锁定，速度线沿身体冲起，
 * 随后齿轮环继续绕身慢转一小段，把「挡位在线」画出来。
 *
 * 色相家族：钢蓝灰（0x8FA3B8）为主体，暖金（0xE8B84B）只在锁定那一下的小面积强调，近白做高光。
 * 层次：齿轮环（起手与运转）／锁定冲击与速度线（换挡）／余韵火花。
 * 起击收：windup（加速旋转）→ engage（锁定＋速度线）→ run（继续绕身拖尾）。
 * 数：齿轮环半径绑定服务端算出的 orbit（判定与表现同一半径）；锁定冲击的粒子量绑定 attack+speed 算出的 power。
 */
const ShiftGearDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "gear_ring", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: 24, interval: 4, repeats: 4 }, shape: { kind: "ring", radius: { data: "orbit", fallback: 1.3 } },
                    direction: "shape", speed: [0.02, 0.06], spin: 90,
                    lifetime: [10, 16], size: [0.5, 0.34],
                    color: 0x8FA3B8, alpha: [0.5, 0], light: "full", maxParticles: 60
                },
                {
                    name: "gear_spin", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 14, shape: { kind: "ring", radius: { data: "orbit", fallback: 1.3 } },
                    direction: "shape", speed: [0.03, 0.1], spin: 120,
                    lifetime: [10, 18], size: [0.24, 0.06],
                    color: 0xB8C6D6, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        engage: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "lock_core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "power", fallback: 36 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [7, 14], size: [0.34, 0.04], sizeMode: "index",
                    color: 0xE8B84B, alpha: [0.95, 0], light: "full", bloom: 0.3
                },
                {
                    name: "lock_ring", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: 30 }, shape: { kind: "ring", radius: { data: "orbit", fallback: 1.3 } },
                    direction: "inward", speed: [0.06, 0.14], spin: 60,
                    lifetime: [12, 18], size: [0.5, 0.34],
                    color: 0x8FA3B8, alpha: [0.6, 0], light: "full", maxParticles: 50
                },
                {
                    name: "speed_lines", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 22, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "velocity", speed: [0.15, 0.5],
                    lifetime: [8, 14], size: [0.6, 0.1], sizeMode: "index",
                    color: 0xE8F0F8, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        run: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "run_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    rate: 10, shape: { kind: "ring", radius: { data: "orbit", fallback: 1.3 } },
                    direction: "shape", speed: [0.01, 0.04], spin: 45,
                    lifetime: [16, 26], size: [0.44, 0.3],
                    color: 0x8FA3B8, alpha: [0.3, 0], light: "full", maxParticles: 24
                },
                {
                    name: "run_trail", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 8, shape: { kind: "sphere", radius: 0.36 },
                    direction: "velocity", speed: [0.05, 0.2],
                    lifetime: [10, 18], size: [0.3, 0.06],
                    color: 0xDCE6F0, alpha: [0.35, 0], light: "full", maxParticles: 30
                },
                {
                    name: "run_spark", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 4, shape: { kind: "ring", radius: { data: "orbit", fallback: 1.3 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xF3D98A, alpha: [0.4, 0], light: "full", bloom: 0.2, maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shiftgear", 1, ShiftGearDefinition);
