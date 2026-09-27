/**
 * 热风 / heatwave 的客户端表现。
 *
 * 一句话：施法者嗓子与胸前先透出一层热光、周围空气发亮，随后一道扇形热浪沿身前水平面从身体整片推出去，
 *   热浪里夹着细小的火星与卷起的尘，被扫到的人身上炸开一圈火；推到最后余热与尘慢慢散。
 * 色相家族：热浪的橙（0xFF8A3C）与近白的热芯（0xFFE2B0）为主体，卷起的暖灰尘（0xC0A070）衬托。
 * 拍子：起 inhale（焐气）→ 吹 wave（扇面逐格推开）→ 击 hit（扫到目标）→ 散 dissipate（余热散去）。
 * 范围：wave 沿服务端传的 `data.path`（被墙截短、与判定同一组顶点）用 polygon 填出面，画面推到哪就烧到哪；
 *   front 自定义场景用一条稀疏稳定线描出这格前缘（外弧），墙截断处画面与判定一致，粒子只做陪衬。
 * 运动：扇面每刻由服务端的 `data.reach` 决定外缘位置，粒子沿扇形向前、向外；命中者沿离身方向被推。
 * 数：wave 的密度绑定 `data.embers`（特攻与速度换算），hit 的火量绑定 `data.count`（威力派生），
 *   强度绑定 `data.intensity`（威力派生）。
 */
const HeatwaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 16, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 11], size: [0.22, 0.05],
                    color: 0xFFE2B0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.15, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.4],
                    color: 0xC0A070, alpha: [0.25, 0], light: "world", maxParticles: 24
                }
            ]
        },
        wave: {
            duration: 0,
            emitters: [
                {
                    name: "front", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "embers", fallback: 30 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.13], spread: 12,
                    lifetime: [5, 10], size: [0.28, 0.05],
                    color: 0xFF8A3C, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 200
                },
                {
                    name: "core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "embers", fallback: 18 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.02, 0.09], spread: 8,
                    lifetime: [5, 9], size: [0.22, 0.04],
                    color: 0xFFE2B0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "embers", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 20 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [6, 14], size: [0.07, 0.01],
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", maxParticles: 200
                },
                {
                    name: "dust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 22], size: [0.3, 0.5],
                    color: 0xC0A070, alpha: [0.22, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 46
                },
                {
                    name: "scorch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [10, 20], size: [0.2, 0.04],
                    color: 0xFF8A3C, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        dissipate: {
            duration: 24,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "dying_dust", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 26], size: [0.36, 0.6],
                    color: 0x8A7A62, alpha: [0.25, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_heatwave", 1, HeatwaveDefinition);

function heatwaveNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function heatwavePoint(value: any): number[] | null {
    if (Array.isArray(value) && value.length === 3 && value.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return null;
}

function heatwavePoints(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const points: number[][] = [];
    for (let i = 0; i < value.length; i++) {
        const entry = heatwavePoint(value[i]);
        if (entry) points.push(entry);
    }
    return points;
}

/**
 * 当前前缘的稀疏稳定线：沿服务端传的 `data.edge`（外弧、已被真实墙面截短）逐段连线，两侧再收回到
 * `data.origin`，并在弧上稀疏地点几颗固定贴图。数据与判定同源，墙截断在画面与命中上一致；
 * 固定数量、固定路径，不额外生成粒子或实体。
 */
WorldCombatClient.scene("world_combat:move_heatwave_front", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const edge = heatwavePoints(data.edge);
    if (edge.length < 2) return;
    const intensity = Math.max(0.6, Math.min(2.4, heatwaveNumber(data.intensity, 1)));
    const progress = Math.max(0, Math.min(1, heatwaveNumber(data.progress, 0)));
    const alpha = Math.round((150 - 60 * progress) * Math.min(1.4, intensity));
    for (let i = 1; i < edge.length; i++) {
        const a = edge[i - 1], b = edge[i];
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], ((alpha << 24) | 0xFF8A3C) | 0);
    }
    const origin = heatwavePoint(data.origin);
    if (origin) {
        frame.line(origin[0], origin[1], origin[2], edge[0][0], edge[0][1], edge[0][2], (0x59FFB347 | 0) | 0);
        frame.line(origin[0], origin[1], origin[2], edge[edge.length - 1][0], edge[edge.length - 1][1], edge[edge.length - 1][2], (0x59FFB347 | 0) | 0);
    }
    const step = edge.length > 8 ? 2 : 1;
    for (let i = 0; i < edge.length; i += step) {
        const at = edge[i];
        frame.sprite("cobblemon:particle/generic/fire/flame", at[0], at[1] + 0.12, at[2],
            0.2 + 0.08 * intensity, 0, 0xFFFFC24A | 0, 0, true);
    }
});

