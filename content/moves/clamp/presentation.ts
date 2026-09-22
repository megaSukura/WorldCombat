/**
 * 贝壳夹击 / clamp 的客户端表现。
 *
 * 一句话：施法者把厚壳张开、壳缝里冒出一圈水泡，合拢时咬住对手，双方之间被一圈向内收的水环裹住，
 * 每碾一次就从壳缝里迸出一撮壳屑与白水花；松开时噗地散开一团泡。
 * 色相家族：贝壳青白（0xEAF6F8／0x9FD7E8）与海的浅蓝（0x6FA9C0）为主，白色只做水花高光。
 * 拍子：起（gape 张壳）→ 击（seize 合上 + crush 反复碾）→ 收（release 松开 / slip 滑脱 / free 施法者脱身）。
 * 范围：这招只作用在贴身一个目标身上，所以每层都绑 `target`（或施法者 `source`），没有地面圈；
 *   `data.shell`（合拢瞬间的间距）与目标体型一起决定裹身环的大小。
 * 运动：裹身的水环向内收、壳屑向外迸；松开时水泡向上散。
 * 数：`data.straps`（防御派生）决定每次碾合的壳屑量，`data.crush`（威力派生）决定这一下的强度，
 *   `data.duration` 只用来给持续裹身一个可读的密度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const ClampDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gape: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gape_shell", bind: "source", offset: [0, 0.35, 0.1], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/largebubble",
                    rate: 12, shape: { kind: "sphere", radius: 0.42 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.16, 0.05],
                    color: 0xEAF6F8, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gape_glow", bind: "source", offset: [0, 0.4, 0.1], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0x9FD7E8, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 36
                }
            ]
        },
        seize: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "seize_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.28], spread: 20,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF2FBFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "seize_wrap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 16, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "shell", fallback: 1.0 } },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [12, 22], size: [0.26, 0.08],
                    color: 0x9FD7E8, alpha: [0.65, 0], light: "world", maxParticles: 90
                }
            ]
        },
        crush: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "shell_dust", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "straps", fallback: 12 }, at: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18, gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xDCEFF2, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "squeeze", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 10, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x6FA9C0, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "loose_foam", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    burst: { count: 20, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.16], drag: 0.92,
                    lifetime: [12, 24], size: [0.2, 0.06],
                    color: 0xEAF6F8, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        slip: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slip_wash", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x9FD7E8, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        free: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "free_puff", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [10, 20], size: [0.1, 0.03],
                    color: 0xEAF6F8, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "snap_air", bind: "source", offset: [0, 0.35, 0.2], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 16], size: [0.2, 0.05],
                    color: 0x9FD7E8, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_clamp", 1, ClampDefinition);
