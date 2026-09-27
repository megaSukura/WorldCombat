/**
 * Client definition for Assist.
 *
 * 一句话：一声呼唤在身体四周亮起一圈固定的青绿边界（半径 = data.radius），边界上按候选伙伴拉出稀疏连线
 * （world_combat:move_assist_thread 自定义场景）；选定后那一条伙伴线收亮成白色、一颗亮点沿真实连线送向自身，
 * 借来的招式随即接手。印记数量随施法者的特攻（data.bonds）增长，落成爆发的数量取实际候选池（data.pool）。
 *
 * 色相家族：青绿 0x5FD0A0 与淡青 0x8FE8C8（伙伴），白色只用在借来招式落成的一闪与传递线。
 * 拍子：call 与本次实际呼唤同长（data.call，3–18 刻；起：边界环与印记几乎停在呼唤半径上）→ borrow 0–22t
 * （击：白闪，收：青环散开）。呼唤一结束就交棒，边界环不盖住借来的招式。贴图与帧尺寸来自 particle_types.txt。
 * 呼唤环绑 point，按机制半径铺开，不随体型缩放。
 */
const assistDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        call: {
            duration: { data: "call", fallback: 8 },
            exit: { stop: { data: "call", fallback: 8 }, drain: 24 },
            emitters: [
                {
                    name: "call_ring", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 20, interval: 6, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 8 } },
                    direction: "outward", speed: [0.0, 0.04], spread: 2,
                    lifetime: [16, 22], size: [0.3, 0.08],
                    color: 0x5FD0A0, alpha: [0.55, 0], light: "full", maxParticles: 120
                },
                {
                    name: "call_motes", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "bonds", fallback: 6 }, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 8 } },
                    direction: "outward", speed: [0.02, 0.07], spread: 8,
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
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_assist", 1, assistDefinition);

/**
 * Assist threads. The server lists the partner refs it actually queried (clear line, inside the call radius): the
 * callback draws the fixed boundary ring and one dim line per candidate. On handover the same entry becomes a single
 * bright provider→caller line with one mote travelling along the real segment, so the transfer reads directionally.
 */
WorldCombatClient.scene("world_combat:move_assist_thread", 1, function (frame) {
    const entry: CombatSceneEntry<{ phase?: string; radius?: number; candidates?: string[]; provider?: string;
        path?: string[]; start?: number; duration?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (!anchor) return;
    if (data.phase === "handover") {
        const provider = Array.isArray(data.path) && data.path.length ? JSON.parse(frame.anchor(data.path[0])) : null;
        if (!provider) return;
        const sx = anchor.x, sy = anchor.y + 0.55, sz = anchor.z;
        const px = provider.x, py = provider.y + 0.55, pz = provider.z;
        frame.line(sx, sy, sz, px, py, pz, 0xFFFFFFFF);
        const start = typeof data.start === "number" ? data.start : frame.serverTick();
        const span = typeof data.duration === "number" && data.duration > 0 ? data.duration : 18;
        const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / span));
        frame.sprite("cobblemon:particle/generic/sparkle/glowingsparkle_cyan",
            px + (sx - px) * t, py + (sy - py) * t, pz + (sz - pz) * t, 0.36, 0, 0xFFFFFFFF, 0, true);
        return;
    }
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
