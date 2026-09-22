/**
 * 气味侦测 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者沿空气嗅出一缕琥珀色的气味，气味一路缠到对手身上；对手被一圈暖黄的气味雾罩住，
 *   追踪窗口里不断有气味丝从它身上往外拖，走到哪跟到哪。
 *
 * 色相家族：琥珀黄（0xE8D08A）做气味主体，橄榄绿（0xA8B860）做咬住的记号，灰白（0xC6C6B8）收尘。
 * 层次：嗅闻（起手，气味在口鼻前聚成一丝）→ 咬住（一条气味丝＋目标气味雾＋记号火花）→ 拖住（低密度气味丝）
 *   → 褪去／被挡／落空。
 * 起击收：windup（嗅闻）→ pick（咬住）→ hold（拖住，慢慢离场）→ fade（走空）。
 * 范围：单体追踪，气味丝与目标气味雾画的正是被咬住的那个人；嗅闻距离由 reach 决定，画面沿视线铺开。
 * 运动：气味丝从施法者沿视线飞向目标（bind path polyline），目标气味雾贴着它往外散；持味时气味丝在它身上拖。
 * 数：气味丝与气味雾的密度读 data.motes（物攻派生），拖慢比例读 data.drag（决定气味雾的厚度与下沉速度）。
 */
const OdorsleuthDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "sniff_puff", bind: "source", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 12, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xE8D08A, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        pick: {
            duration: 32,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "scent_line", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 14 }, direction: "shape", speed: [0.04, 0.13], spread: 20,
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xE8D08A, alpha: [0.75, 0], light: "world", maxParticles: 70
                },
                {
                    name: "scent_cloud", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "motes", fallback: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.004,
                    lifetime: [14, 24], size: [0.26, 0.08],
                    color: 0xA8B860, alpha: [0.4, 0], light: "world", maxParticles: 46
                },
                {
                    name: "scent_mark", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE8D08A, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        hold: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hold_scent", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: { data: "motes", fallback: 6 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04], gravity: -0.002,
                    lifetime: [14, 22], size: [0.1, 0.02], alphaMode: "sin",
                    color: 0xA8B860, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_scent", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0xE8D08A, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blocked_dust", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 9, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6C6B8, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6C6B8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_odorsleuth", 1, OdorsleuthDefinition);
