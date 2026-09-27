const LastRespectsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kneel: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "grave_wisps", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "ghosts", fallback: 3 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.02, 0.08], spin: 6,
                    lifetime: [12, 20], size: [0.2, 0.03],
                    color: 0x9FE8D0, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "grave_seam", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 10, shape: { kind: "ring", radius: 0.55, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0x2E2440, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        march: {
            exit: { stop: 0, drain: 12 },
            emitters: [
                { name: "front", bind: "projectile", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring", rate: 8,
                    shape: { kind: "ring", radius: { data: "width", fallback: 0.5 } },
                    speed: 0, lifetime: 4, size: [0.1, 0.05], color: 0x6BC8B0, alpha: [0.4, 0], light: "world" }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xE8FFF6, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "wisp_burst", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "ghosts", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24], spin: 8,
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0x9FE8D0, alpha: [0.9, 0], light: "full", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.18, 0.03],
                    color: 0x6BC8B0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lastrespects", 1, LastRespectsDefinition);

/**
 * 鬼影队列：服务端每刻给出弹后实际排布点（`data.path`），客户端按固定数量各画一枚 wisp 贴图。
 * 数量就是 `data.path` 的点数，不是发射速率；没有粒子生灭或额外实体成本。弹体消失后不再有更新，
 * 随托管效果释放一起清理。
 */
const LastRespectsWisp = "cobblemon:particle/generic/fire/wisp";
function lastrespectsNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
WorldCombatClient.scene("world_combat:move_lastrespects_ghosts", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle || data.moment !== "march" || !Array.isArray(data.path)) return;
    const path: any[] = data.path;
    const clock = frame.serverTick();
    for (let index = 0; index < path.length; index++) {
        const vertex = path[index];
        if (!Array.isArray(vertex) || vertex.length < 3) continue;
        const x = lastrespectsNumber(vertex[0], 0), y = lastrespectsNumber(vertex[1], 0), z = lastrespectsNumber(vertex[2], 0);
        const phase = clock * 0.12 + index * 0.85;
        const fade = Math.max(0.45, 1 - index / Math.max(4, path.length));
        const alpha = Math.round(200 * fade + Math.sin(phase) * 30);
        frame.sprite(LastRespectsWisp, x, y + 0.12 + Math.sin(phase) * 0.05, z,
            0.22 + 0.03 * fade, Math.sin(phase * 0.6) * 12,
            (Math.max(0, Math.min(255, alpha)) << 24 | 0x9FE8D0) | 0,
            Math.floor(clock * 0.3 + index) % 11, true);
    }
});
