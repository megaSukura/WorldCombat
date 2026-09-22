/**
 * 蘑菇孢子 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身上隆起一圈菌盖色的孢子、越攒越密 → 一瞬炸满周围一小片，孢子向外铺成一层停不住的白绿
 *   雾团 → 沾上的人头顶冒起 Z 与一圈收拢的孢子环；草属性或免疫的人只看孢子从身上散过。
 *
 * 色相家族：苔绿（0x7FA83C）为孢子主体，暗橄榄（0x4E6E2A）压在爆心，近白黄绿（0xD8F0A0）只给起手与「睡下」的高光。
 * 拍子：起 windup（攒孢）→ 爆 burst（一次炸满）→ 眠 asleep（头顶 Z）；免疫 immune／空 fizzle 收尾。
 * 范围：burst 以自身为圆心、`fit: "none"`，shape 半径按 `data.scale`（实际半径 ÷ 参考 2.2 格）缩放——
 *   画出的那片孢子就是判定圈，且爆开只在 `data.speed` 内一瞬完成，与「够得近才躲不掉」一致。
 * 运动：孢子从身上猛地向外喷、受阻力迅速停下（不留云）；asleep 的孢子环在目标身上向内收，Z 向上升。
 * 数：`data.spores`（特攻与等级换算）决定喷出的孢子数量与密度，`data.puff`（身高换算）决定单颗孢子的大小。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SporeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 13,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/grass/mushroomize",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.08], spin: 16,
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0xD8F0A0, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/mushroomize",
                    burst: { count: { data: "spores", fallback: 22 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: { data: "speed", fallback: 1.1 }, spread: 70, drag: 0.86, gravity: 0.005,
                    lifetime: [12, 22], size: [0.14, 0.04], spin: 20,
                    color: 0x7FA83C, alpha: [0.9, 0], light: "world", maxParticles: 160
                },
                {
                    name: "puff_dust", bind: "point", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/tochukaso",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.15, 0.5], drag: 0.88,
                    lifetime: [10, 18], size: [0.1, 0.03],
                    color: 0xD8F0A0, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "puff_ring", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.22, 0.07],
                    color: 0x4E6E2A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "core", bind: "point", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.9,
                    lifetime: [8, 14], size: { data: "puff", fallback: 0.18 },
                    color: 0x4E6E2A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 20
                }
            ]
        },
        asleep: {
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
                    name: "cling", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/grass/mushroomize",
                    burst: { count: { data: "spores", fallback: 12 }, interval: 3, repeats: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.11, 0.03], spin: 18,
                    color: 0x7FA83C, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shrug", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xD8F0A0, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "waste", bind: "point", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/mushroomize",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9, gravity: 0.01,
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0x7FA83C, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spore", 1, SporeDefinition);
