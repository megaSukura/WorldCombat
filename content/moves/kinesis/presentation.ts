/**
 * 折弯汤匙 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身前用念力点出一把短直金属汤匙，沿折弯过程一步步把它掰弯；弯到最后一刻，一道靛蓝的目光线
 *   闪向实际目标，在它头顶留下一圈被引开注意的念力。
 *
 * 色相家族：低饱和靛蓝（0x8FA8E0／0x6E7AB8）为主体，近白的钢光（0xC9D4F0）只做汤匙轮廓与念力高光。
 * 层次：手边聚念（起手）→ 汤匙轮廓（custom scene 连续线段沿 data.path 逐步变形）→ 目光线短闪（成功回执）→ 头顶标记（失神）→ 落空暗点 → 余念（持续）。
 * 起击收：gather（举念）→ spoon（折弯）→ gaze（目光线）→ beguile（标记）；被掩体挡住或目标离场走 fizzle（暗一下）。
 * 数：轮廓亮度与勺面高光随 data.glow（折弯进度）增强，成功标记的大小由 data.scale（实际削减级数换算）决定。
 * 汤匙顶点由服务端算出（data.path），客户端不做第二份几何；勺形用固定数量的线段绘制，不靠短命光点堆出稳定形状。
 */
const KinesisDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_spiral", bind: "source", offset: [0, 0.4, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.12], spin: 16,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x8FA8E0, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "gather_glint", bind: "source", offset: [0, 0.4, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.09, 0.01],
                    color: 0xC9D4F0, alpha: [0.75, 0], light: "full", maxParticles: 16
                }
            ]
        },
        gaze: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gaze_line", bind: "path", fit: "none", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "swirl", fallback: 16 } }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [4, 9], size: [0.12, 0.03],
                    color: 0xC9D4F0, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        beguile: {
            duration: 36,
            exit: { stop: 14, drain: 24 },
            emitters: [
                {
                    name: "beguile_swirl", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "swirl", fallback: 18 }, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: 0.36 },
                    direction: "up", speed: [0.02, 0.06], spin: 20,
                    lifetime: [14, 24], size: [0.18, 0.04],
                    color: 0x8FA8E0, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "beguile_ring", bind: "target", offset: [0, 0.3, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.46 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.24, 0.1],
                    color: 0x6E7AB8, alpha: [0.55, 0], light: "full", maxParticles: 60
                },
                {
                    name: "beguile_glint", bind: "target", offset: [0, 0.4, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "swirl", fallback: 14 }, interval: 4, repeats: 3 }, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8FA8E0, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        fizzle: {
            duration: 18,
            emitters: [
                {
                    name: "fizzle_dim", bind: "point", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x6E7AB8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            // duration 0：由服务端每个状态 tick 用 keep 续期，载体清除后就不再续，随最后一个消息排空，而不再固定 60 刻。
            duration: 0,
            exit: { drain: 26 },
            emitters: [
                {
                    name: "linger_thought", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 4, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03], spin: 12,
                    lifetime: [18, 28], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x8FA8E0, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_kinesis", 1, KinesisDefinition);

/**
 * 汤匙主体：服务端每 2 刻发一次折弯进度对应的完整顶点（data.path），客户端沿相邻顶点画连续线段，
 *   勺柄用钢光、勺碗用靛蓝描边，勺面中心再点一颗亮光。固定数量的 line/sprite，无粒子生灭或额外实体，
 *   勺形随 data.glow 变亮、随 data.path 变形，因此「勺」一眼可读、且随朝向能看出弯曲。
 */
const KinesisSpoonGrip = "cobblemon:particle/generic/sparkle/mediumsparkle";
WorldCombatClient.scene("world_combat:move_kinesis_spoon", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path: number[][] = Array.isArray(data.path) ? data.path : [];
    if (path.length < 2) return;
    const glow = typeof data.glow === "number" && isFinite(data.glow) ? Math.max(0, Math.min(1, data.glow)) : 0.3;
    const alpha = Math.round((0.5 + glow * 0.5) * 255);
    const steel = (alpha << 24 | 0xC9D4F0) | 0;
    const edge = (Math.round(alpha * 0.8) << 24 | 0x8FA8E0) | 0;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        if (!isFinite(a[0]) || !isFinite(a[1]) || !isFinite(a[2]) || !isFinite(b[0]) || !isFinite(b[1]) || !isFinite(b[2])) continue;
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], i <= 5 ? steel : edge);
    }
    let cx = 0, cy = 0, cz = 0, n = 0;
    for (let j = 5; j < path.length; j++) {
        const p = path[j];
        if (!isFinite(p[0]) || !isFinite(p[1]) || !isFinite(p[2])) continue;
        cx += p[0]; cy += p[1]; cz += p[2]; n++;
    }
    if (n > 0) frame.sprite(KinesisSpoonGrip, cx / n, cy / n, cz / n, 0.16 + glow * 0.12, 0,
        (Math.round((0.35 + glow * 0.55) * 255) << 24 | 0xC9D4F0) | 0, Math.floor(frame.serverTick() * 0.6) % 7, true);
});
