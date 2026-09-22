/**
 * 催眠粉 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者掌心拢起一撮淡紫催眠粉尘 → 粉团低弧抛出、拖着一缕粉尾落在某处 → 落地摊成一片会停留的
 *   尘云（云里持续飘着粉粒）→ 站在云里的人身上一层层糊上粉、够数的人头顶冒起 Z。
 *
 * 色相家族：淡紫（0xB08CFF）为粉团与尘云主体，深紫（0x5A3E96）压在云底，近白紫（0xE8D9FF）只给起手与「睡下」的高光。
 * 拍子：起 windup（拢粉）→ 掷 throw（粉团低弧）→ 落 burst（炸开成云）→ 停 field（云留存）＋困 caught／眠 sleep。
 * 范围：burst 与 field 绑在落点上、`fit: "none"`，shape 半径按 `data.scale`（实际云半径 ÷ 参考 2.4 格）缩放——
 *   画出的那片云就是判定圈；field 一直画到云散去，与「留一片地」的机制一致。
 * 运动：粉团沿低弧飞向落点；落点炸开成云，云里的粉粒缓慢上浮、贴地循环；caught 的粉往目标身上收。
 * 数：`data.motes`（特攻与等级换算）决定粉云与粉粒的数量，`data.dose`（已吸口数）决定目标身上粘粉的层数。
 * 参照节：视觉语言第二、三、四、五、六、七、九节。
 */
const SleepPowderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 13,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.2, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 12, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.06], spin: 14,
                    lifetime: [8, 14], size: [0.09, 0.03],
                    color: 0xB08CFF, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        },
        throw: {
            duration: 50,
            exit: { stop: 50, drain: 10 },
            emitters: [
                {
                    name: "puff", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 20, trail: { minDistance: 0.16 },
                    shape: { kind: "sphere", radius: 0.08 },
                    direction: "up", speed: [0.01, 0.04], spin: 16,
                    lifetime: [7, 14], size: [0.1, 0.03],
                    color: 0xB08CFF, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "puff_motes", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, trail: { minDistance: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xE8D9FF, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 13, drain: 16 },
            emitters: [
                {
                    name: "bloom", bind: "point", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 18 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 55, drag: 0.9, gravity: 0.004,
                    lifetime: [12, 22], size: [0.14, 0.04], spin: 16,
                    color: 0xB08CFF, alpha: [0.85, 0], light: "world", maxParticles: 110
                },
                {
                    name: "bloom_ring", bind: "point", fit: "none", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.2, 0.07],
                    color: 0xE8D9FF, alpha: [0.55, 0], light: "world", maxParticles: 28
                }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "cloud", bind: "point", fit: "none", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: { data: "motes", fallback: 18 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.005, 0.025], spread: 40, drag: 0.94,
                    lifetime: [26, 44], size: [0.12, 0.05], alpha: [0.35, 0],
                    color: 0xB08CFF, light: "world", maxParticles: 120
                },
                {
                    name: "cloud_base", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [30, 50], size: [0.35, 0.6], alpha: [0.14, 0],
                    color: 0x5A3E96, light: "world", maxParticles: 40
                }
            ]
        },
        caught: {
            duration: 20,
            exit: { stop: 10, drain: 13 },
            emitters: [
                {
                    name: "dusting", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "dose", fallback: 1 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08], spin: 12,
                    lifetime: [10, 18], size: [0.1, 0.03],
                    color: 0xB08CFF, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sleep: {
            duration: 32,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "zzz", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: 6, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xB08CFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "settle", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.46 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [10, 16], size: [0.22, 0.07],
                    color: 0x5A3E96, alpha: [0.55, 0], light: "full", maxParticles: 30
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shrug", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xE8D9FF, alpha: [0.55, 0], light: "full", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sleeppowder", 1, SleepPowderDefinition);
