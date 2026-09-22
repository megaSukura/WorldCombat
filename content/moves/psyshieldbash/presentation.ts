/**
 * 屏障猛攻 / psyshieldbash 的客户端表现。
 *
 * 一句话：意念在身体外编成一层半透明的淡紫护盾（环与光点组成），带着盾冲出去；撞实的一刻盾在接触点
 * 裂成片、目标被顶开，碎片随后回卷重新合拢，使用者身上的壳亮一下。
 * 色相家族：超能品紫（psyring / psyswirl / impact_psychic 原色）为底，护盾主体低饱和半透明，
 * 只有撞击核心与回卷碎片用高饱和亮紫；没有第二种色相。
 * 拍子：起（focus 聚念）→ 结（shell 壳成形并持续）→ 行（drive）→ 击（impact 碎壳）→ 收（reform 回卷 / miss）。
 * 范围：shell 与 reform 贴施法者、随它移动，`data.scale`（护盾半径 / 0.48）画出的就是判定用的那层壳；
 * impact 绑命中点，画出的就是壳碎的位置。
 * 运动：聚念向内收，护盾环贴体缓慢自转，行进时壳随人前移，撞击向外炸开，回卷由外向内收拢。
 * 数：`data.scale` 放大壳与炸开范围，`data.shards`（加固级数 × 14）决定回卷碎片的数量，
 * `data.ticks`（护盾时长）直接绑定 shell 幕的画面存活，`data.intensity`（本击威力 / 75）抬高撞击核心亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PsyshieldbashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        focus: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 18, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 15], size: [0.18, 0.04], spin: 6,
                    color: 0xC79AF0, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "think", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 12, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xE0B8FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        shell: {
            duration: 44,
            exit: { stop: 34, drain: 16 },
            emitters: [
                {
                    name: "shield_body", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 22, shape: { kind: "sphere", radius: { data: "scale", fallback: 0.48 } },
                    direction: "shape", speed: [0.01, 0.04], spin: 8,
                    lifetime: [10, 18], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0xB36BFF, alpha: [0.34, 0], light: "full", render: "translucent", maxParticles: 150
                },
                {
                    name: "shield_rings", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: 10, shape: { kind: "ring", radius: { data: "scale", fallback: 0.48 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.01, 0.05], spin: 10,
                    lifetime: [12, 20], size: [0.34, 0.06], sizeMode: "sin",
                    color: 0xD9B4FF, alpha: [0.42, 0], light: "full", render: "translucent", maxParticles: 70
                }
            ]
        },
        drive: {
            duration: 42,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "wake", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 30, trail: { minDistance: 0.34 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.12], spin: 12,
                    lifetime: [7, 13], size: [0.14, 0.04],
                    color: 0xC79AF0, alpha: [0.5, 0], light: "full", maxParticles: 160
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.48 } },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xF0D6FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "shatter", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.48 }, randomDirection: 0.6 },
                    direction: "outward", speed: [0.1, 0.34], spin: 16,
                    lifetime: [8, 15], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xE0B8FF, alpha: [0.85, 0], light: "full", maxParticles: 120
                }
            ]
        },
        reform: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "return_shards", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "shards", fallback: 14 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.48 }, randomDirection: 0.4 },
                    direction: "inward", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xE6C6FF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "reform_ring", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 16, at: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.48 }, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12], spin: 8,
                    lifetime: [10, 18], size: [0.3, 0.05],
                    color: 0xCFA8FF, alpha: [0.6, 0], light: "full", render: "translucent", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "skim", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16], spin: 10,
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0xB98BE0, alpha: [0.5, 0], light: "full", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psyshieldbash", 1, PsyshieldbashDefinition);
