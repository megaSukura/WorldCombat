/**
 * 借力摔 / vitalthrow 的客户端表现。
 *
 * 一句话：施法者沉腰张臂站定等人，脚下扬起一圈尘；对手扑近的一刻一把捞住（爪影收拢），随即把它沿自己的冲势甩出去，
 * 拖出一条土线，落地砸起一圈碎石与尘环。
 * 色相家族：暖赭与土黄（grab／impact_fighting／earth），余韵收在中性尘色。
 * 拍子：起（brace 站定蓄势）→ 击（seize 捞住、heave 甩出、slam 落地）→ 收（miss 扑空）。
 * 范围：seize 的爪影锚在目标身上、slam 的地面环按 `data.scale` 画出抓握圈的大小，玩家看得出这招够到哪。
 * 运动：尘从脚边向四周散去，目标被甩时沿 `data.direction` 拖出方向，落地时碎石向外炸开。
 * 数：`data.intensity`（摔击威力派生）抬高爪影与落地亮度，`data.committed`（对手是否在出手）决定捞住时是否多一圈强调，
 * `data.pinned`（压制时长派生）决定落地尘环的余韵长度，`data.scale`（抓握距离派生）缩放判定圈。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const VitalthrowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 18 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xE0C9A0, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "read", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 8, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xD08A4A, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        seize: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "grip", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: { data: "committed", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.06, 0.22],
                    lifetime: [8, 16], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xF0C88A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "clench", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xC97B4A, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        heave: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "streak", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 30, shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.02, 0.12],
                    lifetime: [8, 16], size: [0.34, 0.5],
                    color: 0xB89A78, alpha: [0.45, 0], light: "world", maxParticles: 80
                },
                {
                    name: "spray", bind: "target", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 20, shape: { kind: "sphere", radius: 0.28 },
                    direction: "away", speed: [0.05, 0.2], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x8A6A4A, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        slam: {
            duration: { data: "pinned", fallback: 30 },
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "quake", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 22], size: [0.5, 0.95],
                    color: 0xD8B888, alpha: [0.7, 0], light: "world"
                },
                {
                    name: "debris", bind: "target", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.36], gravity: 0.06, drag: 0.92,
                    lifetime: [10, 20], size: [0.16, 0.04],
                    color: 0x9A7A5A, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.18], gravity: 0.05, drag: 0.9,
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xE0C9A0, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [0, 0.5, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [10, 18], size: [0.3, 0.5],
                    color: 0xB89A78, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vitalthrow", 1, VitalthrowDefinition);
