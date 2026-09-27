/**
 * 力量转换 / powershift 的客户端表现。
 *
 * 一句话：身侧先分出两股力道——左边一股偏暖（攻势）、右边一股偏冷（守势）→ 两股力道对流穿过彼此，
 *   在中间炸出一圈亮环，真正换过位置 → 此后交换还在的时间里，两枚牌停在交换位，外面一圈**随真实剩余窗口
 *   逐步收拢的扣环**读出自动回位 → 关闭的一刻两股力道各自回到原位。
 * 主体由自定义场景 world_combat:move_powershift_scale 每帧按服务端给的真实起点/窗长/对调方向画出：
 *   固定对象、明确身份与位置，不生成粒子或额外实体；粒子只作对流、火花与回收的辅助层。
 * 色相家族：双色——攻势暖橙 0xFF8A4C 与守势青蓝 0x6FC7E8 对流，中性近白 0xEAF2F8 只落在锁定强调层。
 * 拍子：起（gather 0–16t）→ 转（cross 对流）→ 存（hum 交换位 + 收拢扣环）→ 收（fade 归位）；缺项时短播 reject。
 * 范围：本招作用在自己身上；牌与扣环绑 `frame.anchor` 随体型与朝向换算，半径按 `data.reach`（攻防差距 / 60，夹 0.4..1.6）
 *   与真实剩余比例收拢。
 * 数：对流条数与火花数绑 `data.bands`（物攻与防御之和派生），持续密度同样随 `data.bands`；
 *   扣环半径绑定真实剩余窗口比例。
 * 无效：普通实体缺攻击或护甲时短播 reject，不呈现任何假姿态。
 * 与力量戏法的差异：这里有一条随窗口剩余收拢的扣环，牌位随自动回位一起收；力量戏法没有倒计时，只留稳定的翻面姿态。
 */
const PowerShiftWarm = 0xFF8A4C;
const PowerShiftCool = 0x6FC7E8;
const PowerShiftWhite = 0xEAF2F8;
const PowerShiftCard = "cobblemon:particle/generic/orb/flat";
const PowerShiftCardRing = "cobblemon:particle/generic/ring/smallring";
const PowerShiftSpark = "cobblemon:particle/generic/status/accessory_spark";
const PowerShiftFlash = "cobblemon:particle/generic/sparkle/glowingsparkle";

function powershiftNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function powershiftAnchor(frame: CombatClientFrame, ref: string, fallback: number[]): any {
    const raw = ref ? frame.anchor(ref) : null;
    const anchor = raw ? JSON.parse(raw) : null;
    if (anchor) return anchor;
    return { x: fallback[0], y: fallback[1], z: fallback[2], width: 0.9, height: 1.4, yaw: 0, bodyYaw: 0 };
}

function powershiftBody(anchor: any): { centre: number[]; right: number[]; side: number; yaw: number } {
    const width = Math.max(0.4, powershiftNumber(anchor.width, 0.9));
    const height = Math.max(0.6, powershiftNumber(anchor.height, 1.4));
    const yaw = powershiftNumber(anchor.bodyYaw, powershiftNumber(anchor.yaw, 0)) * Math.PI / 180;
    return { centre: [anchor.x, anchor.y + height * 0.5, anchor.z],
        right: [-Math.cos(yaw), 0, -Math.sin(yaw)], side: width * 0.5 + 0.3, yaw: yaw * 180 / Math.PI };
}

function powershiftCard(frame: CombatClientFrame, at: number[], colour: number, alpha: number, sprite: number, roll: number): void {
    const a = Math.max(0, Math.min(255, Math.round(alpha)));
    if (a <= 0) return;
    frame.sprite(PowerShiftCard, at[0], at[1], at[2], 0.4, roll, (a << 24 | colour) | 0, sprite, true);
    frame.sprite(PowerShiftCardRing, at[0], at[1], at[2], 0.54, roll, ((Math.round(a * 0.7) << 24) | colour) | 0, 0, true);
}

