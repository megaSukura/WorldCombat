/**
 * 沥青射击 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：一团黑亮的沥青从口边甩出、拖着一串黏稠的滴痕飞向目标；糊上的一刻，目标身上炸开一片黑亮的飞溅
 *   并顺着身体往下淌，脚下很快积出一滩黑色沥青；被火点着时，整片沥青腾起橙色火星与黑烟。
 *
 * 色相家族：沥青黑褐（0x1E1A17／0x3A3226）为主，黏光用一点低调暖褐（0x6B5A44）；火（0xF0A24A）只在
 *   「flare」一幕进入——火把沥青点着正是这招要告诉玩家的第二件事，第二个色相因此只在那一幕出现。
 * 层次：起势（口边聚沥青）→ 飞行（拖滴）→ 糊身（飞溅＋下淌）→ 落地滩（贴地黑斑）→ 点燃（橙火星＋黑烟）／冲掉（水花）。
 * 起击收：windup（聚）→ shot（飞）→ coat（击）→ splat（滩）→ flare／wash（余韵）。
 * 范围：命中点的飞溅半径按 `data.scale = 覆盖半径 / 1.5` 缩放，与判定里 `splash`／滩半径同源；
 *   目标身上的飞溅按其身量缩放（fit body）。
 * 运动：沥青团拖滴沿直线飞；糊上的飞溅向外炸开再受重力下坠，下淌的滴痕缓慢落下，滩上冒黏泡。
 * 数：`data.drops`（物攻换算的飞溅点数）绑定糊身与落点的发射量，`data.caught`（大泼糊到几个人）抬高滩的发射量，
 *   `data.fresh` 区分首次糊上与续泼。
 * 参照节：视觉语言第一、二、三、四、五、六、七、九节。
 */
const TarshotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "tar_gather", bind: "source", height: 0.72, offset: [0, 0, 0.16],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 16, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x1E1A17, alpha: [0.7, 0], light: "world", maxParticles: 34
                },
                {
                    name: "tar_glint", bind: "source", height: 0.74,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    rate: 5, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x6B5A44, alpha: [0.5, 0], light: "world", maxParticles: 12
                }
            ]
        },
        shot: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "tar_trail", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    trail: { minDistance: 0.24 },
                    rate: 30, shape: { kind: "sphere", radius: 0.15 },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x1E1A17, alpha: [0.7, 0], light: "world", maxParticles: 80
                }
            ]
        },
        coat: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "coat_burst", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "drops", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24], spread: 30, gravity: 0.03,
                    lifetime: [10, 18], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x1E1A17, alpha: [1, 0], light: "world", maxParticles: 70
                },
                {
                    name: "coat_drip", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: 14 }, shape: { kind: "circle", radius: 0.36 },
                    direction: "down", speed: [0.0, 0.02], gravity: 0.04, drag: 0.98,
                    lifetime: [16, 28], size: [0.09, 0.02],
                    color: 0x3A3226, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        splat: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "splat_burst", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "drops", fallback: 14 } },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.18], spread: 40, gravity: 0.04,
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x1E1A17, alpha: [0.95, 0], light: "world", maxParticles: 60
                },
                {
                    name: "puddle_bubble", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: { data: "caught", fallback: 1 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x3A3226, alpha: [0.5, 0.05], alphaMode: "sin", light: "world", maxParticles: 24
                }
            ]
        },
        flare: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "flare_burst", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 30 }, shape: { kind: "sphere_surface", radius: 0.48 },
                    direction: "outward", speed: [0.08, 0.26], spread: 30,
                    lifetime: [8, 15], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xF0A24A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "flare_smoke", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [16, 28], size: [0.3, 0.08],
                    color: 0x3A3226, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        wash: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "wash_splash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/ripple_white",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xCFE0EA, alpha: [0.6, 0], light: "world", maxParticles: 28
                },
                {
                    name: "wash_drip", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 0.34 },
                    direction: "down", speed: [0.0, 0.02], gravity: 0.05, drag: 0.98,
                    lifetime: [14, 24], size: [0.08, 0.02],
                    color: 0x6B5A44, alpha: [0.5, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tarshot", 1, TarshotDefinition);
