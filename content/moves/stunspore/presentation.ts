/**
 * 麻痹粉 / Stun Spore 的客户端表现。
 *
 * 一句话：施法者掌心拢起一团淡黄花粉，低弧抛出去，落地炸开成一片悬在原地、久久不散的粉云；
 *   站进云里的人身上缠起一圈麻花电花。
 * 色相家族：淡黄绿（0xE8E24A）与乳白（0xF6F0A0）撑起粉团与粉云，麻痹电黄（0xF2E24A）只出现在被麻住的人身上
 *   ——那是共享麻痹身份的颜色，玩家一眼读出谁中了招。
 * 拍子：起（windup 拢粉）→ 掷（throw 粉团低弧飞出）→ 落（burst 真实碰撞或抵达落点才炸开）→ 收（linger 悬停的云慢慢变淡）。
 * 范围：burst 与 linger 都绑在落点上、按 `data.scale`（实际云半径 ÷ 参考半径 2.3）缩放球形覆盖——
 *   画出来的那团云就是真正判定「站进来就被麻」的那块区域。linger 由服务端 `WorldFeedback.onEffect` 绑在这片
 *   云自己的场地效果上：云自然散去或被驱散时，画面随之结束，不会多播一段。
 * 运动：粉团沿低弧飞向落点；落定后云里的粉粒缓慢上浮、不飘散，读起来是「它还在那儿」。
 * 数：服务端把 `spores`（麻粉颗粒数，随特攻与等级）交给发射器，云里的粉粒密度与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const StunSporeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.2, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 14, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 15], size: [0.1, 0.03], spin: 14,
                    color: 0xE8E24A, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        throw: {
            duration: 60,
            exit: { stop: 60, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 22, trail: { minDistance: 0.16 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.12, 0.03], spin: 16,
                    color: 0xE8E24A, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "puff_motes", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, trail: { minDistance: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 20], size: [0.05, 0.01],
                    color: 0xF6F0A0, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "burst_puff", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "spores", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.22], spread: 60, drag: 0.9, gravity: 0.002,
                    lifetime: [14, 26], size: [0.16, 0.05], spin: 18,
                    color: 0xE8E24A, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "burst_ring", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.2, 0.08],
                    color: 0xF2E24A, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        linger: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "cloud_fill", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: { data: "spores", fallback: 16 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.01, 0.05], drag: 0.92,
                    lifetime: [20, 36], size: [0.12, 0.04], spin: 12,
                    color: 0xE8E24A, alpha: [0.4, 0], light: "world", maxParticles: 120
                },
                {
                    name: "cloud_motes", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "spores", fallback: 16 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xF6F0A0, alpha: [0.4, 0], light: "world", maxParticles: 90
                }
            ]
        },
        caught: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "caught_spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "spores", fallback: 12 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xF2E24A, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "caught_puff", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.1, 0.03], spin: 14,
                    color: 0xF6F0A0, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stunspore", 1, StunSporeDefinition);
