/**
 * 魂舞烈音爆 / clangoroussoul 的客户端表现。
 *
 * 一句话：脚下先聚起一圈低沉的声纹 → 每一拍从身上荡开一圈越唱越亮的声波、音符合着往上飘 →
 * 唱满的最后一拍换成更大更亮的金紫色爆发。
 * 色相家族：深紫 0x7A5AC0 为主体，青白 0xCFE0FF 作为声波的细节，金色 0xE8C860 只出现在唱满那一拍。
 * 拍子：起（charge 0–12t）→ 击（beat 每拍 8–20t，最后一拍 climax）→ 收（climax 余韵）。
 * 范围：所有的环都以施法者为中心荡开；半径按 `data.scale`（声波半径 / 4）画出，玩家一眼看到声音传到哪。
 * 运动：环由内向外扩散并变淡，音符与光点上浮；每一拍都比上一拍更亮。
 * 数：`data.intensity`（拍序 / 总拍数）抬高每一拍的环亮度与数量——几拍就是画面里荡出几圈，越往后越亮；
 *     唱满的 moment 由服务端直接切换，画面自己读得出「有没有唱满」。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ClangorousSoulDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "charge_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 14, shape: { kind: "ring", radius: 1.1 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.4, 0.12],
                    color: 0x7A5AC0, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "charge_motes", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xCFE0FF, alpha: [0.6, 0], light: "full", maxParticles: 44
                }
            ]
        },
        beat: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "wave_ring", bind: "source", offset: [0, 0.08, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.5, 0.14], sizeMode: "index",
                    color: 0x7A5AC0, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "wave_dust", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xCFE0FF, alpha: [0.5, 0], gravity: 0.02, drag: 0.9, light: "world", maxParticles: 110
                },
                {
                    name: "wave_notes", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0xD8C8FF, alpha: [0.7, 0], alphaMode: "sin", light: "full", maxParticles: 40
                }
            ]
        },
        climax: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "climax_ring", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 34 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [12, 20], size: [0.7, 0.2], sizeMode: "index",
                    color: 0xE8C860, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "climax_burst", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 70 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 200
                },
                {
                    name: "climax_notes", bind: "source", offset: [0, 0.8, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 26], size: [0.26, 0.08], sizeMode: "sin",
                    color: 0xFFE9A8, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "climax_haze", bind: "source", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "ring", radius: 1.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 32], size: [0.3, 0.08],
                    color: 0x4A3A70, alpha: [0.25, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_clangoroussoul", 1, ClangorousSoulDefinition);
