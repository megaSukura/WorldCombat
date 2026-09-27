/**
 * 换档 的客户端表现（自定义场景，固定数量图形，不生成粒子或额外实体）。
 *
 * 一句话：施法者身侧一对齿轮咬合着转起来——一颗大而慢（扭力档）、一颗小而快（超速档），转向相反；
 *   到位后「咔」地锁定一下，随后只留下一小枚挡位符号，跟着这份挡位窗口一直转，窗口收时落下。
 *
 * 位置与朝向：齿轮平面由锚点的 bodyYaw 实时算出（MC 前向 [-sin yaw, 0, cos yaw]），画在身体一侧的中腰高度，
 *   所以转身、不同体型时齿轮都贴在身侧咬合；锚点不可用时回退到载荷里的世界位置。
 * 色相家族：钢蓝灰（0x8FA3B8）与暖金（0xE8B84B）分别是两档，近白（0xE8F0F8）只做轴心高光。
 * 数：齿轮尺寸绑 orbit（体型派生）、挡位选择绑定 gear；两颗齿轮的转速与转向固定不同，选中档转得更快更亮。
 * 持续：window 那枚小符号由服务端 WorldFeedback.onEffect 绑在真实挡位窗口上，随窗口到期／被清除／替换一起收。
 */
const ShiftGearRing = "cobblemon:particle/generic/ring/mediumring";
const ShiftGearTooth = "cobblemon:particle/generic/sparkle/smallsparkle";
const ShiftGearHub = "cobblemon:particle/generic/orb/orb";

