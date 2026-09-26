/**
 * Client definition for Assist.
 *
 * 一句话：一声呼唤从身体向四周铺开一圈青绿回声与伙伴印记，覆盖到呼唤半径（data.radius），同时按服务端
 * 查到的候选伙伴拉出稀疏连线（world_combat:move_assist_thread 自定义场景）；选定后一条白色传递线从被选中的
 * 伙伴闪到自身，借来的招式随即接手。印记数量随施法者的特攻（data.bonds）增长，落成爆发的数量取实际候选池
 * （data.pool）。
 *
 * 色相家族：青绿 0x5FD0A0 与淡青 0x8FE8C8（伙伴），白色只用在借来招式落成的一闪与传递线。
 * 拍子：call 0–30t（起：环与印记由近及远）→ borrow 0–22t（击：白闪，收：青环与传递线散开）。
 * 贴图与帧尺寸来自 particle_types.txt。呼唤环绑 point，按机制半径铺开，不随体型缩放。
 */
const assistDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        call: {
            duration: 30,
            exit: { stop: 24, drain: 24 },
            emitters: [
                {
                    name: "call_ring", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 20, interval: 6, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 8 } },
                    direction: "outward", speed: [0.35, 0.55], spread: 2,
                    lifetime: [16, 22], size: [0.3, 0.08],
                    color: 0x5FD0A0, alpha: [0.55, 0], light: "full", maxParticles: 120
                },
                {
                    name: "call_motes", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "bonds", fallback: 6 }, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 8 } },
                    direction: "outward", speed: [0.18, 0.34], spread: 8,
                    lifetime: [12, 18], size: [0.14, 0.02],
                    color: 0x8FE8C8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "call_marks", bind: "point", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/request/icon_team",
                    burst: { count: 3, interval: 7, repeats: 2, at: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 8 } },
                    direction: "up", speed: [0.04, 0.1], spread: 10,
                    lifetime: [20, 28], size: [0.42, 0.24], sizeMode: "sin",
                    alpha: [0.9, 0], light: "full", maxParticles: 12
                },
                {
                    name: "call_floor", bind: "source", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 14, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: 0.85 },
                    direction: "outward", speed: [0.2, 0.35],
                    lifetime: [14, 20], size: [0.24, 0.06],
                    color: 0x5FD0A0, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        borrow: {
            duration: 22,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "borrow_burst", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "pool", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "shape", speed: [0.2, 0.5], spread: 12,
                    lifetime: [12, 20], size: [0.28, 0.03],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "borrow_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.65 },
                    direction: "outward", speed: [0.3, 0.5], spread: 2,
                    lifetime: [14, 20], size: [0.3, 0.06],
                    color: 0x8FE8C8, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "borrow_thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "pool", fallback: 4 }, trail: { minDistance: 0.25 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.14],
                    lifetime: [7, 12], size: [0.12, 0.03],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_assist", 1, assistDefinition);

/**
 * Sparse candidate threads for Assist. The server lists the partner refs it actually queried; the callback draws
 * one dim line per candidate and the real call radius, then goes quiet once the borrow is settled.
 */
WorldCombatClient.scene("world_combat:move_assist_thread", 1, function (frame) {
    const entry: CombatSceneEntry<{ phase?: string; radius?: number; candidates?: string[]; provider?: string }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.phase === "handover") return;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (!anchor) return;
    const radius = typeof data.radius === "number" ? data.radius : 0;
    if (radius > 0) frame.ring(anchor.x, anchor.y + 0.1, anchor.z, radius, 0x885FD0A0);
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    for (let i = 0; i < candidates.length; i++) {
        const other = JSON.parse(frame.anchor(candidates[i]));
        if (!other) continue;
        const colour = candidates[i] === data.provider ? 0xFFFFFFFF : 0xAA5FD0A0;
        frame.line(anchor.x, anchor.y + 0.55, anchor.z, other.x, other.y + 0.55, other.z, colour);
    }
});
