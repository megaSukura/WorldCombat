/**
 * 力量戏法 / powertrick 的客户端表现。
 *
 * 一句话：身侧浮起两张牌——一张暖橙（攻势）、一张冷蓝（守势），它们**真正交换空间位置**：先左右分开成形，
 *   一手假动作让两枚牌从各自位置对穿到对方的位置，中间炸出一圈亮光 → 翻定之后交换位的两枚牌留在身体两侧，
 *   成为一段看得见的姿态，直到你主动再演一次把它们按反方向对穿翻回，或等窗口走完自行复位。
 * 主体由自定义场景 world_combat:move_powertrick_cards 每帧按服务端给的真实起点/时长/对调方向画出：
 *   固定对象、明确身份与位置，不生成粒子或额外实体；粒子只作亮光与尾迹的辅助层。
 * 色相家族：双色——攻势暖橙 0xFF9A3C 与守势冷蓝 0x4AC8E8，对穿的一瞬用近白 0xFFF2E0 落强调层，
 *   超能紫 0x8A5CF0 只作戏法的运力，不抢两色的辨识。
 * 拍子：起（gather 0–14t）→ 翻（trick 对穿）→ 存（hold 交换位姿态）→ 收（lapse／flipback 对穿归位）。
 * 范围：本招作用在自己身上；牌与尾迹绑 `frame.anchor` 随体型与朝向换算，trick 亮环随 `data.scale`（攻防差距派生）。
 * 数：牌数与对穿尾迹数绑 `data.spin`（特攻派生），对穿强度绑 `data.intensity`（攻防差距派生）；
 *   姿态密度同样随 `data.spin`。持续 hold 绑在真正的数值层效果上（服务端 `WorldFeedback.onEffect`），
 *   窗口关闭、主动翻回或提前清除会同步收回。
 * 无效：普通实体缺攻击或护甲时短播 reject，不呈现任何假姿态。
 */
const PowerTrickWarm = 0xFF9A3C;
const PowerTrickCool = 0x4AC8E8;
const PowerTrickWhite = 0xFFF2E0;
const PowerTrickCard = "cobblemon:particle/generic/orb/flat";
const PowerTrickCardRing = "cobblemon:particle/generic/ring/smallring";
const PowerTrickSpark = "cobblemon:particle/generic/status/accessory_spark";
const PowerTrickFlash = "cobblemon:particle/generic/sparkle/glowingsparkle";

function powertrickNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

/** 一帧锚点：插值脚点、宽高、朝向（MC 度制）。缺失返回 null。 */
function powertrickAnchor(frame: CombatClientFrame, ref: string, fallback: number[]): any {
    const raw = ref ? frame.anchor(ref) : null;
    const anchor = raw ? JSON.parse(raw) : null;
    if (anchor) return anchor;
    return { x: fallback[0], y: fallback[1], z: fallback[2], width: 0.9, height: 1.4, yaw: 0, bodyYaw: 0 };
}

function powertrickBody(anchor: any): { centre: number[]; right: number[]; side: number; yaw: number } {
    const width = Math.max(0.4, powertrickNumber(anchor.width, 0.9));
    const height = Math.max(0.6, powertrickNumber(anchor.height, 1.4));
    const yaw = powertrickNumber(anchor.bodyYaw, powertrickNumber(anchor.yaw, 0)) * Math.PI / 180;
    return { centre: [anchor.x, anchor.y + height * 0.5, anchor.z],
        right: [-Math.cos(yaw), 0, -Math.sin(yaw)], side: width * 0.5 + 0.3, yaw: yaw * 180 / Math.PI };
}

/** 画出一枚「牌」：一个实心盘 + 一圈牌框，按 bodyYaw 转到身体方向。 */
function powertrickCard(frame: CombatClientFrame, at: number[], colour: number, alpha: number, sprite: number, roll: number): void {
    const a = Math.max(0, Math.min(255, Math.round(alpha)));
    if (a <= 0) return;
    frame.sprite(PowerTrickCard, at[0], at[1], at[2], 0.42, roll, (a << 24 | colour) | 0, sprite, true);
    frame.sprite(PowerTrickCardRing, at[0], at[1], at[2], 0.56, roll, ((Math.round(a * 0.7) << 24) | colour) | 0, 0, true);
}

