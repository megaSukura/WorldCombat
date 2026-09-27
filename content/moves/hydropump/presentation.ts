/**
 * 水炮 / hydropump 的客户端表现。
 *
 * 一句话：身前后翻涌起一大团水（越收越满），随后从喷口到实际受阻点始终连着一道高压水柱、持续 6 刻，
 *   撞上墙或身体就在那一点炸开一大蓬水花；被浇透的人身上滴水。
 * 色相家族：深水蓝（0x2C86C8）与泡沫白（0xEAF9FF）；大面积低饱和的水柱 + 小面积高亮的水花核心。
 * 拍子：起 charge（翻涌蓄水）→ 轰 column（喷口连到端点的整柱）→ 击 burst（命中大开）→
 *   漫 douse（漫灌溅开一圈）／ 空 dud（撞硬面同点溅水）。
 * 范围：column 每刻读服务端传的真实 `data.direction`／`data.span`／`data.radius`——管壁半径就是判定半径、长度就是喷口到真实受阻点的距离；
 *   打到墙与打到身体分别由 burst／dud 呈现，玩家看水柱断在哪就知道谁挡住了它。漫灌的回溅圈单独用 `backwash` 时刻画真实半径。
 * 运动：短水点由 `data.direction` 与 `orient:"direction"` 从喷口沿线流向端点，速度读 `data.flow`（水柱流速，由速度数据换算）。
 * 数：`data.volume`（特攻＋等级换算的水量点）绑定各层发射量，`data.scale` 放大整幕（服务端按回溅半径换算），
 *   `data.intensity`（洪流威力 / 110）决定亮度与水花大小——两只精灵放同一招，画面不同。
 */
const HydropumpDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: { data: "volume", fallback: 60 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.22, 0.06],
                    color: 0x2C86C8, alpha: [0.8, 0], light: "world", maxParticles: 130
                },
                {
                    name: "churn", bind: "source", offset: [0, 0.55, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 26, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xEAF9FF, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        column: {
            duration: 0,
            exit: { drain: 16 },
            emitters: [
                {
                    // 固定柱轮廓：沿 data.direction 的管壁，半径就是判定用的真实 radius、长度就是真实 span。
                    name: "shell", bind: "point", fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    rate: { data: "volume", fallback: 40 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 0.55 }, length: { data: "span", fallback: 8 }, thickness: 1 },
                    direction: "shape", speed: [0.0, 0.02], spread: 4,
                    lifetime: [3, 6], size: [0.2, 0.06],
                    color: 0xDCF2FF, alpha: [0.6, 0], light: "world", maxParticles: 200
                },
                {
                    // 短水点从喷口沿 direction 流向端点（line + orient:direction + direction:shape，非整线径向乱撒）。
                    name: "flow", bind: "point", fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet_head",
                    rate: { data: "volume", fallback: 60 },
                    shape: { kind: "line", length: { data: "span", fallback: 8 } },
                    direction: "shape", speed: { data: "flow", fallback: 0.4 }, spread: 5,
                    lifetime: [4, 8], size: [0.5, 0.2],
                    color: 0x2C86C8, alpha: [0.95, 0], light: "full", maxParticles: 160
                },
                {
                    name: "tail", bind: "point", fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 24,
                    shape: { kind: "line", length: { data: "span", fallback: 8 } },
                    direction: "shape", speed: [0.05, 0.18], spread: 16, gravity: 0.05, drag: 0.94,
                    lifetime: [3, 7], size: [0.08, 0.02],
                    color: 0xEAF9FF, alpha: [0.75, 0], light: "full", maxParticles: 120
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "volume", fallback: 60 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.07, 0.3], spread: 24,
                    lifetime: [7, 12], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 140
                },
                {
                    name: "foam", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    burst: { count: 28, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], spread: 30,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [9, 16], size: [0.12, 0.02],
                    color: 0xEAF9FF, alpha: [0.9, 0], light: "full", maxParticles: 110
                }
            ]
        },
        backwash: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    // 回溅圈：半径直接读判定的实际 backwash，fit world 让世界单位与机制一致。
                    name: "ring", bind: "point", fit: "world", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: { data: "volume", fallback: 40 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "backwash", fallback: 2.0 }, thickness: 0.4 },
                    direction: "outward", speed: [0.06, 0.22], spread: 8,
                    lifetime: [8, 14], size: [0.3, 0.08],
                    color: 0x2C86C8, alpha: [0.75, 0], light: "world", maxParticles: 180
                },
                {
                    name: "spray", bind: "point", fit: "world", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "volume", fallback: 24 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "backwash", fallback: 2.0 }, thickness: 1 },
                    direction: "outward", speed: [0.05, 0.24], spread: 12, gravity: 0.04, drag: 0.92,
                    lifetime: [8, 14], size: [0.18, 0.04],
                    color: 0xDCF2FF, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        douse: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "soak", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.09, 0.28], spread: 26,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [9, 15], size: [0.16, 0.03],
                    color: 0x2C86C8, alpha: [0.8, 0], light: "world", maxParticles: 44
                },
                {
                    name: "drip", bind: "target", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 8, shape: { kind: "circle", radius: 0.34 },
                    direction: "down", speed: [0.0, 0.02], gravity: 0.06,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xEAF9FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        dud: {
            duration: 16,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "spent", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "volume", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.22], spread: 42,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [9, 15], size: [0.14, 0.03],
                    color: 0x2C86C8, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hydropump", 1, HydropumpDefinition);