WorldCombatClient.scene("world_combat:move_powershift_scale", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const moment = String(data.moment || "");
    const anchor = powershiftAnchor(frame, String(data.actor || entry.source || ""), entry.position);
    const body = powershiftBody(anchor);
    const bands = Math.max(6, Math.round(powershiftNumber(data.bands, 14)));
    const reach = Math.max(0.4, powershiftNumber(data.reach, 0.9));
    const roll = -body.yaw;
    const centre = body.centre;
    const right = body.right;
    const warmAt = [centre[0] + right[0] * body.side, centre[1], centre[2] + right[2] * body.side];
    const coolAt = [centre[0] - right[0] * body.side, centre[1], centre[2] - right[2] * body.side];

    if (moment === "cross") {
        const duration = Math.max(6, powershiftNumber(data.duration, 24));
        const start = powershiftNumber(data.start, frame.serverTick());
        const age = Math.max(0, frame.serverTick() - start);
        if (age > duration + 4) return;
        const t = Math.min(1, age / duration), eased = t * t * (3 - 2 * t);
        const warmStart = [-right[0] * body.side, 0, -right[2] * body.side], warmEnd = [right[0] * body.side, 0, right[2] * body.side];
        const at = function (from: number[], to: number[]): number[] {
            return [centre[0] + from[0] + (to[0] - from[0]) * eased, centre[1], centre[2] + from[2] + (to[2] - from[2]) * eased];
        };
        const crossing = Math.max(0, 1 - Math.abs(t - 0.5) * 6);
        powershiftCard(frame, at(warmStart, warmEnd), PowerShiftWarm, 235, Math.floor(age * 0.5) % 4, roll);
        powershiftCard(frame, at(warmEnd, warmStart), PowerShiftCool, 235, Math.floor(age * 0.5) % 4, roll);
        if (crossing > 0.2) frame.sprite(PowerShiftFlash, centre[0], centre[1], centre[2], 0.3 + 0.5 * crossing, 0,
            (Math.round(220 * crossing) << 24 | PowerShiftWhite) | 0, 0, true);
        const trails = Math.max(2, Math.min(6, Math.round(bands / 5)));
        for (let index = 0; index < trails; index++) {
            const trail = Math.max(0, eased - index * 0.16);
            frame.sprite(PowerShiftSpark, centre[0] + right[0] * body.side * (2 * trail - 1), centre[1] - 0.06 + index * 0.02,
                centre[2] + right[2] * body.side * (2 * trail - 1), 0.07, 0, (140 << 24 | PowerShiftWarm) | 0, index % 4, true);
            frame.sprite(PowerShiftSpark, centre[0] - right[0] * body.side * (2 * trail - 1), centre[1] - 0.06 + index * 0.02,
                centre[2] - right[2] * body.side * (2 * trail - 1), 0.07, 0, (140 << 24 | PowerShiftCool) | 0, (index + 2) % 4, true);
        }
        return;
    }

    if (moment === "hum") {
        // 交换位牌 + 随真实剩余窗口收拢的扣环。
        const window = Math.max(1, powershiftNumber(data.window, 200));
        const start = powershiftNumber(data.start, frame.serverTick());
        const remaining = Math.max(0, Math.min(1, 1 - (frame.serverTick() - start) / window));
        const pulse = 0.5 + 0.5 * Math.sin(frame.serverTick() * 0.14);
        powershiftCard(frame, warmAt, PowerShiftWarm, 150 + 60 * pulse, 0, roll);
        powershiftCard(frame, coolAt, PowerShiftCool, 140 + 55 * pulse, 0, roll);
        const radius = Math.max(0.06, reach * (0.18 + 0.82 * remaining));
        const ringColour = (Math.round((90 + 150 * remaining) * (0.65 + 0.35 * pulse)) << 24) | PowerShiftWhite;
        frame.ring(centre[0], centre[1] + 0.02, centre[2], radius, ringColour | 0);
        frame.ring(centre[0], centre[1] - 0.14, centre[2], radius * 0.72, (Math.round(120 * remaining) << 24 | PowerShiftWarm) | 0);
        return;
    }

    if (moment === "fade") {
        const duration = Math.max(6, powershiftNumber(data.duration, 24));
        const start = powershiftNumber(data.start, frame.serverTick());
        const age = Math.max(0, frame.serverTick() - start);
        if (age > duration + 4) return;
        const t = Math.min(1, age / duration), eased = t * t * (3 - 2 * t);
        const fade = 1 - eased;
        // 从交换位相互对穿回到原位。
        const warmFrom = warmAt, warmTo = coolAt, coolFrom = coolAt, coolTo = warmAt;
        const warmNow = [warmFrom[0] + (warmTo[0] - warmFrom[0]) * eased, centre[1], warmFrom[2] + (warmTo[2] - warmFrom[2]) * eased];
        const coolNow = [coolFrom[0] + (coolTo[0] - coolFrom[0]) * eased, centre[1], coolFrom[2] + (coolTo[2] - coolFrom[2]) * eased];
        powershiftCard(frame, warmNow, PowerShiftWarm, 200 * fade, Math.floor(age * 0.4) % 4, roll);
        powershiftCard(frame, coolNow, PowerShiftCool, 190 * fade, Math.floor(age * 0.4) % 4, roll);
    }
});

/** 粒子辅助层：起势、对流火花、无效与收回；主体牌与扣环由上面的自定义场景负责。 */
const PowerShiftDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "warm_wisp", bind: "source", offset: [-0.45, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFF8A4C, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "cool_wisp", bind: "source", offset: [0.45, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        cross: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "warm_flow", bind: "source", offset: [-0.5, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "bands", fallback: 14 }, at: 1 },
                    shape: { kind: "point" }, direction: [1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFF8A4C, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cool_flow", bind: "source", offset: [0.5, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "bands", fallback: 14 }, at: 1 },
                    shape: { kind: "point" }, direction: [-1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.32, 0.05], sizeMode: "index",
                    color: 0x6FC7E8, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cross_spark", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "bands", fallback: 14 }, at: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xEAF2F8, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        reject: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "reject_warm", bind: "source", offset: [-0.4, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFF8A4C, alpha: [0.4, 0], light: "world", maxParticles: 16
                },
                {
                    name: "reject_cool", bind: "source", offset: [0.4, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x6FC7E8, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 9, drain: 17 },
            emitters: [
                {
                    name: "revert_warm", bind: "source", offset: [0.35, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "point" }, direction: [-1, 0, 0], speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFF8A4C, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "revert_cool", bind: "source", offset: [-0.35, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "point" }, direction: [1, 0, 0], speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x6FC7E8, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "revert_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 0.9 } },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.26, 0.05],
                    color: 0xEAF2F8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powershift", 1, PowerShiftDefinition);
