/**
 * 愤怒 / rage 的客户端表现。
 *
 * 一句话：一记带着火星的怒挥之后，施法者脚边亮起一座暗红的红炉；火还烧着的时候每挨一记就打上窜一簇火星，
 * 火越旺火星越多，自己下一次出手时炉火熄灭、余烬散去。
 * 色相家族：暗红与暖橙（B23A2E / E8622E / FFB066）为主，火芯一点近白；没有冷色。
 * 拍子：起 windup（攒火星）→ 开火 ignite（点起火炉）→ 添柴 stoke（挨打上窜）→ 守炉 aura（低密度长明）→
 *       收火 consume（回击前收进身体）→ 熄 fade（自然烧尽的余烬）。
 * 范围：ignite / aura / fade 绑施法者自身，strike 绑命中点——画出的就是火炉与这一记挥到的位置。
 * 运动：windup 的火星向内收拢，ignite 的火从脚边向上窜，stoke 的火苗从身体四周升起，consume 的火收进身体，
 *       aura 的余烬贴地缓慢上飘。
 * 数：`data.plumes`（本次怒火档数与封顶派生）决定火星数量，`data.lift`（实际涨到的档数派生）决定炉焰柱高度，
 *    `data.bright`（档数派生）抬高亮度，`data.gain` 是这一记实际涨的档数，`data.stages` 是姿态累计实际档数，
 *    `data.scale`（判定半径 / 0.42）放大挥击轮廓。
 * 参照节：视觉语言第二、三、四、五、六、七、九节。
 */
const RageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "spark", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 22, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xE8622E, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        ignite: {
            duration: 34,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "furnace", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "plumes", fallback: 16 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.05, 0.18], spread: 18,
                    gravity: -0.01, drag: 0.94,
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0xE8622E, alpha: [{ data: "bright", fallback: 0.6 }, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "ember_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.28, 0.06],
                    color: 0xB23A2E, alpha: [0.5, 0], light: "world"
                }
            ]
        },
        stoke: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "flare", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "plumes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "up", speed: [0.06, 0.24], spread: 22,
                    gravity: -0.012, drag: 0.93,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xFFB066, alpha: [{ data: "bright", fallback: 0.5 }, 0], light: "full", bloom: 0.45, maxParticles: 130
                },
                {
                    name: "core", bind: "target", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "gain", fallback: 2 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [6, 11], size: [0.1, 0.03],
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    // 炉焰柱：柱高由本次姿态实际涨到的档数决定，越旺窜得越高。
                    name: "spire", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "line", length: { data: "lift", fallback: 0.3 } },
                    direction: "up", speed: [0.03, 0.11], spread: 14,
                    gravity: -0.012, drag: 0.93,
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xE8622E, alpha: [{ data: "bright", fallback: 0.5 }, 0], light: "full", maxParticles: 60
                }
            ]
        },
        aura: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "low_fire", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "plumes", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.02, 0.08], spread: 16,
                    gravity: -0.008, drag: 0.95,
                    lifetime: [7, 12], size: [0.06, 0.02],
                    color: 0xB23A2E, alpha: [{ data: "bright", fallback: 0.3 }, 0], light: "world", maxParticles: 44
                },
                {
                    // 长明的炉焰柱：高度随姿态实际涨到的档数抬升。
                    name: "column", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 7, shape: { kind: "line", length: { data: "lift", fallback: 0.25 } },
                    direction: "up", speed: [0.02, 0.07], spread: 12,
                    gravity: -0.008, drag: 0.95,
                    lifetime: [7, 12], size: [0.06, 0.02],
                    color: 0xE8622E, alpha: [{ data: "bright", fallback: 0.3 }, 0], light: "full", maxParticles: 40
                }
            ]
        },
        consume: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "draw", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "plumes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.07, 0.24],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xFFB066, alpha: [{ data: "bright", fallback: 0.6 }, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "core", bind: "target", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 3, repeats: 2 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0xFFF0D0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 24
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 11, drain: 14 },
            emitters: [
                {
                    name: "swipe", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.06, 0.2],
                    lifetime: [4, 9], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFD0A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 44
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "smoke", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.03, drag: 0.93,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0x6A4A3A, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "ash", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "plumes", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.02, 0.09], spread: 14,
                    gravity: 0.01, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x6A4A3A, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rage", 1, RageDefinition);
