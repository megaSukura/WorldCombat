/**
 * 胜利之舞 / victorydance 的客户端表现。
 *
 * 一句话：脚边聚起金光、舞者立定行礼 → 每一步把脚步真实踏进地面、从实际踏点荡开一圈金环 → 终拍一顶桂冠
 *   在头顶以冠形线合拢（不是散星换名）；此后只要凯旋还在，头顶就悬着一圈轻冠环，命中延续时轻亮一下。
 * 色相家族：凯旋金 0xFFD75A 为主体，古铜 0xB07A2A 作脚下与余韵，近白 0xFFF3C8 只落在强调层。
 * 拍子：起（salute）→ 踏（stamp，服务端上传实际踏点）→ 立冠（crown 自定义冠形）→ 冠（lit 轻冠环）→ 续（rally）→ 落（fade）。
 * 范围：stamp 的环绑实际踏点、fit none；crown/lit 由自定义场景按真实冠冕半径与头高绘制。
 * 数：冠形点数与环密度绑 `data.laurels`（攻防速之和与等级派生），拍数绑 `data.beats`、第几拍绑 `data.index`，
 *   续冠强度绑 `data.intensity`。越强的个体画面里的金环越密。
 * 归属：lit 轻冠环通过 `WorldFeedback.onEffect` 绑在凯旋载体窗口上，窗口自然到期、刷新或被 /effect 清除时一并收走。
 */
const VictoryDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        salute: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "salute_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [9, 15], size: [0.34, 0.09],
                    color: 0xFFD75A, alpha: [0.5, 0], light: "full", maxParticles: 34
                },
                {
                    name: "salute_mote", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xFFF3C8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        stamp: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stamp_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.36, 0.8], sizeMode: "index",
                    color: 0xFFD75A, alpha: [0.65, 0], light: "full", maxParticles: 18
                },
                {
                    name: "stamp_beat", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "index", fallback: 1 } },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [8, 14], size: [0.07, 0.02], sizeMode: "sin",
                    color: 0xFFF3C8, alpha: [0.6, 0], light: "full", maxParticles: 12
                },
                {
                    name: "stamp_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "laurels", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.1], gravity: 0.03,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xB07A2A, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        rally: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "rally_ring", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [12, 20], size: [0.45, 0.95], sizeMode: "index",
                    color: 0xFFD75A, alpha: [0.8, 0], light: "full", maxParticles: 22
                },
                {
                    name: "rally_star", bind: "source", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: { data: "crown", fallback: 1.2 } },
                    direction: "up", speed: [0.05, 0.16], spin: 18,
                    lifetime: [12, 22], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFF3C8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        fade: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "fall_laurel", bind: "source", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "down", speed: [0.02, 0.06], gravity: 0.02,
                    lifetime: [16, 28], size: [0.08, 0.01],
                    color: 0xB07A2A, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "last_halo", bind: "source", offset: [0, 0.85, 0], height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [14, 26], size: [0.06, 0.01],
                    color: 0xFFF3C8, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_victorydance", 1, VictoryDanceDefinition);

/**
 * 冠形场景：终拍以少量明确的冠形线合拢（一个冠带环 + 若干上挑冠尖），窗口期挂一圈更轻的冠环。
 * 位置取自锚点实体的插值位置与身高，半径与冠尖数取本招实际机制值——不是散星换名，也不是统一光柱。
 */
WorldCombatClient.scene("world_combat:move_victorydance_crown", 1, function (frame) {
    const entry: CombatSceneEntry<{ moment?: string; start?: number; duration?: number; crown?: number; scale?: number;
        laurels?: number; prongs?: number; lifecycle?: { reason?: string; tick?: number } }> = JSON.parse(frame.data());
    const data = entry.data || {};
    if (entry.lifecycle || data.lifecycle) return;
    const body = JSON.parse(frame.anchor(entry.source));
    const cx = body ? body.x : entry.position[0];
    const cz = body ? body.z : entry.position[2];
    const feet = body ? body.y : entry.position[1] - 0.9;
    const height = body && typeof body.height === "number" ? body.height : 1.4;
    const crown = victorydanceFinite(data.crown, 1.2);
    const prongs = Math.max(4, Math.min(8, Math.round(victorydanceFinite(data.prongs, 6))));
    if (data.moment === "crown") {
        const start = victorydanceFinite(data.start, frame.serverTick());
        const duration = Math.max(1, victorydanceFinite(data.duration, 1));
        const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
        const y = feet + height + 0.1 + (1 - t) * 0.35;
        drawVictoryCrown(frame, cx, y, cz, crown, prongs, 0.7, Math.round(235 * (0.4 + 0.6 * t)), t);
        return;
    }
    const y = feet + height + 0.1;
    drawVictoryCrown(frame, cx, y, cz, crown, prongs, 0.5, 115, 1);
});

/** 冠形线：冠带环 + `prongs` 个上挑冠尖；`rise` 让冠尖在终拍从冠带里合拢升起。 */
function drawVictoryCrown(frame: CombatClientFrame, cx: number, y: number, cz: number, radius: number,
                          prongs: number, spike: number, alpha: number, rise: number): void {
    const band = (Math.max(0, Math.min(255, alpha)) << 24) | 0xFFD75A;
    const tip = (Math.max(0, Math.min(255, alpha)) << 24) | 0xFFF3C8;
    frame.ring(cx, y, cz, radius, band);
    frame.ring(cx, y + 0.02, cz, radius * 0.84, (Math.round(alpha * 0.5) << 24) | 0xFFD75A);
    const height = spike * rise;
    for (let i = 0; i < prongs; i++) {
        const a = i * Math.PI * 2 / prongs;
        const bx = cx + Math.cos(a) * radius, bz = cz + Math.sin(a) * radius;
        const tx = cx + Math.cos(a) * radius * 0.8, tz = cz + Math.sin(a) * radius * 0.8;
        const lx = cx + Math.cos(a - 0.32) * radius * 0.96, lz = cz + Math.sin(a - 0.32) * radius * 0.96;
        const rx = cx + Math.cos(a + 0.32) * radius * 0.96, rz = cz + Math.sin(a + 0.32) * radius * 0.96;
        frame.line(lx, y, lz, tx, y + height, tz, tip);
        frame.line(tx, y + height, tz, rx, y, rz, tip);
    }
}

function victorydanceFinite(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
