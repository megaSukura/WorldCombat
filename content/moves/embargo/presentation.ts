/**
 * 查封 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者指尖拢起一封暗色封条，封条贴着一条直线扑向对手；命中处一圈锁环扣在它的道具位上、
 *   封条绕着转，道具的微光被按住；印记松开时锁环弹开，被人硬拔时崩成碎光。
 *
 * 色相家族：查封紫（0x8C6BD8）画锁环与封条，暗灰（0x5A5670）画余韵与烟，近白（0xE8E4FF）只做锁扣高光。
 * 层次：起（windup 拢条）／飞（cast 沿 path 直线）／扣（seal 锁环与撞击）／持续（hold 低密度转动）／
 *   松（release 自己弹开、break 被硬拔、miss 落空）。
 * 起击收：windup 16t → cast 18t → seal 32t → hold → release／break 24t。
 * 范围：seal／release 的环按 data.scale（印记半径比）铺开，画出「扣住多大一块道具位」。
 * 运动：封条沿 data.path 的直线飞行；锁环由外向内收拢再锁死；hold 低速绕转；release 向外弹开。
 * 数：锁环数绑 data.shackles（特攻派生），飞行封条数绑 data.motes（等级派生），命中的按住强弱绑 data.intensity（时长派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const EmbargoDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "windup_seals", bind: "source", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "motes", fallback: 8 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x8C6BD8, alpha: [0.85, 0], light: "full", bloom: 0.15, maxParticles: 30
                },
                {
                    name: "windup_dust", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0x5A5670, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        cast: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "cast_seals", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "motes", fallback: 8 }, trail: { minDistance: 0.28 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.04, 0.12],
                    lifetime: [6, 11], size: [0.15, 0.03],
                    color: 0x8C6BD8, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "cast_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 30, trail: { minDistance: 0.2 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.07],
                    lifetime: [5, 9], size: [0.1, 0.02],
                    color: 0x5A5670, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        seal: {
            duration: 32,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "seal_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "shackles", fallback: 10 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x8C6BD8, alpha: [0.8, 0], light: "full", maxParticles: 44
                },
                {
                    name: "seal_burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [5, 11], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xE8E4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "seal_locks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shackles", fallback: 10 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [6, 12], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xE8E4FF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "hold_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "shackles", fallback: 10 }, shape: { kind: "circle", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0x8C6BD8, alpha: [0.35, 0], light: "full", maxParticles: 26
                },
                {
                    name: "hold_marks", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.24 }, direction: "down", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.07, 0.02], color: 0xE8E4FF, alpha: [0.3, 0], light: "full", maxParticles: 20
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "release_pop", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: { data: "shackles", fallback: 10 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.12, 0.02], light: "full",
                    color: 0x8C6BD8, alpha: [0.7, 0], maxParticles: 30
                },
                {
                    name: "release_glow", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02], light: "full", bloom: 0.2,
                    color: 0xE8E4FF, alpha: [0.6, 0], maxParticles: 24
                }
            ]
        },
        break: {
            duration: 22,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "break_snap", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [5, 10], size: [0.22, 0.03], sizeMode: "index",
                    color: 0x5A5670, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    name: "break_shards", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.02, drag: 0.93,
                    lifetime: [8, 14], size: [0.12, 0.02], spin: 12,
                    color: 0x5A5670, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.28 }, direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.18, 0.3], color: 0x5A5670, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_embargo", 1, EmbargoDefinition);
