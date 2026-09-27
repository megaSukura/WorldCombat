/**
 * Ｖ热焰 / vcreate 的客户端表现。
 *
 * 一句话：前额先炸开一团炽白的火、火舌向两侧张成一个 V，随后整个人拖着这道 V 形焰尾撞进目标怀里；命中时爆成
 *   一团火球，撞完身上的火焰萎落成两条残焰，V 一点点暗下去——那就是三段降级的样子。
 * 色相家族：炽白（0xFFF0C0）到橙红（0xFF7A2E），烟收在深褐（0x3A241C）；饱和集中在额焰、命中与残焰的小面积。
 * 拍子：起（kindle 额焰张成 V）→ 冲（hurl V 形焰尾贴前额）→ 击（impact 爆开）→ 萎（slump 残焰与落灰）／失（miss）。
 * 范围：`impact` 的爆开与 `ring` 用 `data.scale`（前额火焰判定 / 0.5）铺开，画出来的就是撞面宽度。
 * 运动：`hurl` 的 trail 沿施法者实际扑过的路线铺开，画面即那条冲刺线；前额那道 V 由自定义场景
 *   `world_combat:move_vcreate/v` 用真实世界端点画两翼，命中时碎散向外抛，粒子只补火与碎石。
 * 数：`impact`／`kindle` 的火舌量绑 `data.flames`（物攻换算出机制数），强度绑 `data.intensity`（实际威力派生）；
 *   `data.progress` 让冲程中的火焰随前进更盛，`data.nova` 区分尽燃／收焰；`slump` 的落灰量绑 `data.slump`
 *   （三段实际降级合计换算），降得越狠画面越沉。
 */
const VcreateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kindle: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "forehead_core", bind: "source", offset: [0, 0.85, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "flames", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.25 }, direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [6, 12], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "v_smoke", bind: "source", offset: [0, 0.9, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "sphere", radius: 0.22 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.18, 0.3], color: 0x3A241C, alpha: [0.22, 0], light: "world", maxParticles: 24
                }
            ]
        },
        hurl: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "head", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 30, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFF7A2E, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "core", bind: "source", offset: [0, 0.7, 0], height: 0.7,
                    trail: { minDistance: 0.25 },
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 18, shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 11], size: [0.16, 0.02], color: 0xFFF0C0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "ash", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    trail: { minDistance: 0.35 },
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.2, 0.32], color: 0x3A241C, alpha: [0.25, 0], light: "world", maxParticles: 50
                },
                {
                    name: "speed_lines", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 16, shape: { kind: "line", length: 0.9, rotation: [0, 0, 90] }, direction: "shape",
                    speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.32, 0.06], color: 0xFFE0A0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "v_core", bind: "source", offset: [0, 0.85, 0], height: 0.85,
                    trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 12, shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.09],
                    lifetime: [6, 11], size: [0.14, 0.02], color: 0xFFF0C0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blast", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "flames", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.1, 0.34], spread: 22,
                    lifetime: [7, 13], size: [0.46, 0.06], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 120
                },
                {
                    name: "rocks", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.1, 0.32], gravity: 0.1, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFF8A3C, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 1.2 }, direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 16], size: [0.4, 0.9], color: 0xFF5A2E, alpha: [0.55, 0], light: "world", maxParticles: 4
                },
                {
                    name: "flash", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 1 },
                    shape: { kind: "point" }, direction: "up", speed: [0, 0],
                    lifetime: [8, 14], size: [0.6, 0.1], color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 6
                }
            ]
        },
        slump: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gutter", bind: "source", offset: [0, 0.7, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.12, 0.02], color: 0xFF7A2E, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "falling_ash", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "sphere", radius: 0.35 }, direction: "down", speed: [0.02, 0.08], gravity: 0.08,
                    lifetime: [10, 18], size: [0.07, 0.02], color: 0x6A5548, alpha: [0.35, 0], light: "world", maxParticles: 40
                },
                {
                    name: "slump_ash", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "slump", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 }, direction: "down", speed: [0.03, 0.12], gravity: 0.1,
                    lifetime: [12, 20], size: [0.08, 0.02], color: 0x6A5548, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.12], gravity: 0.08,
                    lifetime: [10, 16], size: [0.06, 0.02], color: 0x9A8C6C, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vcreate", 1, VcreateDefinition);

/**
 * 额前那道火 V 的稳定主体：客户端按锚点的真实 bodyYaw 每帧重算前/右/上（MC 前向 [-sin yaw, 0, cos yaw]），
 * 所以旋转 90°/180° 时两翼仍在身前张开、不会退化成一条竖线；无锚点时回退到服务端带上的基。
 * 只用真实世界端点画线/贴图，没有粒子生灭或额外实体：kindle 渐张 → dash 全程贴头 → slump 残焰压暗，
 * shatter 在真实接触点把两翼向外抛成短段。粒子定义里不再出现绕 Y 旋转却沿 +Y 发射的假 V。
 */
const VcreateVScene = "world_combat:move_vcreate/v";
const VcreateFlameSprite = "cobblemon:particle/generic/fire/flame";
const VcreateWispSprite = "cobblemon:particle/generic/fire/wisp";

function vcreateNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function vcreateVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

