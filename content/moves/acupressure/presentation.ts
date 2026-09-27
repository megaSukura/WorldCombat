/**
 * 点穴 的客户端表现（自定义场景，固定数量图形，不生成粒子或额外实体）。
 *
 * 一句话：施法者探手按到受术者身上的一处穴道——准备时先在候选穴点上亮几枚暗记，真正触达的那一处才炸开一小簇火花，
 *   随后只在那个穴道留一枚缓缓升起的小光点，通畅结束或提前清除时随窗口一起收。
 *
 * 位置与朝向：穴点由服务端给出的 [前, 右, 上] 分量、配合受术者锚点的 bodyYaw 与体型实时换算成世界点，
 *   所以转身、不同体型时穴点都仍贴在受术者身上；锚点缺失时退回载荷里的世界位置。
 * 色相家族：琥珀金（0xE8B45A）为主体，暖白（0xFFE3A0）做高光与指压，深褐（0x8A5A22）做余韵；没有第二个色相。
 * 拍子：seek（探手与候选穴点）→ press（落指炸开）→ flow（穴点微光，随窗口存亡）→ fade（沉落）。
 * 数：火花量绑 motes（速度派生），穴点小环数绑 beats（等级派生），整体尺度绑 scale（实际点穴距离 / 2.0）。
 */
const AcupressureSpark = "cobblemon:particle/generic/status/accessory_spark";
const AcupressureHand = "cobblemon:particle/generic/grab";
const AcupressureHit = "cobblemon:particle/generic/minihit";
const AcupressureRing = "cobblemon:particle/generic/ring/smallring";
const AcupressureGlow = "cobblemon:particle/generic/orb/xsboost";
const AcupressureMote = "cobblemon:particle/generic/tinydust";

