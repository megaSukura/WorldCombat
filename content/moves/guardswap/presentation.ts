/**
 * 防守互换 / guardswap 的客户端表现。
 *
 * 一句话：两端先亮出各自的防护板与当前防/特防等级，随后钢蓝与青玉两束定向护光从两端真正对穿、交换到对方身上并落定，
 *   交换维持的这段时间里两端各扣一圈淡淡的护光；窗口走完再两端静收。
 * 色相家族：钢蓝 0x6FA8C8（防御）＋青玉 0x6FD0A8（特防）双色，中性近白 0xDCE8F0 只落在流动护点上。
 * 拍子：读（read，两端护板对齐）→ 对穿（自定义场景 move_guardswap_stream：先显等级，两束反向流动真实交会）
 *   → 维持（hum，每端自身护环）→ 归（revert，两端静收）/ 轻散（even／fizzle，不假装完成移交）。
 * 数：`data.count`（防御与体型派生的护点数量）驱动两束光点数，`data.gap`（双方守势等级差之和）驱动强度与落定环大小；
 *   两端等级读数直接取本次提交前捕获的 mine/theirs。贴图与帧尺寸来自 particle_types.txt。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const GuardsuwapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "ward_self", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 4, shape: { kind: "ring", radius: 0.34, arcDegrees: 220 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0x6FA8C8, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 18
                },
                {
                    name: "ward_foe", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 4, shape: { kind: "ring", radius: 0.34, arcDegrees: 220 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0x6FD0A8, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 18
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_def", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
                    direction: "inward", speed: [0.004, 0.016], spin: 8,
                    lifetime: [22, 36], size: [0.14, 0.01], sizeMode: "sin",
                    color: 0x6FA8C8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "hum_spd", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
                    direction: "inward", speed: [0.004, 0.016], spin: -8,
                    lifetime: [22, 36], size: [0.14, 0.01], sizeMode: "sin",
                    color: 0x6FD0A8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
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
                    color: 0xDCE8F0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        even: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "even_def", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: 9 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x6FA8C8, alpha: [0.5, 0], light: "full", maxParticles: 20
                },
                {
                    name: "even_spd", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: 9 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x6FD0A8, alpha: [0.5, 0], light: "full", maxParticles: 20
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
                    color: 0x6A7A8A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_guardswap", 1, GuardsuwapDefinition);

/**
 * 防守互换的真实对穿：两端先亮出防护板与当前等级，再由自定义场景读双方当前真实位置，
 * 把钢蓝（自→彼）与青玉（彼→自）两束护光逐刻反向送出、交会后在各自一端落定。
 * 判定交换的是哪两个身体，画面就画在哪两个身体；不是沿整条线一次采样。
 */
const GuardsuwapStreamSymbol = "cobblemon:particle/moves/protect_block";
const GuardsuwapStreamBead = "cobblemon:particle/generic/orb/xsfadeorblite";

function guardswapNumber(value: any, fallback: number): number {
    const result = Number(value); return isFinite(result) ? result : fallback;
}
function guardswapColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}
function guardswapLevelPair(frame: CombatClientFrame, anchor: any, defence: any, special: any, rgb: number): void {
    if (typeof defence !== "number" || !isFinite(defence) || typeof special !== "number" || !isFinite(special)) return;
    const label = (defence >= 0 ? "+" : "") + defence + " / " + (special >= 0 ? "+" : "") + special;
    frame.billboard(anchor.x, anchor.y + Math.max(0.6, anchor.height) + 0.45, anchor.z, 0.018, function (surface) {
        surface.text(label, 0, 0, guardswapColour(1, rgb), 44);
    });
}

WorldCombatClient.scene("world_combat:move_guardswap_stream", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const self = JSON.parse(frame.anchor(String(data.self || entry.source)));
    const foe = data.target ? JSON.parse(frame.anchor(String(data.target))) : null;
    if (!self || !foe) return;
    const now = frame.serverTick();
    const start = guardswapNumber(data.start, now);
    const duration = Math.max(8, guardswapNumber(data.duration, 46));
    const age = now - start;
    if (age < 0 || age > duration) return;
    const progress = Math.max(0, Math.min(1, age / duration));
    const travel = Math.max(0, Math.min(1, (progress - 0.4) / 0.6));
    const fade = age > duration - 10 ? Math.max(0, (duration - age) / 10) : 1;
    const count = Math.max(2, Math.min(18, Math.round(guardswapNumber(data.count, 6))));
    const scale = Math.max(0.5, Math.min(2, guardswapNumber(data.scale, 1)));
    const spread = Math.max(0.35, Math.min(1.5, guardswapNumber(data.spread, 0.7)));
    const ax = self.x, ay = self.y + Math.max(0.4, self.height) * 0.5, az = self.z;
    const bx = foe.x, by = foe.y + Math.max(0.4, foe.height) * 0.5, bz = foe.z;
    const dx = bx - ax, dz = bz - az, length = Math.sqrt(dx * dx + dz * dz) || 1;
    const rx = -dz / length, rz = dx / length;
    const bob = Math.sin(now * 0.2) * 0.05;
    // 两端防护板：先立住身份。
    frame.sprite(GuardsuwapStreamSymbol, ax, ay + bob, az, 0.26 * scale, 0, guardswapColour(0.95 * fade, 0x6FA8C8), Math.floor(now * 0.3) % 6, true);
    frame.sprite(GuardsuwapStreamSymbol, bx, by - bob, bz, 0.26 * scale, 0, guardswapColour(0.95 * fade, 0x6FD0A8), Math.floor(now * 0.3) % 6, true);
    // 先显当前等级，再开始对穿。
    if (progress < 0.42) {
        guardswapLevelPair(frame, self, data.selfDef, data.selfSpd, 0x6FA8C8);
        guardswapLevelPair(frame, foe, data.foeDef, data.foeSpd, 0x6FD0A8);
    }
    // 两束反向定向流真实交会：自→彼钢蓝，彼→自青玉。
    for (let i = 0; i < count; i++) {
        const lane = (count <= 1 ? 0 : (i / (count - 1) - 0.5)) * spread;
        const t = Math.max(0, Math.min(1, travel - i * 0.02));
        frame.sprite(GuardsuwapStreamBead, ax + dx * t + rx * lane, ay + (by - ay) * t, az + dz * t + rz * lane,
            0.14 * scale, 0, guardswapColour(0.9 * fade, 0xDCE8F0), Math.floor(now * 0.5 + i), true);
        const q = Math.max(0, Math.min(1, travel - i * 0.02));
        frame.sprite(GuardsuwapStreamBead, bx - dx * q + rx * lane, by + (ay - by) * q, bz - dz * q + rz * lane,
            0.12 * scale, 0, guardswapColour(0.85 * fade, 0x6FD0A8), Math.floor(now * 0.5 + i + 3), true);
    }
    // 各自一端落定。
    if (travel > 0.6) {
        const radius = 0.45 + spread * 0.2;
        frame.ring(ax, ay - 0.1, az, radius, guardswapColour(0.6 * fade, 0x6FA8C8));
        frame.ring(bx, by - 0.1, bz, radius, guardswapColour(0.6 * fade, 0x6FD0A8));
    }
});
