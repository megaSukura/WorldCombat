/**
 * 复生祈祷 / revivalblessing 的客户端表现。
 *
 * 一句话：施法者低头合掌、脚边聚起暖光 → 在倒下的伙伴处从地面升起几束金色光柱、金点缓缓飘落 →
 *   施法者与身边伙伴身上浮起一层慈爱光环。
 * 色相家族：慈爱金 0xFFE98A 画主线，暖白 0xFFFBE8 只给「立起光柱」那一下，琥珀 0xB69A4A 作地面余韵。
 * 起击收：起 kneel 14t ／ 立 beacon 由机制时长决定 ／ 祝 anoint 22t ／ 合 pray 30t ／ 空 none 18t。
 * 范围：beacon 的光柱与地面金环立在倒下处、落在 `prayerRange` 覆盖的那块地上；anoint 的金环贴在每个受祝福者身上，
 *   玩家一眼看出这次祈祷照到了哪里、照到了谁。
 * 运动：beacon 的光柱从地面竖直升起、金点缓慢上浮后回落；anoint 的光环从身体向外扩散；pray 的暖光贴地推开。
 * 数：beacon 的竖直光束数量直接读本招算出的 `beams`（等级派生），飘落光点数量读 `motes`（特防派生），
 *   地面金环大小读 `scale`（光点密度派生），pray 的亮度读 `anointed`（被祝福的人数派生）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * kneel  起始  orb/orb            向内收    0.10-0.02 12-18 0.6→0 ≤40
 * beacon 主体  generic/lightbeam  竖直升起  0.3-0.9   20-30 0.7→0 ≤40
 * beacon 细节  glowingsparkle     缓慢上浮  0.08-0.02 16-26 0.8→0 ≤70
 * beacon 地面  mediumring         贴地外扩  1.8-0.5  22-32 0.5→0 ≤32
 * anoint 结果  orb/xsboost        球面向外  0.14-0.03 12-20 0.85→0 ≤48
 * pray   合十  giantring_white    贴地外扩  2.0-0.5  24-34 0.5→0 ≤32
 * none   落空  smoke              原地一小撮 0.12-0.04 10-16 0.4→0 ≤16
 */
const RevivalBlessingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kneel: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [12, 18], size: [0.10, 0.02],
                    color: 0xFFE98A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        beacon: {
            duration: { data: "duration", fallback: 160 },
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "column", bind: "point", fit: "none", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    burst: { count: { data: "beams", fallback: 6 } },
                    shape: { kind: "cylinder", radius: 0.22, length: 3.2 }, direction: "up", speed: [0.0, 0.04],
                    lifetime: [20, 30], size: [0.3, 0.9], sizeMode: "index",
                    color: 0xFFFBE8, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "rise", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "motes", fallback: 24 },
                    shape: { kind: "circle", radius: 0.6 }, direction: "up", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xFFE98A, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "ground", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.04, 0.08],
                    lifetime: [22, 32], size: [1.8, 0.5], sizeMode: "index",
                    color: 0xB69A4A, alpha: [0.5, 0], light: "world", maxParticles: 32
                }
            ]
        },
        anoint: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "bless", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14], drag: 0.92,
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0xFFE98A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 48
                }
            ]
        },
        pray: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fold", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.1],
                    lifetime: [24, 34], size: [2.0, 0.5], sizeMode: "index",
                    color: 0xFFE98A, alpha: [0.5, 0], light: "full", maxParticles: 32
                }
            ]
        },
        none: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "hollow", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.12, 0.04],
                    color: 0xB69A4A, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_revivalblessing", 1, RevivalBlessingDefinition);