function acupressureValue(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

/** 受术者身上的一处穴点：按锚点朝向/体型把 [前, 右, 上] 分量换算成世界点。 */
function acupressureSite(frame: CombatClientFrame, ref: string, f: number, r: number, u: number, fallback: number[]): number[] {
    const raw = ref ? frame.anchor(ref) : null;
    const anchor = raw ? JSON.parse(raw) : null;
    if (anchor) {
        const width = acupressureValue(anchor.width, 0.9) > 0 ? acupressureValue(anchor.width, 0.9) : 0.9;
        const height = acupressureValue(anchor.height, 1.4) > 0 ? acupressureValue(anchor.height, 1.4) : 1.4;
        const yaw = acupressureValue(anchor.bodyYaw, acupressureValue(anchor.yaw, 0)) * Math.PI / 180;
        const fx = -Math.sin(yaw), fz = Math.cos(yaw);
        const rx = -Math.cos(yaw), rz = -Math.sin(yaw);
        const hw = width * 0.5, hh = height * 0.5;
        return [anchor.x + fx * (f * hw) + rx * (r * hw), anchor.y + hh + u * hh, anchor.z + fz * (f * hw) + rz * (r * hw)];
    }
    return fallback.slice();
}

/** 身体中心（脚点 + 半身高）；锚点缺失时用载荷位置。 */
function acupressureCentre(frame: CombatClientFrame, ref: string, fallback: number[]): number[] {
    const raw = ref ? frame.anchor(ref) : null;
    const anchor = raw ? JSON.parse(raw) : null;
    if (anchor) {
        const height = acupressureValue(anchor.height, 1.4) > 0 ? acupressureValue(anchor.height, 1.4) : 1.4;
        return [anchor.x, anchor.y + height * 0.5, anchor.z];
    }
    return fallback;
}

WorldCombatClient.scene("world_combat:move_acupressure", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const moment = String(data.moment || "");

    if (moment === "seek") {
        const ref = String(data.target || "");
        if (!ref) return;
        const start = acupressureValue(data.start, frame.serverTick());
        const duration = Math.max(1, acupressureValue(data.duration, 8));
        const age = Math.max(0, frame.serverTick() - start);
        if (age > duration) return;
        const progress = Math.min(1, age / duration);
        // 候选穴点：暗记一呼一吸，提示这一按可能落在哪些穴道。
        const sites = Array.isArray(data.sites) ? data.sites : [];
        for (let index = 0; index < sites.length; index++) {
            const candidate = sites[index];
            const point = acupressureSite(frame, ref, acupressureValue(candidate.f, 0.4), acupressureValue(candidate.r, 0.2), acupressureValue(candidate.u, 0.2), entry.position);
            const pulse = 0.5 + 0.5 * Math.sin(frame.serverTick() * 0.35 + index * 1.7);
            frame.sprite(AcupressureSpark, point[0], point[1], point[2], 0.10 + 0.05 * pulse, 0,
                ((Math.round(120 + 90 * pulse) << 24) | 0xE8B45A) | 0, 0, true);
        }
        // 探手：手从施法者身前伸向受术者身体中心，越接近完成越贴近。
        const from = acupressureCentre(frame, String(entry.source || ""), entry.position.slice());
        const to = acupressureCentre(frame, ref, entry.position.slice());
        const reach = Math.min(1, progress * 1.25);
        const hx = from[0] + (to[0] - from[0]) * reach;
        const hy = from[1] + (to[1] - from[1]) * reach + 0.1;
        const hz = from[2] + (to[2] - from[2]) * reach;
        const handFrame = Math.max(0, Math.min(12, Math.floor(progress * 13)));
        frame.sprite(AcupressureHand, hx, hy, hz, 0.22, 0, 0xF0FFE3A0 | 0, handFrame, true);
        return;
    }

    const ref = String(data.target || "");
    if (!ref) return;
    const site = acupressureSite(frame, ref, acupressureValue(data.f, 0.4), acupressureValue(data.r, 0.2), acupressureValue(data.u, 0.2), entry.position);
    const start = acupressureValue(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);

    if (moment === "press") {
        if (age > 30) return;
        const scale = Math.max(0.5, Math.min(2, acupressureValue(data.scale, 1)));
        const motes = Math.max(4, Math.min(24, Math.round(acupressureValue(data.motes, 18) * 0.35)));
        const beats = Math.max(2, Math.min(4, Math.round(acupressureValue(data.beats, 2))));
        const fade = Math.max(0, 1 - age / 30);
        // 落指：头几刻在穴点上打一记小闪光与一只手。
        if (age <= 8) {
            frame.sprite(AcupressureHit, site[0], site[1], site[2], (0.22 + 0.1 * scale) * (1 + 0.2 * (1 - age / 8)), 0,
                ((Math.round(235 * fade) << 24) | 0xFFE3A0) | 0, Math.max(0, Math.min(2, Math.floor(age))), true);
            frame.sprite(AcupressureHand, site[0], site[1], site[2], 0.2, 0, 0xF0E8B45A | 0, 12, true);
        }
        // 火花：向外迸出（数量由 motes 派生，封顶以免过密）。
        const spread = 0.16 + 0.28 * (age / 30);
        for (let index = 0; index < motes; index++) {
            const angle = index * 2.39996 + Math.floor(index / 3) * 0.6;
            const radius = spread * (0.4 + 0.6 * ((index * 7 % 11) / 11));
            const y = site[1] + Math.sin(angle * 1.7) * radius * 0.7;
            const alpha = Math.round(210 * fade);
            frame.sprite(AcupressureMote, site[0] + Math.cos(angle) * radius, y, site[2] + Math.sin(angle) * radius,
                0.06 + 0.03 * scale, 0, (alpha << 24 | 0xFFE3A0) | 0, index % 2, true);
        }
        // 小环：按 beats 一拍拍透（等级派生）。
        for (let index = 0; index < beats; index++) {
            const ringAge = age - index * 5;
            if (ringAge < 0 || ringAge > 22) continue;
            const t = ringAge / 22;
            const ringAlpha = Math.round(150 * (1 - t));
            frame.sprite(AcupressureRing, site[0], site[1], site[2], 0.12 + 0.5 * t, 0, (ringAlpha << 24 | 0x8A5A22) | 0, 0, false);
        }
        return;
    }

    if (moment === "flow") {
        // 通畅期：只在被点中的穴道留一枚缓慢上浮的小光点，随窗口存亡。
        const pulse = 0.5 + 0.5 * Math.sin(frame.serverTick() * 0.25);
        const motes = Math.max(2, Math.min(5, Math.round(acupressureValue(data.motes, 3) * 0.08)));
        for (let index = 0; index < motes; index++) {
            const rise = ((frame.serverTick() * 0.06 + index * 0.33) % 1) * 0.22;
            frame.sprite(AcupressureGlow, site[0] + Math.sin(index * 2.1 + frame.serverTick() * 0.05) * 0.05,
                site[1] + rise, site[2] + Math.cos(index * 2.1 + frame.serverTick() * 0.05) * 0.05,
                0.05 + 0.02 * pulse, 0, ((Math.round(150 + 60 * pulse) << 24) | 0xE8B45A) | 0, 0, true);
        }
        frame.sprite(AcupressureSpark, site[0], site[1], site[2], 0.11 + 0.04 * pulse, 0,
            ((Math.round(140 + 80 * pulse) << 24) | 0xFFE3A0) | 0, 0, true);
        return;
    }

    if (moment === "fade") {
        if (age > 22) return;
        const t = age / 22;
        const alpha = Math.round(170 * (1 - t));
        for (let index = 0; index < 10; index++) {
            const angle = index * 2.39996;
            const radius = 0.12 + 0.4 * t;
            frame.sprite(AcupressureMote, site[0] + Math.cos(angle) * radius, site[1] + 0.1 - 0.35 * t, site[2] + Math.sin(angle) * radius,
                0.05, 0, (alpha << 24 | 0x8A5A22) | 0, 0, false);
        }
    }
});
