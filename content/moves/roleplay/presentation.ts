/**
 * 扮演 / roleplay 的客户端表现。
 *
 * 一句话：一道金线绕着对手描出它的形状 → 描下的那张“扮相”沿连线飞回施法者脸上，贴上时炸开一圈金光 →
 *         披着扮相的一段时间里，施法者身上低密度地闪着对手的样子。
 * 色相家族：描摹金 0xFFC24A 作主体，暖白 0xFFF0C8 作高光；只在飞回的扮相上留一点亮青白 0xFFE9A8 的边。
 * 拍子：起 trace 0–14t ／ 击 don 34t（扮相飞回＋贴脸）／ 收 mask 低密度续期。
 * 范围：trace/don 的发射器绑 `data.path`（对手与施法者两个实体顶点画的 polyline），画的就是“从多远之外描过来”；
 *   对手身上的描摹面绑 target，贴脸的金光绑 source。
 * 运动：描摹面在对手身上开合、扮相沿连线飞回、贴脸时向四面炸开再向上收束。
 * 数：线条数绑 `data.traits`（特攻派生），贴脸强度绑 `data.intensity`（扮演时长派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const RoleplaySceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        trace: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "trace_brush", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "traits", fallback: 8 },
                    shape: { kind: "box", size: [0.7, 1.3, 0.7] },
                    direction: "outward", speed: [0.03, 0.12], spin: 30,
                    lifetime: [8, 15], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "trace_frame", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "box", size: [0.9, 1.5, 0.9] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.4, 0.2],
                    color: 0xFFF0C8, alpha: [0.5, 0], light: "full", maxParticles: 24
                },
                {
                    name: "trace_thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "traits", fallback: 6 }, direction: "shape", speed: [0.03, 0.1], spread: 10,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xFFC24A, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        don: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "don_ribbon", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polyline" },
                    rate: { data: "traits", fallback: 10 }, direction: "shape", speed: [0.1, 0.28], spread: 6,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFC24A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "don_flare", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "traits", fallback: 10 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.24], drag: 0.92,
                    lifetime: [9, 16], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFF0C8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "don_ring", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.3, 0.8], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        mask: {
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "mask_glow", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "traits", fallback: 4 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 24], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xFFE9A8, alpha: [0.38, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "mask_face", bind: "source", fit: "body", offset: [0, 0.62, 0],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 3, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.003, 0.015],
                    lifetime: [16, 26], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.3, 0], alphaMode: "sin", light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.32],
                    color: 0x8A8172, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_roleplay", 1, RoleplaySceneDefinition);
