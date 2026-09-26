/**
 * 滚动 / rollout 的客户端表现。
 *
 * 一句话：一颗土黄石球贴着真实身体路线翻滚向前，滚过的地面卷起碎石与尘线；撞中谁就在谁身上炸开一圈石屑，
 * 撞上实墙在墙面崩出碎石，什么都没碰就只留下一撮尘；连滚层数越高轮缘越粗、碎屑越密。
 * 色相家族：土黄与石灰（earth／large_rock／tinydust），近白高光（quickattack_dashlines／bigsparkle）。
 * 拍子：起（charge 聚石）→ 滚（roll 跟随真实身体路线）→ 击（hit 崩石／wall 撞墙）→ 续（rise 层数上升／aura 存续／cap 接满）→ 收（whiff 空滚／drop 断链）。
 * 范围：roll 的每一帧位置就是身体当刻位置（bind source），`data.direction` 给出当刻滚行方向，弯线与弹回都来自真实位置。
 * 运动：速度线用 orient velocity 沿真实滚行方向拉直；石屑绕身翻滚（spin）。
 * 数：roll 的碎石量与速度线量绑定 `data.grains`，轮缘粗细绑定 `data.rim`（层数派生），球径与亮度绑定
 *   `data.scale`／`data.intensity`——画面里的数与机制里的数一致（层数越高轮缘越粗）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RolloutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "pebble_gather", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.14, 0.05],
                    color: 0xA89674, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "cylinder", radius: 0.55, length: 0.15 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.05, 0.02],
                    color: 0x8A7D64, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        },
        roll: {
            duration: 40,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "tumbling_rim", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: { data: "grains", fallback: 14 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.14], spread: 18, spin: 26,
                    lifetime: [6, 12], size: [{ data: "rim", fallback: 0.16 }, 0.04], sizeMode: "index",
                    color: 0x9A8A72, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "roll_dash", bind: "source", offset: [0, 0.35, 0], height: 0.2, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 18, shape: { kind: "line", length: 0.8 }, direction: "shape", speed: [0.06, 0.22],
                    lifetime: [4, 8], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE8E0CC, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 50
                },
                {
                    name: "ground_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "grains", fallback: 14 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x9A927E, alpha: [0.5, 0], light: "world", maxParticles: 56
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "burst_rock", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "grains", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.08, 0.26], spread: 18,
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xD8C6A2, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "boulder_shard", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24, spin: 6,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0x8C7B62, alpha: [0.9, 0], light: "world", maxParticles: 30
                },
                {
                    name: "rock_dust", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grains", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [12, 22], size: [0.06, 0.02],
                    color: 0x9A927E, alpha: [0.55, 0], light: "world", maxParticles: 48
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "wall_chip", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "grains", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.2], spread: 40,
                    lifetime: [5, 11], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xD8C6A2, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "wall_grit", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.12], gravity: 0.06, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A7D64, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "dust_puff", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x8A7D64, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "skid_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1], spread: 12,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x9A927E, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        rise: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "heavier", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "stage", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 16], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xE8DFC8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "settled_dust", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grains", fallback: 14 }, at: 0 },
                    shape: { kind: "cylinder", radius: 0.5, length: 0.2 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9A927E, alpha: [0.4, 0], light: "world", maxParticles: 32
                }
            ]
        },
        aura: {
            duration: 40,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "gathered_stone", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xA89674, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        cap: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spend", bind: "source", offset: [0, 0.25, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    lifetime: [8, 16], size: [0.55, 0.1],
                    color: 0xE8DFC8, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 6
                },
                {
                    name: "spent_rock", bind: "source", offset: [0, 0.2, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.2], spread: 30, spin: 8,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [10, 20], size: [0.22, 0.04],
                    color: 0x8C7B62, alpha: [0.85, 0], light: "world", maxParticles: 30
                }
            ]
        },
        drop: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fall_apart", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A7D64, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "quiet_out", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.05, 0.02],
                    color: 0x93876C, alpha: [0.3, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rollout", 1, RolloutDefinition);
