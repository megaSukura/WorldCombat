/**
 * 回声 / echoedvoice 的客户端表现。
 *
 * 一句话：施法者吸气、声点在喉头收成环 → 一声瞬时唱出、声音沿这条线同时亮起 → 命中处一层层声环荡开，
 *   层数越多环越多越亮；没命中就在尽头散成一点残响。
 * 色相家族：清冷的青白（0x8FD8FF / 0xDCF4FF）为主体，近白只给命中核心；与轮唱的暖金分开，一眼能认出「这是回声」。
 * 拍子：起 inhale（吸气聚声）→ 唱 release（声音瞬时亮起，不宣称传播速度）→ 击 impact（层层声环荡开）→ 散 miss。
 * 范围：release 用与判定同一起止 `data.path` 画声音走的那条线；impact 的声环按 `data.scale`（声环半径 / 0.9）收束。
 * 运动：命中的声环一圈圈向外荡；声音本身瞬发，release 的声点只沿 path 亮一下，不按声速穿行。
 * 数：impact 的声环条数绑定 `data.layer`（当前回声层数），声点数绑定 `data.motes`（特攻与等级换算）。
 * 余韵：真实回声载体上剩余层数由 custom scene `world_combat:move_echoedvoice_layers` 画固定数量的稀疏声环，临近结束淡出。
 */
const EchoedvoiceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "inhale_draw", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FD8FF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "inhale_ring", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 6, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.24, 0.08], sizeMode: "linear",
                    color: 0xDCF4FF, alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        },
        release: {
            duration: 28,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "release_wave", bind: "path", fit: "none", offset: [0, 0.65, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "motes", fallback: 8 }, at: 0 },
                    rate: 20, direction: "shape", speed: [0.02, 0.08], spread: 10,
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8FD8FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "release_streak", bind: "path", fit: "none", offset: [0, 0.65, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "motes", fallback: 6 }, at: 0 },
                    rate: 16, direction: "shape", speed: [0.02, 0.06],
                    lifetime: [6, 11], size: [0.14, 0.02],
                    color: 0xDCF4FF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "release_pulse", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, repeats: { data: "layer", fallback: 1 }, interval: 4 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.28, 0.7], sizeMode: "linear",
                    color: 0x8FD8FF, alpha: [0.45, 0], light: "full", maxParticles: 20
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact_rings", bind: "target", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, repeats: { data: "layer", fallback: 1 }, interval: 4 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.3, { data: "scale", fallback: 1 }], sizeMode: "linear",
                    color: 0x8FD8FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "impact_spark", bind: "target", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 15], size: [0.11, 0.02],
                    color: 0xDCF4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "impact_core", bind: "target", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 6
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "miss_ring", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.5], sizeMode: "linear",
                    color: 0x6FA8C8, alpha: [0.45, 0], light: "world", maxParticles: 6
                },
                {
                    name: "miss_mote", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.04, drag: 0.95,
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0x8FD8FF, alpha: [0.5, 0], light: "world", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_echoedvoice", 1, EchoedvoiceDefinition);

/**
 * 回声余韵：在真实回声载体身上，按剩余的层数画固定数量的稀疏小环，层层相叠，临近结束淡出。
 * 数量直接来自服务端标记的 data.layer；不生成粒子或实体，标记被清除时随之消失。
 */
const EchoedvoiceLayerTexture = "cobblemon:particle/generic/ring/smallring";
function echoedvoiceLayerNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
WorldCombatClient.scene("world_combat:move_echoedvoice_layers", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.moment !== "layers") return;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (!anchor) return;
    const layer = Math.max(0, Math.min(5, Math.round(echoedvoiceLayerNumber(data.layer, 1))));
    if (!layer) return;
    const duration = Math.max(1, echoedvoiceLayerNumber(data.duration, 120));
    const start = echoedvoiceLayerNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const fade = Math.min(1, Math.max(0, (duration - age) / 40));
    if (fade <= 0) return;
    const alpha = Math.round(200 * fade);
    const height = anchor.height > 0 ? anchor.height : 1.4;
    for (let i = 0; i < layer; i++) {
        const angle = i * 2.399963 + frame.serverTick() * 0.02;
        const radius = 0.18 + 0.06 * (i % 2);
        const bob = Math.sin(frame.serverTick() * 0.15 + i) * 0.03;
        frame.sprite(EchoedvoiceLayerTexture,
            anchor.x + Math.cos(angle) * radius,
            anchor.y + height * 0.55 + bob + i * 0.05,
            anchor.z + Math.sin(angle) * radius,
            0.16, 0, (alpha << 24 | 0xBFEBFF) | 0, i % 3, true);
    }
});
