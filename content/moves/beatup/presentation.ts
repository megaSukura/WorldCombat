/**
 * 围攻 / beatup 的客户端表现。
 *
 * 一句话：施法者脚下先翻起一圈召集的暗影 → 每位真正出力的同伴身边先亮一下识别色、影从它当前位置飞出 →
 *   撞到活体迸出同色碎屑，撞墙只留一小撮，最后一团暗雾散开。
 * 色相家族：暗紫 0x6E5AA8 画群影，近黑 0x2E2340 画暗雾，成员识别色由服务端按出手顺序给出（`data.color`）。
 * 起击收：起 muster 20t ／ 集 gather 20t ／ 亮 charge 14t ／ 扑 rush 每道暗影一条轨迹 ／ 击 hit 20t ／ 收 scatter 24t。
 * 范围：召集半径是一块真的区域，gather 的贴地环半径按 `data.scale`（本招算出的暗影判定半径派生）；
 *   玩家看得出「站在这一圈里的同伴会一起上」。
 * 运动：rush 的发射器绑 `data.projectile` 跟随每道暗影本体；影从同伴当前站位直线飞向锁点，机制里的 arrival 与它同步。
 * 数：每一下的碎屑数量直接读本招算出的 `motes`（物攻派生），强度读 `intensity`（这一段威力相对领队派生），
 *   颜色读 `color`（这位同伴的识别色）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * muster 起始  obscuringsmoke  贴地外涌    0.25-0.1  14-24 0.5→0 ≤80
 * muster 暗影  largefadeorb    缓慢升腾    0.3-0.1   16-26 0.6→0 ≤40
 * gather 集结  obscuringsmoke  贴地脉冲    0.4-0.15  14-24 0.4→0 ≤60
 * charge 出力  obscuringsmoke  向内聚拢    0.24-0.08 8-14  0.7→0 ≤20
 * charge 标记  largefadeorb    原地一亮    0.3-0.1   8-14  0.85→0 ≤12
 * rush   主体  impact_dark     绑投射物    0.34-0.1  6-12  0.9→0 ≤80
 * rush   余影  obscuringsmoke  绑投射物    0.2-0.06  8-16  0.5→0 ≤50
 * hit    强调  impact_dark     向外炸开    0.34-0.06 6-11  1→0   ≤48
 * hit    拳头  fist            原地一亮    0.4-0.1   8-14  0.8→0 ≤20
 * whiff  空响  smoke           原地一小撮  0.16-0.06 8-14  0.4→0 ≤16
 * scatter 收尾 obscuringsmoke  向外散开    0.4-0.15  16-28 0.5→0 ≤60
 */
const BeatUpDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        muster: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ink", bind: "source", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 22, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [14, 24], size: [0.25, 0.1], sizeMode: "index",
                    color: 0x2E2340, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "shade", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 26], size: [0.3, 0.1], sizeMode: "index",
                    color: 0x6E5AA8, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        gather: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "call", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 26, interval: 3, repeats: 3 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [14, 24], size: [0.4, 0.15], sizeMode: "index",
                    color: 0x2E2340, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        charge: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.06, 0.2], spread: 26,
                    lifetime: [8, 14], size: [0.24, 0.08], sizeMode: "index",
                    color: { data: "color", fallback: 0x6E5AA8 }, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "mark", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 1, at: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.3, 0.1], sizeMode: "index",
                    color: { data: "color", fallback: 0x9F86D6 }, alpha: [0.85, 0], light: "full", maxParticles: 12
                }
            ]
        },
        rush: {
            exit: { drain: 14 },
            emitters: [
                {
                    name: "shade", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    rate: 36, trail: { minDistance: 0.22 },
                    direction: "velocity", speed: [0.0, 0.0], spread: 18,
                    lifetime: [6, 12], size: [0.34, 0.1], sizeMode: "index",
                    color: { data: "color", fallback: 0x6E5AA8 }, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "wisp", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 18, trail: { minDistance: 0.3 },
                    direction: "velocity", speed: [0.0, 0.02], spread: 30,
                    drag: 0.94,
                    lifetime: [8, 16], size: [0.2, 0.06],
                    color: 0x2E2340, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.06, 0.26], spread: 26,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: { data: "color", fallback: 0xB9A6E0 }, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "fist", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/fist",
                    burst: { count: 1, at: 1 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.4, 0.1], sizeMode: "index",
                    color: { data: "color", fallback: 0x6E5AA8 }, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 14], size: [0.16, 0.06],
                    color: { data: "color", fallback: 0x2E2340 }, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        scatter: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "disperse", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 30 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [16, 28], size: [0.4, 0.15], sizeMode: "index",
                    color: 0x6E5AA8, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_beatup", 1, BeatUpDefinition);