WorldCombatClient.scene(VcreateVScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const moment = String(data.moment || "dash");
    const scale = Math.max(0.5, Math.min(2.2, vcreateNumber(data.scale, 1)));
    const start = vcreateNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);

    // 命中碎散：在真实接触点沿前/右方向把 V 的两翼向外抛成短段，只活几刻。
    if (moment === "shatter") {
        const life = 10;
        if (!(age < life)) return;
        const fade = Math.max(0, 1 - age / life);
        const direction = vcreateVector(data.direction, [0, 0, 1]);
        let hx = direction[0], hz = direction[2];
        const hl = Math.sqrt(hx * hx + hz * hz);
        if (hl < 1e-6) { hx = 0; hz = 1; } else { hx /= hl; hz /= hl; }
        const rx = -hz, rz = hx;
        const reach = vcreateNumber(data.reach, 0.8) * scale * (0.6 + age * 0.5);
        const alpha = Math.round(220 * fade);
        const stroke = (alpha << 24 | 0xFF7A2E) | 0;
        const px = entry.position[0], py = entry.position[1] + 0.4, pz = entry.position[2];
        frame.line(px, py, pz, px + rx * reach + hx * reach * 0.4, py + reach * 0.5, pz + rz * reach + hz * reach * 0.4, stroke);
        frame.line(px, py, pz, px - rx * reach + hx * reach * 0.4, py + reach * 0.5, pz - rz * reach + hz * reach * 0.4, stroke);
        frame.sprite(VcreateFlameSprite, px, py, pz, 0.28 * fade * scale, 0, (alpha << 24 | 0xFFF0C0) | 0, 0, true);
        return;
    }

    const anchor = JSON.parse(frame.anchor(entry.source));
    let forward: number[], right: number[], up: number[], cx: number, cy: number, cz: number, height: number;
    const yaw = anchor && isFinite(vcreateNumber(anchor.bodyYaw, NaN)) ? Math.PI * vcreateNumber(anchor.bodyYaw, 0) / 180 : NaN;
    if (anchor && isFinite(yaw)) {
        height = Math.max(0.5, vcreateNumber(anchor.height, 1.4));
        forward = [-Math.sin(yaw), 0, Math.cos(yaw)];
        right = [-Math.cos(yaw), 0, -Math.sin(yaw)];
        up = [0, 1, 0];
        cx = anchor.x; cy = anchor.y + height * 0.5; cz = anchor.z;
    } else {
        height = Math.max(0.5, vcreateNumber(data.height, 1.4));
        forward = vcreateVector(data.forward, [0, 0, 1]);
        right = vcreateVector(data.right, [1, 0, 0]);
        up = vcreateVector(data.up, [0, 1, 0]);
        cx = entry.position[0]; cy = entry.position[1]; cz = entry.position[2];
    }
    const dim = moment === "slump";
    const grow = moment === "kindle" ? Math.max(0, Math.min(1, age / Math.max(1, vcreateNumber(data.windup, 8)))) : 1;
    const span = Math.max(0.12, vcreateNumber(data.span, 0.5) * scale) * (dim ? 0.7 : 0.6 + 0.4 * grow);
    const rise = Math.max(0.12, vcreateNumber(data.rise, 0.7) * scale) * (dim ? 0.6 : 0.5 + 0.5 * grow);
    const baseX = cx + forward[0] * 0.18 + up[0] * height * 0.3;
    const baseY = cy + up[1] * height * 0.3;
    const baseZ = cz + forward[2] * 0.18 + up[2] * height * 0.3;
    const lx = baseX - right[0] * span, ly = baseY + rise, lz = baseZ - right[2] * span;
    const rx = baseX + right[0] * span, ry = baseY + rise, rz = baseZ + right[2] * span;
    const alpha = Math.round(dim ? 120 : 150 + 100 * grow);
    const bodyColor = dim ? 0x8A3A1E : 0xFF7A2E;
    const coreColor = dim ? 0x8A3A1E : 0xFFF0C0;
    frame.line(baseX, baseY, baseZ, lx, ly, lz, (alpha << 24 | bodyColor) | 0);
    frame.line(baseX, baseY, baseZ, rx, ry, rz, (alpha << 24 | bodyColor) | 0);
    const strands = Math.max(2, Math.min(7, Math.round(vcreateNumber(data.flames, 24) / 10)));
    for (let i = 1; i <= strands; i++) {
        const t = i / strands;
        frame.sprite(VcreateFlameSprite, baseX + (lx - baseX) * t, baseY + (ly - baseY) * t, baseZ + (lz - baseZ) * t,
            (0.16 + 0.05 * grow) * scale, 0, (alpha << 24 | bodyColor) | 0, i % 5, true);
        frame.sprite(VcreateFlameSprite, baseX + (rx - baseX) * t, baseY + (ry - baseY) * t, baseZ + (rz - baseZ) * t,
            (0.16 + 0.05 * grow) * scale, 0, (alpha << 24 | bodyColor) | 0, (i + 2) % 5, true);
    }
    frame.sprite(VcreateWispSprite, baseX, baseY, baseZ, 0.22 * scale, 0, (alpha << 24 | coreColor) | 0, 0, true);
});
