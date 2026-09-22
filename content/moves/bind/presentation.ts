/**
 * 绑紧 / bind 的客户端表现。
 *
 * 一句话：长身或藤蔓在身侧收束绷起（起）→ 甩出一条纤维绳缠住目标（甩）→ 此后一根绷紧的绳连着两端、
 * 随张力颤动，每勒一下沿目标身上爆开一圈纤维屑（勒）→ 绳松开时纤维落下、被扯断时向两端崩开（解）。
 * 色相家族：暖棕绳索（0xB08C5A，高光 0xE6D8B8）为主，碎屑用暖米 tinydust；单一色相，无饱和色。
 * 拍子：起 coil → 甩 lash → 缠 grip → 持 leash（绷线，持续）→ 勒 cinch（周期）→ 解 release / snap / slack。
 * 范围：lash 与 leash 的 polyline 沿 `data.path` 在施法者与目标之间拉出那条线——线的两端就是「谁拴着谁」，
 *      lineOfSight 之外的部分不画即代表绳被挡断。
 * 运动：绳线在两实体之间静止绷直，张力高时颤动更强（`data.tension` 决定幅度与亮度）；cinch 时纤维屑向外炸。
 * 数：绳屑数量绑 `data.notes`（物攻派生），勒紧强度绑 `data.intensity`（本勒威力 / 18），收紧档位绑 `data.tight`。
 * 参照节：视觉语言第一、二、三、四、五、六、七、九节（持续状态少而稳）。
 */
const BindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.02, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xE6D8B8, alpha: [0.5, 0], light: "world", maxParticles: 48
                }
            ]
        },
        lash: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "rope", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.03, 0.12], spread: 18,
                    spin: 12, lifetime: [6, 12], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xB08C5A, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        grip: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "bind_point", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "notes", fallback: 12 }, interval: 2, repeats: 2 },
                    shape: { kind: "cylinder", radius: 0.42, length: 1.0, thickness: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xB08C5A, alpha: [0.75, 0], light: "world", maxParticles: 50
                },
                {
                    name: "snap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [4, 8], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        leash: {
            duration: 0,
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "taut", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 26, shape: { kind: "polyline" },
                    direction: "away", speed: [0.01, 0.05], spread: 10,
                    spin: 10, lifetime: [6, 11], size: [0.1, 0.02],
                    color: 0xB08C5A, alpha: [{ data: "tension", fallback: 0.5 }, 0], light: "world", maxParticles: 60
                },
                {
                    name: "fret", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 14, shape: { kind: "polyline" },
                    direction: "away", speed: [0.02, 0.08], spread: 6,
                    lifetime: [3, 7], size: [0.1, 0.02],
                    color: 0xE6D8B8, alpha: [0.3, 0], light: "full", maxParticles: 40
                }
            ]
        },
        cinch: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "cylinder", radius: 0.42, length: 1.0, thickness: 0.5 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xB08C5A, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "fibre", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.05, 0.18], spread: 40,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xE6D8B8, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        release: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "fall", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "down", speed: [0.02, 0.1],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [9, 16], size: [0.12, 0.02],
                    color: 0xB08C5A, alpha: [0.6, 0], light: "world", maxParticles: 44
                }
            ]
        },
        snap: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.1, 0.34], spread: 16,
                    spin: 16, lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xE6D8B8, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        slack: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "drop", bind: "source", offset: [0, 0.1, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xE6D8B8, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "loose", bind: "source", offset: [0, 0.1, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 10 },
                    shape: { kind: "arc", radius: 0.5, arcDegrees: 160 },
                    direction: "outward", speed: [0.04, 0.16],
                    spin: 12, lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xB08C5A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bind", 1, BindDefinition);
