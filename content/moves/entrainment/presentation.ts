/**
 * 找伙伴 / entrainment 的客户端表现。
 *
 * 一句话：施法者踩着一段古怪节拍、身侧荡开一圈圈音纹 → 拍子脱手、沿真实轨迹朝选中的对象飞去 →
 *         落定后两端脚边同时亮起短环、身上炸开一圈摆动的音符，说明两边踩到了同一条拍子上；接不住就断拍。
 * 色相家族：节拍黄 0xE8C24A 作主体，暖白 0xFFF0C8 作高光。
 * 拍子：起 dance 0–12t ／ 飞 beat 40t（沿 projectile 绑定）／ 落 sync 32t ／ 断 fizzle 22t。
 * 范围：beat 的拍子沿真实飞行轨迹拖出，sync 的环按 `data.scale`（节拍密集比）铺开；
 *   落地摆动的密度绑 `data.sway`（特攻派生），飞行的密度绑 `data.beats`（速度派生）。
 * 运动：音纹向两侧荡开、拍子从施法者飞向受术者、落定时两端同时向外扩一圈再收束。
 * 数：`data.beats` 决定飞行拖尾与施法端音符，`data.sway` 决定受术端摆动，`data.intensity`（时长派生）整体加强。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const EntrainmentSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        dance: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "dance_note", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: { data: "beats", fallback: 6 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.09], spin: 25,
                    lifetime: [8, 15], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xE8C24A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "dance_wave", bind: "source", fit: "body", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [9, 15], size: [0.26, 0.6], sizeMode: "sin",
                    color: 0xFFF0C8, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        beat: {
            emitters: [
                {
                    name: "beat_note", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/note",
                    trail: { minDistance: 0.26 }, rate: { data: "beats", fallback: 8 },
                    direction: "velocity", speed: [0.02, 0.08], spin: 30,
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xE8C24A, alpha: [0.8, 0], light: "full", maxParticles: 120
                },
                {
                    name: "beat_spark", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    trail: { minDistance: 0.3 }, rate: { data: "beats", fallback: 6 },
                    direction: "velocity", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFF0C8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 90
                }
            ]
        },
        sync: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "sync_target_ring", bind: "target", fit: "body", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.34, 0.85], sizeMode: "sin",
                    color: 0xE8C24A, alpha: [0.6, 0], light: "full", maxParticles: 18
                },
                {
                    name: "sync_source_ring", bind: "source", fit: "body", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.34, 0.85], sizeMode: "sin",
                    color: 0xE8C24A, alpha: [0.6, 0], light: "full", maxParticles: 18
                },
                {
                    name: "sync_target_notes", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "sway", fallback: 8 }, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.06], spin: 20,
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xFFF0C8, alpha: [0.75, 0], light: "full", maxParticles: 70
                },
                {
                    name: "sync_source_notes", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "beats", fallback: 6 }, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.06], spin: 20,
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xFFF0C8, alpha: [0.75, 0], light: "full", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizzle_ring", bind: "source", fit: "body", offset: [0, 0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.42, thickness: 1 },
                    direction: "inward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [10, 16], size: [0.34, 0.1], sizeMode: "sin",
                    color: 0xE8C24A, alpha: [0.5, 0], light: "full", maxParticles: 16
                },
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

WorldCombatParticles.scene("world_combat:move_entrainment", 1, EntrainmentSceneDefinition);
