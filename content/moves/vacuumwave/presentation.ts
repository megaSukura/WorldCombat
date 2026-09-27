/**
 * 真空波 / vacuumwave 的客户端表现。
 *
 * 一句话：双拳抡起、空气朝身前收拢，随后一道低压空气波贴着身体高度向前推过一条走廊，把新扫过那一段的尘土
 *   与碎屑朝施法者抽回来；被抽到的人身上爆开一记格斗冲击、并顺着回吸方向滑向施法者。推空时只在尽头散成一阵风。
 * 色相家族：青白冷风一族（0xCFE8E0 主体、0xEAF6F2 高光、0x9FB8B0 中性气流），冲击点借格斗的暖白点缀。
 * 拍子：起 charge（收气）→ 推 wave（当刻真实厚带）＋ lane（前沿短预告）→ 击 suck（回吸与冲击）→ 收 whiff。
 * 范围：wave 用 `data.path`（与服务端本刻 `WorldGeometry.bodyPolygon` 同一组盖住厚带的四个顶点）铺满当刻厚带，
 *   lane 用紧随前沿的一小段 `data.path` 做短预告；判定与表现共用端点，波后空出来的地方不再有害。
 * 运动：wave 的厚带随真实前沿逐刻推进；波前短横弧由自定义场景 `world_combat:move_vacuumwave_front` 按
 *   `data.arc`（真实半宽弧）逐帧画线，不再用统一环圈代替主体；suck 的尘土沿 `data.direction`（目标→施法者）
 *   回卷，数量按 `data.suck`（服务端实际位移换算）发射——拉不动时 `suck` 为 0，只留冲击环。
 * 数：wave 与 lane 的气流量绑定 `data.gust`（特攻与速度换算），尺度绑定 `data.scale`（波面半宽换算），
 *   亮暗绑定 `data.intensity`（波威力换算）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const VacuumwaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 2 },
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "charge_intake", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 30, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xCFE8E0, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "charge_ring", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [7, 13], size: [0.3, 0.55],
                    color: 0xEAF6F2, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        lane: {
            duration: 60,
            exit: { stop: 60, drain: 14 },
            emitters: [
                {
                    name: "lane_preview", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polygon" },
                    rate: { data: "gust", fallback: 14 }, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xCFE8E0, alpha: [0.10, 0], light: "world", maxParticles: 50
                },
                {
                    name: "lane_edge", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "polyline", closed: true },
                    rate: 16, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x9FB8B0, alpha: [0.2, 0], light: "world", maxParticles: 40
                }
            ]
        },
        wave: {
            duration: 60,
            exit: { stop: 60, drain: 14 },
            emitters: [
                {
                    name: "wave_fill", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polygon" },
                    rate: { data: "gust", fallback: 18 }, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xCFE8E0, alpha: [0.22, 0], light: "world", maxParticles: 80
                },
                {
                    name: "wave_dust", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: 12, direction: "inward", speed: [0.05, 0.18],
                    lifetime: [5, 10], size: [0.07, 0.02], sizeMode: "index",
                    color: 0x9FB8B0, alpha: [0.35, 0], light: "world", maxParticles: 45
                },
                {
                    name: "wave_gather", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "gust", fallback: 18 }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.1, 0.3],
                    lifetime: [4, 9], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xEAF6F2, alpha: [0.5, 0], light: "full", maxParticles: 50
                }
            ]
        },
        suck: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "suck_back", bind: "point", fit: "none", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "suck", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: [{ data: "direction.0", fallback: -1 }, { data: "direction.1", fallback: 0 }, { data: "direction.2", fallback: 0 }],
                    speed: [0.14, 0.44], spread: 18,
                    lifetime: [6, 12], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xCFE8E0, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "suck_impact", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.6, 1.3], sizeMode: "index",
                    color: 0xEAF6F2, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff_puff", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "gust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x9FB8B0, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vacuumwave", 1, VacuumwaveDefinition);

/**
 * 波前短横弧与厚带轮廓（自定义客户端场景，只画线，不生成粒子或实体）：
 * 服务端逐刻给出当刻真实厚带的四个顶点 `path` 与按真实半宽算出的波前弧 `arc`，这里直接连成线。
 * wave 画厚带轮廓 + 明亮前弧，lane 画紧随前沿的短预告轮廓；随动作结束时服务端发 lifecycle 收束。
 */
WorldCombatClient.scene("world_combat:move_vacuumwave_front", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    const path = Array.isArray(data.path) ? data.path : null;
    if (!path || path.length < 2) return;
    const intensity = typeof data.intensity === "number" && isFinite(data.intensity) ? data.intensity : 1;
    const alpha = Math.max(40, Math.min(220, Math.round(120 * intensity)));
    function outline(points: any[], color: number): void {
        for (let index = 0; index < points.length; index++) {
            const a = points[index], b = points[(index + 1) % points.length];
            if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 3 || b.length !== 3) continue;
            frame.line(a[0], a[1], a[2], b[0], b[1], b[2], color);
        }
    }
    if (data.moment === "lane") {
        outline(path, ((Math.round(alpha * 0.5) << 24) | 0x9FB8B0) | 0);
        return;
    }
    if (data.moment !== "wave") return;
    outline(path, ((alpha << 24) | 0xCFE8E0) | 0);
    const arc = Array.isArray(data.arc) ? data.arc : null;
    if (!arc || arc.length < 2) return;
    const bright = ((Math.min(255, alpha + 60) << 24) | 0xEAF6F2) | 0;
    for (let index = 0; index < arc.length - 1; index++) {
        const a = arc[index], b = arc[index + 1];
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 3 || b.length !== 3) continue;
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], bright);
    }
});
