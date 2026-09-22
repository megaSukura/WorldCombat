/**
 * 捕兽夹 / snaptrap 的客户端表现。
 *
 * 一句话：施法者把一只撑开的铁夹抛出去，夹子落在选定的点上摊开成两片咬齿，齿间泛着一点冷光等人踩；
 * 谁踩上去，两片齿当场合拢并炸起一圈尘土，接着一磨一磨地咬着不放，直到松开或滑脱。
 * 色相家族：铁灰（0xC9CDD2／0x8A8F96）为主体，草绿（0xB9C7A6）只做草属的边光，白色做咬合高光。
 * 拍子：起（cock 撑齿）→ 掷（toss 抛出）→ 伏（armed 落地摊开 / armed_idle 待机亮点）→
 *   咬（snap 合上 + chew 反复磨）→ 收（loose 松开 / release 滑脱 / fade 收起）。
 * 范围：伏与收都绑 `point`、`fit: "none"`，用 `data.trigger`（真实触发半径）决定咬齿张开的大小；
 *   咬合与磨绑 `target`，跟着被夹住的人。
 * 运动：夹子沿抛物线飞出落地；咬齿合拢时粉尘向外炸，磨的时候碎屑贴着地面弹。
 * 数：`data.jaws`（物攻派生）决定咬合与磨的碎屑量，`data.wait`（待机时长）只用来让待机亮点保持低频。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SnaptrapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        cock: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "cock_glint", bind: "source", offset: [0, 0.45, 0.25], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "box", size: [0.5, 0.2, 0.5] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xEAF0F2, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "cock_jaw", bind: "source", offset: [0, 0.35, 0.25], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 8, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.07], spin: 10,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xB9C7A6, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        toss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "toss_spin", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.01, 0.05], spin: 20,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xC9CDD2, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        armed: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "armed_open", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "ring", radius: { data: "trigger", fallback: 1.1 } },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.26, 0.05],
                    color: 0x8A8F96, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "armed_teeth", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "jaws", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "trigger", fallback: 1.1 } },
                    direction: "up", speed: [0.02, 0.1], spin: 12,
                    lifetime: [10, 20], size: [0.16, 0.04],
                    color: 0xB9C7A6, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        armed_idle: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "idle_glint", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "ring", radius: { data: "trigger", fallback: 1.1 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.07, 0.02],
                    color: 0xEAF0F2, alpha: [0.4, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "idle_moss", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 5, shape: { kind: "ring", radius: { data: "trigger", fallback: 1.1 } },
                    direction: "up", speed: [0.005, 0.03], spin: 10,
                    lifetime: [16, 28], size: [0.08, 0.02],
                    color: 0xB9C7A6, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        snap: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "snap_bite", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xF2F5F6, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "snap_teeth", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "jaws", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2], spread: 18, gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xB9C7A6, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        chew: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "chew_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "jaws", fallback: 10 }, at: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0x8A8F96, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "chew_moss", bind: "target", height: 0.28,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xB9C7A6, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        loose: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "loose_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.06, 0.02],
                    color: 0xC9CDD2, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        release: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slip_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [12, 22], size: [0.22, 0.4],
                    color: 0x8A8F96, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "fade_glint", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10 }, shape: { kind: "ring", radius: { data: "trigger", fallback: 1.1 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC9CDD2, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_snaptrap", 1, SnaptrapDefinition);
