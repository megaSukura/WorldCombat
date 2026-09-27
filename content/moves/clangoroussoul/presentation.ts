/**
 * 魂舞烈音爆 / clangoroussoul 的客户端表现。
 *
 * 一句话：脚下先聚起一圈低沉的声纹 → 每一拍从身上荡开一圈越唱越亮的声波、音符合着往上飘、身周五个方向各亮起一枚符号（亮的是这一拍真的抬起来的那几项）→
 *   唱满的最后一拍换成更大更亮的金紫色爆发。
 * 色相家族：深紫 0x7A5AC0 为主体，青白 0xCFE0FF 作为声波的细节，金色 0xE8C860 只出现在唱满那一拍。
 * 拍子：起（charge 0–12t）→ 击（beat 每拍 8–20t，最后一拍 climax）→ 收（climax 余韵）。
 * 范围：声波环以服务端给的真实声波半径 `data.radius` 按世界单位画出（`fit: "world"`），只作表现，不造成伤害或位移。
 * 运动：环由内向外扩散并变淡，音符与光点上浮；每一拍都比上一拍更亮。
 * 数：`data.intensity`（拍序 / 总拍数）抬高每一拍的环亮度与数量；`data.lit`／`data.raised`／`data.gained` 是五项真实 delta，
 *   `world_combat:move_clangoroussoul_sigils` 自定义场景据此在身周摆出固定的五向符号。
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
                    name: "wave_ring", bind: "source", offset: [0, 0.08, 0], height: 0.08, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.5 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.5, 0.14], sizeMode: "index",
                    color: 0x7A5AC0, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "wave_dust", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.5 } },
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
                    name: "climax_ring", bind: "source", offset: [0, 0.1, 0], height: 0.1, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 34 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.5 } },
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
                    name: "climax_haze", bind: "source", offset: [0, 0.05, 0], fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "ring", radius: { data: "radius", fallback: 2.5 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 32], size: [0.3, 0.08],
                    color: 0x4A3A70, alpha: [0.25, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_clangoroussoul", 1, ClangorousSoulDefinition);

/**
 * 五向符号：每拍在施法者身周按固定五个方向摆出五枚音符，`data.lit` 为这一拍五项的真实 delta；
 * 亮起来的正是真的提升的那几项，符号数量固定、位置由身体朝向与身高给出，不虚构额外图形。
 */
WorldCombatClient.scene("world_combat:move_clangoroussoul_sigils", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const body = JSON.parse(frame.anchor(entry.source));
    if (!body) return;
    const cx = Number(body.x), cy = Number(body.y), cz = Number(body.z);
    const height = typeof body.height === "number" ? body.height : 1.4;
    const yaw = typeof body.yaw === "number" ? body.yaw * Math.PI / 180 : 0;
    const start = typeof data.start === "number" ? data.start : frame.serverTick();
    const duration = Math.max(1, typeof data.duration === "number" ? data.duration : 1);
    const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    const lit: any[] = Array.isArray(data.lit) ? data.lit : [0, 0, 0, 0, 0];
    const radius = 0.5 + 0.15 * t;
    const alpha = Math.round(150 * (1 - t) + 60);
    for (let index = 0; index < 5; index++) {
        const angle = yaw + index * Math.PI * 2 / 5;
        const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius;
        const y = cy + height * 0.6 + 0.1 * Math.sin((t + index * 0.2) * Math.PI);
        const on = lit[index] ? 1 : 0;
        const colour = on ? ((Math.min(255, alpha) << 24) | 0xD8C8FF) | 0 : ((Math.round(alpha * 0.3) << 24) | 0x7A5AC0) | 0;
        frame.sprite("cobblemon:particle/generic/note", x, y, z, on ? 0.34 : 0.22, index * 18, colour, 0, true);
    }
});
