/**
 * 广域战力 / expandingforce —— 客户端表现。
 *
 * 一句话：力量在选定点上方收拢一圈精神环，落点地面先画出一圈与真实半径相符的预告；随后冲击的波前沿
 *   由内向外推进，环带一圈圈扫过、把沿途的人卷进去，推满即散，不留残留场地。
 * 色相家族：紫蓝精神色（0x9A7BFF / 0xC7B4FF）为主体，强调用近白（0xF0EAFF）。
 * 范围由服务端算出的半径决定；`fit: "world"` 让形状按世界格使用真实半径，`data.mid`/`data.width`
 *   是当天那一刻真实子环带的中点与宽度——判定与画面读同一对内外端点。
 * 拍子：起（windup，落点预告）／推（wave，每刻一段真实环带）／散（结束无残圈）。
 */
const ExpandingForceDefinition: ParticleDefinition = {
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "gather_psy", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 20, shape: { kind: "sphere", radius: 0.8 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 16], size: [0.24, 0.03],
                    color: 0x9A7BFF, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0xE6DEFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "windup_mark", bind: "point", fit: "world", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 8, shape: { kind: "ring", radius: { data: "radius", fallback: 3 } },
                    direction: "up", speed: [0.006, 0.02],
                    lifetime: [10, 18], size: [0.22, 0.05], alphaMode: "sin",
                    color: 0x9A7BFF, alpha: [0.5, 0], light: "full", maxParticles: 36
                }
            ]
        },
        wave: {
            duration: 20,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "wave_front", bind: "point", fit: "world", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "ring", radius: { data: "mid", fallback: 0.5 }, thickness: { data: "width", fallback: 0.5 } },
                    direction: "up", speed: [0.012, 0.05],
                    lifetime: [10, 18], size: [0.26, 0.06],
                    color: 0x9A7BFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "wave_swirl", bind: "point", fit: "world", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "count", fallback: 14 } }, shape: { kind: "sphere", radius: { data: "mid", fallback: 0.5 } },
                    direction: "outward", speed: [0.04, 0.14], spin: 10,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xD9CCFF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_expandingforce", 1, ExpandingForceDefinition);
