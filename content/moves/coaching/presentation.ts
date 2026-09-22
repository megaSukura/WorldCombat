/**
 * 指导 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者头顶先亮起一个提示，朝选定的伙伴喊出一条金色火花带，落到伙伴身上炸成一组叮嘱标记，
 *   标记再向四周荡开、被旁边的同伴接住；整段时间里受教者身边浮着金色标记。
 *
 * 色相家族：琥珀金（0xF2C15A）为主体，暖白（0xFFF3D0）做高光，暗金（0x9A6B2E）做余韵；没有第二个色相。
 * 层次：提气（起）／火花带与叮嘱爆发（击）／旁人领会（接力）／受教者身边的标记（持续）／褪去（收）。
 * 起击收：call（起）→ shout（击）→ drill（击）→ learn（接力）→ ready（持续）→ fade（收）。
 * 范围：叮嘱爆发的环按 `data.scale`（传授半径 / 3）推出，画出来的圈就是教会荡到的范围。
 * 运动：提示向上冒；火花带沿施法者到伙伴的连线飞过去；叮嘱标记向外炸开后上浮；持续标记缓慢升起。
 * 数：叮嘱标记数绑 `data.motes`（特攻派生），攻防等级写进 `data.atk`/`data.def` 影响强度，尺寸与范围绑 `data.scale`。
 * 持续状态：持续层贴在受教者肩侧，低密度，让出目标本体视线。
 */
const CoachingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        call: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "call_mark", bind: "source", fit: "body", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 24], size: [0.5, 0.14], sizeMode: "index",
                    color: 0xFFF3D0, alpha: [0.55, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "call_spark", bind: "source", fit: "body", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xF2C15A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        },
        shout: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "shout_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 14 }, interval: 2, repeats: 3 },
                    shape: { kind: "polyline" },
                    direction: "toward", speed: [0.05, 0.18], drag: 0.9, spin: 18,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xFFF3D0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "shout_note", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 6, interval: 3 },
                    shape: { kind: "polyline" },
                    direction: "toward", speed: [0.04, 0.14], drag: 0.92, spin: 10,
                    lifetime: [14, 24], size: [0.28, 0.08],
                    color: 0xF2C15A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        drill: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "drill_burst", bind: "target", fit: "body", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/exclamationmark",
                    burst: { count: 3 }, shape: { kind: "ring", radius: 0.45, rotation: [0, 90, 0] },
                    direction: "outward", speed: [0.05, 0.16], drag: 0.9, spin: 12,
                    lifetime: [14, 22], size: [0.5, 0.12], sizeMode: "index",
                    color: 0xFFF3D0, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 20
                },
                {
                    name: "drill_mark", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9, spin: 20,
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0xF2C15A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "drill_ring", bind: "target", fit: "body", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.3, 0.1],
                    color: 0xF2C15A, alpha: [0.55, 0], light: "full", maxParticles: 40
                }
            ]
        },
        learn: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "learn_spark", bind: "target", fit: "body", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92, spin: 16,
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0x9A6B2E, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        ready: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "ready_mark", bind: "target", fit: "body", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [16, 26], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xF2C15A, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "ready_note", bind: "target", fit: "body", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 1, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xFFF3D0, alpha: [0.2, 0], light: "full", maxParticles: 6
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "fade_note", bind: "target", fit: "body", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94, spin: 8,
                    lifetime: [18, 30], size: [0.24, 0.06],
                    color: 0x9A6B2E, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_coaching", 1, CoachingDefinition);