function shiftgearValue(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function shiftgearPose(frame: CombatClientFrame, data: any, entry: CombatSceneEntry): any {
    const ref = data.actor ? String(data.actor) : String(entry.source || "");
    const raw = ref ? frame.anchor(ref) : null;
    const anchor = raw ? JSON.parse(raw) : null;
    if (anchor) {
        const height = shiftgearValue(anchor.height, 1.4) > 0 ? shiftgearValue(anchor.height, 1.4) : 1.4;
        const width = shiftgearValue(anchor.width, 0.9) > 0 ? shiftgearValue(anchor.width, 0.9) : 0.9;
        const yaw = shiftgearValue(anchor.bodyYaw, shiftgearValue(anchor.yaw, 0)) * Math.PI / 180;
        return { x: anchor.x, y: anchor.y, z: anchor.z, height: height, width: width, yaw: yaw };
    }
    return { x: entry.position[0], y: entry.position[1], z: entry.position[2], height: 1.4, width: 0.9, yaw: 0 };
}

/** 一颗齿轮：轮齿沿圆面均布，四条辐条连到轴心，转向由 phase 的符号与速度决定。 */
function shiftgearGear(frame: CombatClientFrame, cx: number, cy: number, cz: number,
                       rx: number, rz: number, radius: number, phase: number, teeth: number,
                       color: number, alpha: number, lit: boolean): void {
    const rim = (alpha << 24 | color) | 0;
    const spoke = (Math.round(alpha * 0.55) << 24 | color) | 0;
    for (let index = 0; index < teeth; index++) {
        const angle = phase + index * Math.PI * 2 / teeth;
        const c = Math.cos(angle), s = Math.sin(angle);
        const px = cx + rx * radius * c, py = cy + radius * s, pz = cz + rz * radius * c;
        frame.sprite(ShiftGearTooth, px, py, pz, radius * 0.42, -(angle * 180 / Math.PI) % 360, rim, 0, lit);
    }
    for (let index = 0; index < 4; index++) {
        const angle = phase + index * Math.PI / 2;
        const c = Math.cos(angle) * radius * 0.82, s = Math.sin(angle) * radius * 0.82;
        frame.line(cx, cy, cz, cx + rx * c, cy + s, cz + rz * c, spoke);
    }
    frame.sprite(ShiftGearRing, cx, cy, cz, radius * 0.86, (phase * 180 / Math.PI) % 360, rim, 0, lit);
    frame.sprite(ShiftGearHub, cx, cy, cz, radius * 0.28, 0, (Math.min(255, alpha + 30) << 24 | 0xE8F0F8) | 0, 0, true);
}

WorldCombatClient.scene("world_combat:move_shiftgear", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const moment = String(data.moment || "");
    const pose = shiftgearPose(frame, data, entry);
    const orbit = Math.max(0.9, shiftgearValue(data.orbit, 1.3));
    const gear = shiftgearValue(data.gear, 1) === 0 ? 0 : 1;
    const rx = -Math.cos(pose.yaw), rz = -Math.sin(pose.yaw);
    const halfW = Math.max(0.25, pose.width * 0.5);
    const midY = pose.y + pose.height * 0.5;
    const torqueRadius = 0.16 + orbit * 0.12;
    const overRadius = torqueRadius * 0.74;
    const side = halfW + torqueRadius * 0.7;
    const torqueX = pose.x + rx * side, torqueZ = pose.z + rz * side;
    const overX = torqueX, overZ = torqueZ, overY = midY + torqueRadius + overRadius;

    if (moment === "window") {
        // 挡位在线：只留选中档那一小枚符号，按该档的转向转。
        const radius = 0.09 + orbit * 0.05;
        const spin = gear === 0 ? 46 : -68;
        const phase = spin * frame.serverTick() * Math.PI / 180;
        shiftgearGear(frame, torqueX, midY, torqueZ, rx, rz, radius, phase, gear === 0 ? 8 : 7,
            gear === 0 ? 0x9FB4C8 : 0xE8B84B, 235, true);
        return;
    }
    if (moment === "fade") {
        const age = Math.max(0, frame.serverTick() - shiftgearValue(data.start, frame.serverTick()));
        const fade = Math.max(0, 1 - age / 24);
        if (fade <= 0) return;
        const radius = (0.09 + orbit * 0.05) * (0.6 + 0.4 * fade);
        const spin = gear === 0 ? 46 : -68;
        const phase = spin * frame.serverTick() * Math.PI / 180;
        shiftgearGear(frame, torqueX, midY - (1 - fade) * 0.3, torqueZ, rx, rz, radius, phase, 8,
            gear === 0 ? 0x9FB4C8 : 0xE8B84B, Math.round(170 * fade), false);
        return;
    }

    const start = shiftgearValue(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    let torqueSpin = 42, overSpin = -66, alpha = 225, lit = false;
    if (moment === "windup") {
        const duration = Math.max(1, shiftgearValue(data.duration, 12));
        const progress = Math.min(1, age / duration);
        const ramp = progress * progress;
        torqueSpin = 14 + 40 * ramp;
        overSpin = -(18 + 60 * ramp);
        alpha = Math.round(150 + 80 * progress);
    } else if (moment === "engage") {
        const settle = Math.min(1, age / 10);
        lit = true;
        alpha = Math.round(255 - 40 * settle);
        torqueSpin = 52 - 14 * settle;
        overSpin = -80 + 20 * settle;
    } else if (moment === "capped") {
        alpha = Math.max(40, Math.round(200 - age * 8));
        torqueSpin = 20; overSpin = -28;
    }
    const torqueColor = gear === 0 ? 0xE8B84B : 0x8FA3B8;
    const overColor = gear === 1 ? 0xE8B84B : 0x8FA3B8;
    shiftgearGear(frame, torqueX, midY, torqueZ, rx, rz, torqueRadius, frame.serverTick() * torqueSpin * Math.PI / 180, 10,
        torqueColor, alpha, lit && gear === 0);
    shiftgearGear(frame, overX, overY, overZ, rx, rz, overRadius, frame.serverTick() * overSpin * Math.PI / 180, 8,
        overColor, alpha, lit && gear === 1);
    if (moment === "engage") {
        // 咬合锁定：两口之间一小段近白高光线。
        const gx = torqueX, gy = (midY + overY) * 0.5, gz = torqueZ;
        const n = Math.max(0.05, torqueRadius * 0.7);
        frame.line(gx - n, gy, gz, gx + n, gy, gz, 0xE8F0F8FF | 0);
    }
});
