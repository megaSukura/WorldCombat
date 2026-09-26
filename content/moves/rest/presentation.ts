/**
 * 睡觉 / Rest 的粒子语言。
 *
 * 一句话：身体一沉，一圈睡意的紫雾在脚边合拢；睡下后只剩贴身的呼吸泡与 Z 慢慢升，呼吸随已睡比例放慢
 *   变大；睡满时暖金光从身上绽开，被中途打醒只留一记短破裂——全程不画保护圈。
 * 色相家族：睡眠紫 0x7A6BD0 为地面与主体，浅紫 0xB9A8F0 作高光，暖金 0xFFE08A 只出现在睡满那一拍。
 * 拍子：起（windup）／眠（sleep 持续）／醒（wake 短破裂）／爽（refreshed）。
 * 持续状态：睡眠只在身体周围，清楚露出施法者本身，让玩家看见它还在挨打。
 * 机制驱动：sleep 的 rate／size 绑定 data.breath／data.breathSize（服务端按已睡比例算好）；wake／refreshed
 *   的爆发数绑定 data.burst。
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
            exit: { drain: 20 },
            emitters: [
                {
                    name: "sleep_breath", bind: "target", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "breath", fallback: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.006, 0.02],
                    lifetime: [18, 30], size: { data: "breathSize", fallback: 0.12 },
                    color: 0x7A6BD0, alpha: [0.4, 0], light: "world", maxParticles: 30
                },
                {
                    name: "sleep_bubbles", bind: "target", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    rate: { data: "breath", fallback: 6 }, shape: { kind: "ring", radius: 0.36 },
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
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wake_burst", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    burst: { count: { data: "burst", fallback: 20 } }, shape: { kind: "sphere_surface", radius: 0.42 },
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    direction: "outward", speed: [0.06, 0.18], drag: 0.88,
                    lifetime: [10, 18], size: [0.22, 0.03],
                    color: 0xB9A8F0, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "wake_snap", bind: "target", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.12], drag: 0.9,
                    lifetime: [8, 14], size: [0.3, 0.04],
                    color: 0xE7DDF8, alpha: [0.9, 0], light: "full", maxParticles: 24
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
