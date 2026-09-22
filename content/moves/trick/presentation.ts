/**
 * 戏法 / trick 的客户端表现。
 *
 * 一句话：施法者朝目标抛出一撮假印记把它的注意力引开，一条超能心线在两者之间拉直，两件持有物各沿心线
 * 飞向对方，手里各落一圈紫色落定光。
 * 色相家族：超能紫（psyring / orb）为主，近白细节（tinydust / smallsparkle）作衬；饱和紫只出现在心线与脉冲的小面积。
 * 拍子：起（feint 假印记）→ 连（link 心线拉直）→ 换（trade 两件道具对飞）→ 落（settle 两端落定）。
 * 范围：feint 画在目标身上，link 沿 data.path 的施法者—目标顶点铺开，画面就是心线落到的两点之间。
 * 运动：假印记朝目标飘出后被吸散；心线上的光点由两端向中间涌、再沿道具飞行的方向分开。
 * 数：`data.motes`（特攻与等级派生的心尘数）驱动心线与两端粒子量，`data.decoys`（等级派生的假印记数）驱动起手，
 * `data.span`（本次实际两点距离）随载荷提供；两只精灵放同一招画面也不同。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const TrickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        feint: {
            duration: 22,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "decoy", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "decoys", fallback: 3 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.09, 0.015],
                    color: 0xD9A8FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "hush", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 11], size: [0.05, 0.01],
                    color: 0x9B6FD0, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        link: {
            duration: 28,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0xC77DFF, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "node", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: 12, size: [0.24, 0.05],
                    color: 0xE7D2FF, alpha: [0.75, 0], light: "full", maxParticles: 30
                },
                {
                    name: "nodeFoe", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: 12, size: [0.26, 0.05],
                    color: 0xD9B8FF, alpha: [0.75, 0], light: "full", maxParticles: 30
                }
            ]
        },
        trade: {
            duration: 34,
            exit: { stop: 18, drain: 18 },
            emitters: [
                {
                    name: "carry", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "away", speed: [0.01, 0.06],
                    lifetime: [6, 13], size: [0.12, 0.02],
                    color: 0xE9DDF4, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "sphere", radius: 0.12 },
                    direction: "away", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xB98FE6, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "land", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [9, 16], size: [0.11, 0.02],
                    color: 0xF2E6FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "target",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x6E5A82, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_trick", 1, TrickDefinition);

