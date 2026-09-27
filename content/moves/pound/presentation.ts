/**
 * 拍击 / pound 的客户端表现。
 *
 * 一句话：重拍式先在身体前方短抬一下掌（自定义场景画出的真实身前动作）→ 抬手在身前扫出一道近白钝击的短扇面
 *   （它就是判定范围），掌心带起一圈细尘；拍到谁就在谁身上炸开一小撮近白碎屑，抬手与收手都极快。
 * 色相家族：近白钝击（impact_normal）为主，细尘用暖米（tinydust）；单一色相，没有饱和色。
 * 拍子：起 raise（重拍式抬掌，快拍式没有，由 move_pound_raise 自定义场景承担）→ 扫 swat（扇面 + 外缘掠线）
 *   → 击 hit（命中处碎屑）/ 空 whiff。
 * 范围：swat 的 polygon 沿 `data.path`（施法者到弧缘的扇形顶点）填出扇面，那道扇面就是打到哪块区域。
 * 运动：外缘 polyline 沿同一组顶点从一侧扫到另一侧，读得出「一巴掌扫过去」；命中碎屑沿法线向外炸开。
 * 数：外缘颗粒数绑 `data.edge`（张角 / 12），命中碎屑数绑 `data.count`（物攻派生的 crumble），
 *     强度绑 `data.intensity`（本拍威力 / 44）——画面里的数量与强度都来自机制。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const PoundDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        swat: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fan_area", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.12], spread: 30,
                    lifetime: [6, 12], size: [0.08, 0.02], sizeMode: "index",
                    color: 0xF0E6CE, alpha: [0.34, 0], light: "world", maxParticles: 90
                },
                {
                    name: "fan_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "edge", fallback: 8 } },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.05, 0.16], spread: 24,
                    lifetime: [4, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 48
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "knock", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.06, 0.2],
                    lifetime: [4, 8], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "grit", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.03, drag: 0.93,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0xC7A97B, alpha: [0.6, 0], light: "world", maxParticles: 70
                }
            ]
        },
        whiff: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.02, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "arc", radius: 0.5, arcDegrees: 140 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [5, 10], size: [0.07, 0.02],
                    color: 0xDCCFB4, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pound", 1, PoundDefinition);

/**
 * 重拍起手的抬掌：服务端只发一次，带上真实身体朝向、起手长度与起始刻；客户端据 serverTick 让掌从身前低位
 * 抬到胸口，读得出「先把手抬起来」而不是起点撒一把尘。固定两节掌形加三点脚尘，无粒子生灭或额外实体。
 */
const PoundFist = "cobblemon:particle/generic/fist";
const PoundDust = "cobblemon:particle/generic/tinydust";

function poundVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

function poundNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

WorldCombatClient.scene("world_combat:move_pound_raise", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    let x = entry.position[0], y = entry.position[1], z = entry.position[2], height = 1.4;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; height = Math.max(0.5, anchor.height); }
    const direction = poundVector(data.direction, [0, 0, 1]);
    const flat = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);
    const fx = flat > 1e-4 ? direction[0] / flat : 0, fz = flat > 1e-4 ? direction[2] / flat : 1;
    const start = poundNumber(data.start, frame.serverTick());
    const windup = Math.max(1, poundNumber(data.windup, 6));
    if (frame.serverTick() > start + windup + 2) return;
    const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / windup));
    const front = Math.min(0.95, 0.32 + height * 0.24);
    const px = x + fx * front, pz = z + fz * front;
    const lowY = y + height * 0.28, highY = y + height * 0.72;
    const palmY = lowY + (highY - lowY) * t;
    const pulse = Math.floor(frame.serverTick() * 0.4) % 5;
    frame.sprite(PoundFist, px - fx * 0.16, lowY + (palmY - lowY) * 0.5, pz - fz * 0.16,
        0.2 + 0.06 * t, 0, 0xE6DCC6C0 | 0, pulse, true);
    frame.sprite(PoundFist, px, palmY, pz, 0.3 + 0.12 * t, 0,
        (Math.round((0.55 + 0.45 * t) * 255) << 24 | 0xFFF6E0) | 0, pulse, true);
    for (let i = 0; i < 3; i++) {
        const angle = i * 2.094 + 0.6;
        const alpha = Math.round((0.35 + 0.3 * t) * 255);
        frame.sprite(PoundDust, x + Math.cos(angle) * 0.3, y + 0.06 + 0.22 * t, z + Math.sin(angle) * 0.3,
            0.08, 0, (alpha << 24 | 0xC7A97B) | 0, 0, false);
    }
});
