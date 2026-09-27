/**
 * 特性互换 / skillswap 的客户端表现。
 *
 * 一句话：两人身上各浮起一枚紫晶样的特性符 → 两枚符沿着两人之间的连线对穿，各自落到对方的身上并炸开一圈符光 →
 *   此后对调还在的时间里，两人身上各留一层极淡的符光，表示「这个身份是换来的」。
 * 色相家族：超能品红 0xC24AE8 作主体，近白紫 0xF0E6FF 作高光，交换的符缘带一点青白 0x7FE8FF。
 * 拍子：起（trace 0–14t）→ 击（trade 0–28t，对穿与落身）→ 存（hum 持续）→ 收（revert 0–26t）。
 * 范围：trade 的符光沿 `data.path`（施法者与目标两个实体顶点画的 polyline）对穿，画的就是「从多远换来」；
 *   落身与持续光绑各自的身体，fizzle 绑施法者。
 * 运动：符从各自身上升起 → 沿连线对穿到对方 → 落身时向外炸开收束；hum 是极慢的自转。
 * 数：符数与落身粒子数绑 `data.glyphs`（特攻派生），对穿强度绑 `data.intensity`（存续时长派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SkillSwapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        trace: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "trace_seal_source", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "glyphs", fallback: 6 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.012, 0.04],
                    lifetime: [9, 15], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xC24AE8, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "trace_seal_target", bind: "target", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "glyphs", fallback: 6 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.012, 0.04],
                    lifetime: [9, 15], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xF0E6FF, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "trace_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: 6, direction: "shape", speed: [0.02, 0.07], spread: 8,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xC24AE8, alpha: [0.55, 0], light: "full", maxParticles: 60
                }
            ]
        },
        trade: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "trade_flare", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "glyphs", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.07, 0.22], drag: 0.92,
                    lifetime: [9, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xF0E6FF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "trade_spiral", bind: "target", fit: "body", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.3, 0.85], sizeMode: "sin",
                    color: 0x7FE8FF, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        hum: {
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "hum_seal", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "glyphs", fallback: 4 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.004, 0.02], spin: 20,
                    lifetime: [14, 24], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xF0E6FF, alpha: [0.34, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "hum_ring", bind: "target", fit: "body", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 2, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [16, 26], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xC24AE8, alpha: [0.26, 0], alphaMode: "sin", light: "world", maxParticles: 18
                }
            ]
        },
        revert: {
            duration: 26,
            exit: { stop: 9, drain: 17 },
            emitters: [
                {
                    name: "revert_ring", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.24, 0.05],
                    color: 0xF0E6FF, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "revert_trail", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xC24AE8, alpha: [0.4, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.32],
                    color: 0x8A8172, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skillswap", 1, SkillSwapDefinition);

// 真实对穿：两股反向符从两人身上沿各自点序推进、到对方身上落定——画的就是两份东西互换，而不是沿整条线一次采样。
const SkillSwapStreamGlyph = "cobblemon:particle/generic/psychic/psyring1";
const SkillSwapStreamBead = "cobblemon:particle/generic/sparkle/glowingsparkle";

function skillswapColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}
function skillswapClamp(value: any, fallback: number, low: number, high: number): number {
    const result = Number(value);
    return isFinite(result) ? Math.max(low, Math.min(high, result)) : fallback;
}

WorldCombatClient.scene("world_combat:move_skillswap_stream", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const self = JSON.parse(frame.anchor(String(data.self || entry.source)));
    const foe = data.target ? JSON.parse(frame.anchor(String(data.target))) : null;
    if (!self || !foe) return;
    const now = frame.serverTick();
    const start = Number(data.start), duration = Math.max(8, Number(data.duration) || 34);
    const age = now - (isFinite(start) ? start : now);
    if (age < 0 || age > duration) return;
    const progress = Math.max(0, Math.min(1, age / duration));
    const travel = Math.max(0, Math.min(1, (progress - 0.35) / 0.65));
    const fade = age > duration - 8 ? Math.max(0, (duration - age) / 8) : 1;
    const glyphs = Math.round(skillswapClamp(data.glyphs, 6, 2, 16));
    const scale = skillswapClamp(data.scale, 1, 0.6, 2);
    const ax = self.x, ay = self.y + Math.max(0.4, self.height) * 0.5, az = self.z;
    const bx = foe.x, by = foe.y + Math.max(0.4, foe.height) * 0.5, bz = foe.z;
    const dx = bx - ax, dz = bz - az, length = Math.sqrt(dx * dx + dz * dz) || 1;
    const rx = -dz / length, rz = dx / length;
    const bob = Math.sin(now * 0.25) * 0.05;
    // 两端先立住各自的身份符。
    frame.sprite(SkillSwapStreamGlyph, ax, ay + bob, az, 0.22 * scale, 0, skillswapColour(0.9 * fade, 0xC24AE8), Math.floor(now * 0.3) % 9, true);
    frame.sprite(SkillSwapStreamGlyph, bx, by - bob, bz, 0.22 * scale, 0, skillswapColour(0.9 * fade, 0xF0E6FF), Math.floor(now * 0.3 + 3) % 9, true);
    // 两股反向符各自推进：自→彼品红，彼→自青白。
    for (let i = 0; i < glyphs; i++) {
        const lane = (glyphs <= 1 ? 0 : (i / (glyphs - 1) - 0.5)) * 0.7;
        const t = Math.max(0, Math.min(1, travel - i * 0.03));
        frame.sprite(SkillSwapStreamBead, ax + dx * t + rx * lane, ay + (by - ay) * t, az + dz * t + rz * lane,
            0.12 * scale, 0, skillswapColour(0.9 * fade, 0xC24AE8), Math.floor(now * 0.5 + i), true);
        const q = Math.max(0, Math.min(1, travel - i * 0.03));
        frame.sprite(SkillSwapStreamBead, bx - dx * q + rx * lane, by + (ay - by) * q, bz - dz * q + rz * lane,
            0.12 * scale, 0, skillswapColour(0.85 * fade, 0x7FE8FF), Math.floor(now * 0.5 + i + 3), true);
    }
    // 各自身上落定一圈。
    if (travel > 0.6) {
        frame.ring(ax, ay - 0.1, az, 0.4 + scale * 0.15, skillswapColour(0.55 * fade, 0xF0E6FF));
        frame.ring(bx, by - 0.1, bz, 0.4 + scale * 0.15, skillswapColour(0.55 * fade, 0xC24AE8));
    }
});

// 常驻身份标记：按这一侧实际换到的特征显示名字，不只改颜色；挂在窗口效果上，窗口结束/被清除时同步消失。
WorldCombatClient.scene("world_combat:move_skillswap_mark", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const ref = String(data.target || entry.source);
    const got = String(data.got || "");
    const label = got === "native" ? frame.translate("world_combat.move.skillswap.text.attributes")
        : (got ? frame.translate("cobblemon.ability." + got) : "");
    if (!label) return;
    frame.billboard(ref, 1.35, 0.014, function (surface: CombatClientFrame) {
        surface.text(label, 0, 0, skillswapColour(0.85, 0xF0E6FF), 52);
        const values = Array.isArray(data.values) ? data.values : [];
        values.forEach((value: any, index: number) => {
            const name = String(value.id).replace("minecraft:generic.", "");
            const caption = frame.translate("world_combat.move.skillswap.attribute." + name);
            surface.text(caption + " " + value.before + " → " + value.after, 0, 11 * (index + 1), skillswapColour(.85, 0xF0E6FF), 120);
        });
    });
});
