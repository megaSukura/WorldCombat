/**
 * 净化 / Purify 的粒子语言。
 *
 * 一句话：手心先拢起一点净光，并预告这次会抽到谁（windup）→ 施法者朝目标探手，目标身上的病痛被抽成暗紫的雾、
 *   沿一条线飞回施法者（draw）→ 只有真正抽到东西，暗雾才在施法者身上落地，化作一圈薄荷色的回血光（absorb）。
 * 色相家族：薄荷 0x9CE8C8 作主体，近白 0xEAFFF6 作高光，被抽出的病痛用低饱和暗紫 0x7A5FA0 画小面积。
 * 拍子：起 windup 0–12t ／ 引 draw 0–28t ／ 收 absorb 0–32t；落空时用 fizzle 收。
 * 范围：draw 的连线绑 path（目标↔施法者两个实体顶点每帧跟随），一眼看出病痛从谁身上被抽向谁；
 *   windup 的预告线同样绑 path（施法者↔预定对象），只有 data.preview 为 1 时出现。
 * 数：absorb 的回血光量绑 data.motes 并以 data.intensity（由实际补回的生命派生）缩放，抽出病痛数绑 data.removed（抽掉的项数）。
 */
const PurifyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 18, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xEAFFF6, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    // 预告这次会抽到谁：path 只在 data.preview 为 1 时由服务端填入。
                    name: "gather_thread", bind: "path", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 22, shape: { kind: "polyline" },
                    speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9CE8C8, alpha: [0.6, 0], light: "full", maxParticles: 36
                },
                {
                    name: "gather_mark", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 3, repeats: 3 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.2, 0.05], alphaMode: "sin",
                    color: 0xEAFFF6, alpha: [0.55, 0], light: "full", maxParticles: 12
                }
            ]
        },
        draw: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "draw_pull", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "removed", fallback: 1 }, interval: 2, repeats: 7 }, shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x7A5FA0, alpha: [0.7, 0], light: "world", maxParticles: 36
                },
                {
                    name: "draw_thread", bind: "path", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 34, shape: { kind: "polyline" },
                    speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x9CE8C8, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "draw_malaise", bind: "path", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 20, shape: { kind: "polyline" },
                    speed: [0.008, 0.04],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0x7A5FA0, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        absorb: {
            duration: 32,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "absorb_burst", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x9CE8C8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "absorb_ring", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, interval: 4 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.28, 0.7], sizeMode: "sin",
                    color: 0xEAFFF6, alpha: [0.8, 0], light: "full", maxParticles: 14
                },
                {
                    name: "absorb_mote", bind: "source", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 20, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xEAFFF6, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "point", offset: [0, 0.4, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0x7A5FA0, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_purify", 1, PurifyDefinition);
