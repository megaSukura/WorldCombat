/**
 * 冥想 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者收住心神，一圈圈淡紫的静气从体内向外扩开，细密的念力微粒被吸拢又贴着身体缓慢上浮；
 *   这段清明在它周身以极淡的念力维持着，散功时静气悠悠淡去。
 *
 * 色相家族：淡紫（0xB9A6F2）为主体，暖白（0xEDE8FF）做高光与静环；没有第二个色相。
 * 层次：收心（起）／静环、念力与气息（击）／贴身的淡光（收）／散开（末）。
 * 起击收：gather（凝神）→ settle（静定）→ calm（维持）→ fade（散功）。
 * 范围：静环绑脚点、fit none，半径按 `data.scale`（实际涟漪半径 / 1.4）推出，画出来的圈就是静气铺到的范围。
 * 运动：念力微粒由外向内收拢；静环一圈圈向外推开；维持时淡光贴着身体缓慢上浮。
 * 数：微粒量绑 `data.motes`（特攻＋特防派生），静环圈数绑 `data.breaths`（等级派生），尺寸与范围绑 `data.scale`。
 * 持续状态：维持期低密度、贴身，玩家仍看得清目标。
 */
const CalmMindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather_mote", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "sphere", radius: 1.3 },
                    direction: "inward", speed: [0.05, 0.15], drag: 0.9, spin: 10,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xB9A6F2, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "gather_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, interval: 4 }, shape: { kind: "ring", radius: 1.15 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [10, 16], size: [0.3, 0.6], sizeMode: "index",
                    color: 0xEDE8FF, alpha: [0.5, 0], light: "full", maxParticles: 10
                }
            ]
        },
        settle: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "settle_mote", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 24 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: -0.003, drag: 0.92, spin: 16,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0xB9A6F2, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 220
                },
                {
                    name: "settle_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "breaths", fallback: 2 }, interval: 6 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [16, 26], size: [0.5, 0.95], sizeMode: "index",
                    color: 0xEDE8FF, alpha: [0.6, 0], light: "full", maxParticles: 36
                },
                {
                    name: "settle_dust", bind: "source", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xB9A6F2, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        calm: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "calm_halo", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 3, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.025], spin: 8,
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xB9A6F2, alpha: [0.3, 0], light: "full", bloom: 0.25, maxParticles: 16
                },
                {
                    name: "calm_mote", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.008, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xEDE8FF, alpha: [0.28, 0], light: "world", maxParticles: 14
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.02, drag: 0.92, spin: 12,
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0xB9A6F2, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_calmmind", 1, CalmMindDefinition);
