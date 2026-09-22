/**
 * 睡觉 / Rest 的粒子语言。
 *
 * 一句话：身体一沉，一圈睡意的紫雾在脚边合拢；睡下后脚边展开半透明的安眠穹顶，气泡与 Z 慢慢升；睡满时
 *   暖金光从身上绽开、穹顶收束散去，被中途打醒只留一团灰紫的迷糊。
 * 色相家族：睡眠紫 0x7A6BD0 为地面与主体，浅紫 0xB9A8F0 作高光，暖金 0xFFE08A 只出现在睡满那一拍。
 * 拍子：起（windup）／眠（sleep 持续）／醒（wake）／爽（refreshed）。
 * 持续状态：睡眠层的密度与位置都在脚边与头顶，保持低透明，让玩家透过它看清目标与被谁惊醒。
 * 机制驱动：wake／refreshed 的爆发粒子数绑定 data.burst，该值由服务端按「已睡比例」与固定基数算出。
 */
const RestDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "settle_ring", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.07],
                    lifetime: [10, 16], size: [0.34, 0.14],
                    color: 0x7A6BD0, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "settle_haze", bind: "source", offset: [0, 0.25, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0x7A6BD0, alpha: [0.45, 0], light: "world", maxParticles: 26
                },
                {
                    name: "settle_dust", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xB9A8F0, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        },
        sleep: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "sleep_floor", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 5, shape: { kind: "circle", radius: 1.2, thickness: 0.85 },
                    direction: "up", speed: [0.004, 0.016],
                    lifetime: [30, 50], size: [0.14, 0.05],
                    color: 0x7A6BD0, alpha: [0.2, 0.03], alphaMode: "sin", light: "world", maxParticles: 40
                },
                {
                    name: "sleep_wall", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 4, shape: { kind: "cylinder", radius: 1.15, length: 1.4 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [26, 44], size: [0.14, 0.04],
                    color: 0x7A6BD0, alpha: [0.1, 0.02], light: "full", maxParticles: 28
                },
                {
                    name: "sleep_bubbles", bind: "target", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    rate: 6, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 28], size: [0.14, 0.02],
                    color: 0x7A6BD0, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "sleep_zzz", bind: "target", offset: [0, 0.78, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: 5, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [22, 32], size: [0.16, 0.02],
                    color: 0xB9A8F0, alpha: [0.7, 0], light: "full", maxParticles: 14
                },
                {
                    name: "sleep_passive", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_passive",
                    rate: 4, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.1, 0.01],
                    color: 0x7A6BD0, alpha: [0.4, 0], light: "world", maxParticles: 14
                }
            ]
        },
        wake: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "wake_burst", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    burst: { count: { data: "burst", fallback: 20 } }, shape: { kind: "sphere_surface", radius: 0.42 },
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    direction: "outward", speed: [0.06, 0.18], drag: 0.88,
                    lifetime: [12, 22], size: [0.22, 0.03],
                    color: 0xB9A8F0, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "wake_dome", bind: "point", offset: [0, 0.08, 0], height: 0,
                    burst: { count: 16 }, shape: { kind: "ring", radius: 1.15 },
                    particle: "world_combat_core:cobblemon/generic/screen",
                    direction: "up", speed: [0.05, 0.12],
                    lifetime: [16, 28], size: [0.34, 0.1],
                    color: 0xB9A8F0, alpha: [0.4, 0], light: "full", maxParticles: 26
                },
                {
                    name: "wake_mote", bind: "point", offset: [0, 0.06, 0], height: 0,
                    burst: { count: 24, repeats: 2, interval: 5 }, shape: { kind: "circle", radius: 1.1 },
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xD8C8F5, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        refreshed: {
            duration: 36,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "refresh_star", bind: "target", offset: [0, 0.55, 0], height: 0.3,
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.42 },
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    direction: "outward", speed: [0.06, 0.18], drag: 0.88,
                    lifetime: [14, 24], size: [0.22, 0.03],
                    color: 0xFFE08A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "refresh_ring", bind: "target", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 5 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [16, 24], size: [0.34, 0.72],
                    color: 0xFFE08A, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "refresh_mote", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0xFFE08A, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rest", 1, RestDefinition);