WorldCombatClient.scene("world_combat:move_powertrick_cards", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const moment = String(data.moment || "");
    const anchor = powertrickAnchor(frame, String(data.actor || entry.source || ""), entry.position);
    const body = powertrickBody(anchor);
    const spin = Math.max(4, Math.round(powertrickNumber(data.spin, 6)));
    const bob = Math.sin(frame.serverTick() * 0.12) * 0.04;
    const centre = [body.centre[0], body.centre[1] + bob, body.centre[2]];
    const roll = -body.yaw;
    const left = [-body.right[0] * body.side, 0, -body.right[2] * body.side];
    const right = [body.right[0] * body.side, 0, body.right[2] * body.side];
    const warm = [centre[0] + right[0], centre[1], centre[2] + right[2]];
    const cool = [centre[0] + left[0], centre[1], centre[2] + left[2]];

    if (moment === "trick" || moment === "flipback" || moment === "lapse") {
        const duration = Math.max(6, powertrickNumber(data.duration, 24));
        const start = powertrickNumber(data.start, frame.serverTick());
        const age = Math.max(0, frame.serverTick() - start);
        if (age > duration + 4) return;
        const t = Math.min(1, age / duration);
        const eased = t * t * (3 - 2 * t);
        // 从当前站位对穿到对方位置；trick 从「暖左冷右」翻到「暖右冷左」，收势反向。
        const flip = moment === "trick" ? eased : 1 - eased;
        const warmAt = [centre[0] + right[0] * (2 * flip - 1), centre[1], centre[2] + right[2] * (2 * flip - 1)];
        const coolAt = [centre[0] - right[0] * (2 * flip - 1), centre[1], centre[2] - right[2] * (2 * flip - 1)];
        // 对穿一瞬的强调层。
        const crossing = Math.max(0, 1 - Math.abs(t - 0.5) * 6);
        const flame = Math.round(150 + 105 * crossing);
        powertrickCard(frame, warmAt, PowerTrickWarm, 235, Math.floor(age * 0.5) % 4, roll);
        powertrickCard(frame, coolAt, PowerTrickCool, 235, Math.floor(age * 0.5) % 4, roll);
        if (crossing > 0.2) {
            frame.sprite(PowerTrickFlash, centre[0], centre[1], centre[2], 0.3 + 0.5 * crossing, 0, (Math.round(flame * crossing) << 24 | PowerTrickWhite) | 0, 0, true);
        }
        // 尾迹：数量随特攻派生的 spin。
        const trails = Math.max(2, Math.min(6, Math.round(spin / 3)));
        for (let index = 0; index < trails; index++) {
            const trail = Math.max(0, eased - index * 0.16);
            const wx = centre[0] + right[0] * (2 * trail - 1), cz = centre[2] + right[2] * (2 * trail - 1);
            frame.sprite(PowerTrickSpark, wx, centre[1] - 0.06 + index * 0.02, cz, 0.07, 0, (140 << 24 | PowerTrickWarm) | 0, index % 4, true);
            frame.sprite(PowerTrickSpark, centre[0] - right[0] * (2 * trail - 1), centre[1] - 0.06 + index * 0.02, centre[2] - right[2] * (2 * trail - 1),
                0.07, 0, (140 << 24 | PowerTrickCool) | 0, (index + 2) % 4, true);
        }
        return;
    }

    if (moment === "hold") {
        // 持续只留翻面姿态：两枚牌保持交换位，极轻呼吸。
        const pulse = 0.5 + 0.5 * Math.sin(frame.serverTick() * 0.1);
        powertrickCard(frame, warm, PowerTrickWarm, 150 + 60 * pulse, 0, roll);
        powertrickCard(frame, cool, PowerTrickCool, 140 + 55 * pulse, 0, roll);
    }
});

/** 粒子辅助层：起势的两色牌成形、对穿的亮光与火花、无效与收回的短播；主体牌由上面的自定义场景负责。 */
const PowerTrickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_warm", bind: "source", fit: "body", offset: [-0.45, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "spin", fallback: 6 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFF9A3C, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_cool", bind: "source", fit: "body", offset: [0.45, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "spin", fallback: 6 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x4AC8E8, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        trick: {
            duration: 26,
            exit: { stop: 10, drain: 15 },
            emitters: [
                {
                    name: "trick_flash", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/moves/psychichit_small",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [10, 18], size: [0.5, 0.15],
                    color: 0xFFF2E0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 10
                },
                {
                    name: "trick_spark", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "spin", fallback: 6 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8A5CF0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        reject: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "reject_warm", bind: "source", fit: "body", offset: [-0.45, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 5, at: 1 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFF9A3C, alpha: [0.4, 0], light: "world", maxParticles: 14
                },
                {
                    name: "reject_cool", bind: "source", fit: "body", offset: [0.45, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 5, at: 1 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x4AC8E8, alpha: [0.4, 0], light: "world", maxParticles: 14
                },
                {
                    name: "reject_crack", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 4 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [8, 12], size: [0.2, 0.04],
                    color: 0xFFF2E0, alpha: [0.35, 0], light: "world", maxParticles: 12
                }
            ]
        },
        lapse: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "lapse_warm", bind: "source", fit: "body", offset: [0.4, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 8 }, shape: { kind: "point" }, direction: [-1, 0, 0], speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFF9A3C, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "lapse_cool", bind: "source", fit: "body", offset: [-0.4, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 8 }, shape: { kind: "point" }, direction: [1, 0, 0], speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x4AC8E8, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "lapse_return", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.24, 0.05],
                    color: 0xFFF2E0, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        flipback: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "flip_warm", bind: "source", fit: "body", offset: [0.5, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 8, at: 1 }, shape: { kind: "point" }, direction: [-1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFF9A3C, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "flip_cool", bind: "source", fit: "body", offset: [-0.5, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 8, at: 1 }, shape: { kind: "point" }, direction: [1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x4AC8E8, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "flip_flash", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.11, 0.02],
                    color: 0xFFF2E0, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "flip_smoke", bind: "source", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.3],
                    color: 0x8A8172, alpha: [0.25, 0], light: "world", render: "translucent", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powertrick", 1, PowerTrickDefinition);
