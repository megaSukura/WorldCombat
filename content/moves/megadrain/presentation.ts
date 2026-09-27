/**
 * 超级吸取 / megadrain 的客户端表现。
 *
 * 一句话：身前养起一颗青绿孢荚 → 孢荚拖着一串种屑飞出去 → 撞在对手身上炸开草屑并附上一枚跟身的荚 →
 * 每拍把真实伤害的一部分吐成一颗会慢慢回飞的绿荚，回到施法者身边才治疗。
 *
 * 色相家族：黄绿（0x8CC63F／0x5C9E2E）与嫩白（0xDCE775），近白只给命中核心；无第二色相。
 * 拍子：起 windup（聚荚）→ 飞 fly（拖尾）→ 绽 burst（命中峰值）→ attached（跟身荚，逐拍更新剩余拍数）→
 *   回 return→collected（真实绿荚归身）→ 空 miss／fizzle。
 * 范围：burst 与 attached 的环读 `data.scale`（荚体接触半径 / 0.5）；fly 沿 projectile、return 绑真实回收体。
 * 运动：fly 沿 projectile 拖尾；return 由 `WorldBodies` 里的真实回收体每刻移动，表现绑它自身；没有假的吸收连线。
 * 数：`data.motes` 决定种屑密度；`data.beats`（剩余拍数换算）让跟身荚的剩余拍数可读；miss 落在真实弹体结束点。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MegaDrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        return:{emitters:[{name:"moving_pod",bind:"target",fit:"body",particle:"world_combat_core:cobblemon/generic/orb/xsfadeorblite",rate:12,shape:{kind:"sphere",radius:.12},lifetime:[3,6],size:[.16,.05],color:0xA8EA72,alpha:[.7,.1],light:"full"}]},
        collected:{duration:16,emitters:[{name:"received_life",bind:"target",fit:"body",particle:"world_combat_core:cobblemon/generic/sparkle/smallsparkle",burst:{count:10},shape:{kind:"sphere_surface",radius:.4},direction:"inward",speed:[.02,.06],lifetime:[5,12],size:[.1,.02],color:0xA8EA72,alpha:[.8,0]}]},
        pod_pulse:{duration:12,emitters:[{name:"swollen_pod",bind:"target",fit:"body",particle:"world_combat_core:cobblemon/generic/grass/seed",burst:{count:3},shape:{kind:"sphere_surface",radius:.3},lifetime:[4,10],size:[.12,.25],color:0x8CC63F,alpha:[.8,0]}]},
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "pod_gather", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05], spin: 20,
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0x8CC63F, alpha: [0.7, 0], light: "world", maxParticles: 26
                },
                {
                    name: "pod_core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.0, 0.04],
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0xDCE775, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        fly: {
            duration: 60,
            exit: { stop: 52, drain: 14 },
            emitters: [
                {
                    name: "pod_body", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 26, shape: { kind: "sphere", radius: 0.12 }, spin: 40,
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0x9BD24B, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "pod_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, trail: { minDistance: 0.18 },
                    shape: { kind: "point" }, direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xB9D97A, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "root_net", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "motes", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.05, 0.18], spin: 30,
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "burst_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: 8, size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "burst_flakes", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x8CC63F, alpha: [0.75, 0], light: "world", maxParticles: 80
                }
            ]
        },
        attached: {
            // Owned by the real attached effect: one pod follows the carrier and the remaining beats read as a shrinking ring.
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "held_pod", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 8, shape: { kind: "sphere", radius: 0.16 }, spin: 24,
                    lifetime: [5, 11], size: [0.16, 0.05],
                    color: 0x8CC63F, alpha: [0.8, 0], light: "world", maxParticles: 24
                },
                {
                    name: "beat_marks", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "beats", fallback: 8 }, shape: { kind: "ring", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [4, 9], size: [0.1, 0.02],
                    color: 0xDCE775, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "miss_burst", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9BD24B, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "fizzle_dust", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xB9D97A, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_megadrain", 1, MegaDrainDefinition);
