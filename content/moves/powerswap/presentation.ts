/**
 * 力量互换 / powerswap 的客户端表现。
 *
 * 一句话：两端先亮出各自的进攻爪与当前攻/特攻等级，随后暖橙与洋红两束定向光从两端真正对穿、交换到对方身上并落定，
 *   交换维持的这段时间里两端各挂一枚淡淡的攻势光环；窗口走完再两端静收。
 * 色相家族：暖橙 0xFF9A4E（物理攻势）＋洋红 0xE06CC8（特攻攻势）双色，中性近白 0xF6E8DA 只落在流动光点上。
 *   两色同时出现是刻意的：这一招交换的是两样东西，两种颜色必须一起被看见。
 * 拍子：读（read，两端读数对齐）→ 对穿（自定义场景 move_powerswap_stream：先显等级，两束反向流动真实交会）
 *   → 维持（hum，每端自身光环）→ 归（revert，两端静收）/ 轻散（even／fizzle，不假装完成移交）。
 * 数：`data.count`（特攻与体型派生的对流条数）驱动两束光点数，`data.gap`（双方攻势等级差之和）驱动强度与落定环大小；
 *   两端等级读数直接取本次提交前捕获的 mine/theirs。贴图与帧尺寸来自 particle_types.txt。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const PowerswapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "align_self", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "streams", fallback: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.16, 0.02], sizeMode: "sin",
                    color: 0xFF9A4E, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 26
                },
                {
                    name: "align_foe", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: { data: "streams", fallback: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.16, 0.02], sizeMode: "sin",
                    color: 0xE06CC8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 26
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_phys", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.006, 0.02],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xFF9A4E, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "hum_spec", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.004, 0.016],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xE06CC8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
                }
            ]
        },
        revert: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "return", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xF6E8DA, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        even: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "even_phys", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 9 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.09, 0.01],
                    color: 0xFF9A4E, alpha: [0.5, 0], light: "full", maxParticles: 20
                },
                {
                    name: "even_spec", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 9 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xE06CC8, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "dud", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8A6A4A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powerswap", 1, PowerswapDefinition);

/**
 * 力量互换的真实对穿：两端先亮出进攻爪与当前等级，再由自定义场景读双方当前真实位置，
 * 把暖橙（自→彼）与洋红（彼→自）两束光点逐刻反向送出、交会后在各自一端落定。
 * 判定交换的是哪两个身体，画面就画在哪两个身体；不是沿整条线一次采样。
 */
const PowerswapStreamSymbol = "cobblemon:particle/generic/grab";
const PowerswapStreamBead = "cobblemon:particle/generic/orb/xsboost";

function powerswapNumber(value: any, fallback: number): number {
    const result = Number(value); return isFinite(result) ? result : fallback;
}
function powerswapColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}
function powerswapLevelPair(frame: CombatClientFrame, anchor: any, attack: any, special: any, rgb: number): void {
    if (typeof attack !== "number" || !isFinite(attack) || typeof special !== "number" || !isFinite(special)) return;
    const label = (attack >= 0 ? "+" : "") + attack + " / " + (special >= 0 ? "+" : "") + special;
    frame.billboard(anchor.x, anchor.y + Math.max(0.6, anchor.height) + 0.45, anchor.z, 0.018, function (surface) {
        surface.text(label, 0, 0, powerswapColour(1, rgb), 44);
    });
}

WorldCombatClient.scene("world_combat:move_powerswap_stream", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const self = JSON.parse(frame.anchor(String(data.self || entry.source)));
    const foe = data.target ? JSON.parse(frame.anchor(String(data.target))) : null;
    if (!self || !foe) return;
    const now = frame.serverTick();
    const start = powerswapNumber(data.start, now);
    const duration = Math.max(8, powerswapNumber(data.duration, 46));
    const age = now - start;
    if (age < 0 || age > duration) return;
    const progress = Math.max(0, Math.min(1, age / duration));
    const travel = Math.max(0, Math.min(1, (progress - 0.4) / 0.6));
    const fade = age > duration - 10 ? Math.max(0, (duration - age) / 10) : 1;
    const count = Math.max(2, Math.min(18, Math.round(powerswapNumber(data.count, 6))));
    const scale = Math.max(0.5, Math.min(2, powerswapNumber(data.scale, 1)));
    const spread = Math.max(0.35, Math.min(1.5, powerswapNumber(data.spread, 0.7)));
    const ax = self.x, ay = self.y + Math.max(0.4, self.height) * 0.5, az = self.z;
    const bx = foe.x, by = foe.y + Math.max(0.4, foe.height) * 0.5, bz = foe.z;
    const dx = bx - ax, dz = bz - az, length = Math.sqrt(dx * dx + dz * dz) || 1;
    const rx = -dz / length, rz = dx / length;
    const bob = Math.sin(now * 0.2) * 0.05;
    // 两端进攻爪：先立住身份。
    frame.sprite(PowerswapStreamSymbol, ax, ay + bob, az, 0.24 * scale, 0, powerswapColour(0.95 * fade, 0xFF9A4E), Math.floor(now * 0.3) % 13, true);
    frame.sprite(PowerswapStreamSymbol, bx, by - bob, bz, 0.24 * scale, 0, powerswapColour(0.95 * fade, 0xE06CC8), Math.floor(now * 0.3) % 13, true);
    // 先显当前等级，再开始对穿。
    if (progress < 0.42) {
        powerswapLevelPair(frame, self, data.selfAtk, data.selfSpa, 0xFF9A4E);
        powerswapLevelPair(frame, foe, data.foeAtk, data.foeSpa, 0xE06CC8);
    }
    // 两束反向定向流真实交会：自→彼暖橙，彼→自洋红。
    for (let i = 0; i < count; i++) {
        const lane = (count <= 1 ? 0 : (i / (count - 1) - 0.5)) * spread;
        const t = Math.max(0, Math.min(1, travel - i * 0.02));
        frame.sprite(PowerswapStreamBead, ax + dx * t + rx * lane, ay + (by - ay) * t, az + dz * t + rz * lane,
            0.14 * scale, 0, powerswapColour(0.9 * fade, 0xF6E8DA), Math.floor(now * 0.5 + i), true);
        const q = Math.max(0, Math.min(1, travel - i * 0.02));
        frame.sprite(PowerswapStreamBead, bx - dx * q + rx * lane, by + (ay - by) * q, bz - dz * q + rz * lane,
            0.12 * scale, 0, powerswapColour(0.85 * fade, 0xE06CC8), Math.floor(now * 0.5 + i + 3), true);
    }
    // 各自一端落定。
    if (travel > 0.6) {
        const radius = 0.45 + spread * 0.2;
        frame.ring(ax, ay - 0.1, az, radius, powerswapColour(0.6 * fade, 0xFF9A4E));
        frame.ring(bx, by - 0.1, bz, radius, powerswapColour(0.6 * fade, 0xE06CC8));
    }
});
