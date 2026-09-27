/**
 * 蟹钳锤 / crabhammer 的客户端表现。
 *
 * 一句话：钳口高举过顶、海水在钳面上聚成一层薄膜 → 钳子沿真实弧线逐刻下砸，钳尖带出水光 → 砸到实体或地表才在
 *   接触处压出一片前扇水花、扇缘按实际半径铺开 → 裂甲档位下目标的架势被敲裂、溅起碎屑 → 什么都没碰到时只在弧尖散水。
 * 色相家族：深海青（0x1F8FA8 主体、0x5FC4D4 亮面）＋浪白（0xEAFBFF）只出现在浪尖与命中，比水流尾的浅蓝更深一档。
 * 拍子：起 hoist（举钳聚水）→ 砸 press（每刻沿当前真实子段下move，钳尖随弧移动）→ slam（接触爆开）→ crack（敲裂）+ shock（前扇）+ spill（被掀旁人）→ 收 miss。
 * 主体：press 的钳形由自定义场景 `world_combat:move_crabhammer/pincer` 按当刻钳尖与臂向绘制；前扇由自定义场景
 *   `world_combat:move_crabhammer/fan` 按实际 radius/span 画扇缘与放射边，判定与表现共用同一起点与朝向。
 * 数：`data.splash`（体重与物攻换算）决定浪花与碎屑量，`data.scale`（前扇半径换算）决定爆开与扇的尺度，
 *   `data.intensity`（砸击威力换算）抬高密度与亮度。
 */
const CrabhammerPincerScene = "world_combat:move_crabhammer/pincer";
const CrabhammerFanScene = "world_combat:move_crabhammer/fan";
const CrabhammerWaterHeadSprite = "cobblemon:particle/generic/water/waterjet_head";
const CrabhammerRippleSprite = "cobblemon:particle/generic/water/water_ripple";

const CrabhammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        hoist: {
            duration: { data: "windup", fallback: 16 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 1.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 30, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.04, 0.16], spin: 8,
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x5FC4D4, alpha: [0.7, 0], light: "world", maxParticles: 110
                },
                {
                    name: "film", bind: "source", offset: [0, 1.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble_krabby",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.18, 0.04],
                    color: 0xEAFBFF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 50
                }
            ]
        },
        press: {
            exit: { drain: 12 },
            emitters: [
                {
                    name: "pincer", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    shape: { kind: "polyline" },
                    rate: 46, direction: "outward", speed: [0.02, 0.1], spread: 16,
                    lifetime: [6, 11], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x5FC4D4, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "edge", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble_krabby",
                    shape: { kind: "polyline" },
                    rate: 22, direction: "outward", speed: [0.01, 0.06],
                    lifetime: [7, 12], size: [0.24, 0.05],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 60
                }
            ]
        },
        slam: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "crush", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.12, 0.42], spread: 24,
                    lifetime: [7, 13], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "spray", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.14, 0.46], spread: 30,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [12, 22], size: [0.24, 0.05],
                    color: 0x5FC4D4, alpha: [0.9, 0], light: "world", maxParticles: 140
                },
                {
                    name: "ground", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [12, 20], size: [0.7, 1.5], sizeMode: "sin",
                    color: 0x1F8FA8, alpha: [0.45, 0], light: "world", maxParticles: 6
                }
            ]
        },
        crack: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "splinter", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28, spin: 10,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [11, 20], size: [0.16, 0.03],
                    color: 0xB9D4DC, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "crackshine", bind: "target", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        shock: {
            duration: 26,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "foam", bind: "point", fit: "world", orient: "heading", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "sector", radius: { data: "radius", fallback: 2.2 }, angleDegrees: { data: "span", fallback: 90 } },
                    direction: "up", speed: [0.06, 0.22], spread: 22,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "haze", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.08],
                    lifetime: [16, 28], size: [0.3, 0.5],
                    color: 0x1F8FA8, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        },
        spill: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "douse", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 2, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.24, 0.5], sizeMode: "sin",
                    color: 0x5FC4D4, alpha: [0.6, 0], light: "world", maxParticles: 8
                },
                {
                    name: "beads", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "splash", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "up", speed: [0.05, 0.18], spread: 24,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xEAFBFF, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "puddle", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.3, 0.8],
                    color: 0x5FC4D4, alpha: [0.4, 0], light: "world", maxParticles: 4
                },
                {
                    name: "drops", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "splash", fallback: 18 }, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.05, 0.16], spread: 20,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 17], size: [0.07, 0.02],
                    color: 0xEAFBFF, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crabhammer", 1, CrabhammerDefinition);

function crabhammerTriple(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}
function crabhammerNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

// The claw is a fixed, real shape at the current pincer tip: two prongs opened along the swing heading plus a bright head,
// redrawn each tick from the tip the server judged with. Nothing is spawned; it leaves with the action's present key.
WorldCombatClient.scene(CrabhammerPincerScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const point = crabhammerTriple(data.point);
    if (point === null) return;
    const root = crabhammerTriple(data.root);
    const dir = crabhammerTriple(data.direction);
    const scale = Math.max(0.6, Math.min(2.2, crabhammerNumber(data.scale, 1)));
    const intensity = Math.max(0.6, Math.min(2.2, crabhammerNumber(data.intensity, 1)));
    const alpha = Math.round(Math.max(120, Math.min(235, 150 + intensity * 35)));
    const main = (alpha << 24 | 0x1F8FA8) | 0;
    const bright = (alpha << 24 | 0x5FC4D4) | 0;
    const edge = (Math.round(alpha * 0.7) << 24 | 0xEAFBFF) | 0;
    // Arm direction: from the raised claw root to the current tip, falling back to straight down.
    let ax = 0, ay = -1, az = 0;
    if (root !== null) {
        const dx = point[0] - root[0], dy = point[1] - root[1], dz = point[2] - root[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length > 1e-3) { ax = dx / length; ay = dy / length; az = dz / length; }
    }
    // Horizontal right of the swing heading gives the claw a stable opening across camera angles.
    let rx = 0, rz = 1;
    if (dir !== null) {
        const hx = dir[0], hz = dir[2], length = Math.sqrt(hx * hx + hz * hz);
        if (length > 1e-6) { rx = -hz / length; rz = hx / length; }
    }
    const spread = 0.24 * scale, forward = 0.3 * scale, back = 0.12 * scale;
    const base = [point[0] - ax * back, point[1] - ay * back, point[2] - az * back];
    const left = [point[0] + ax * forward + rx * spread, point[1] + ay * forward, point[2] + az * forward + rz * spread];
    const right = [point[0] + ax * forward - rx * spread, point[1] + ay * forward, point[2] + az * forward - rz * spread];
    frame.line(base[0], base[1], base[2], left[0], left[1], left[2], main);
    frame.line(base[0], base[1], base[2], right[0], right[1], right[2], main);
    frame.line(point[0], point[1], point[2], left[0], left[1], left[2], bright);
    frame.line(point[0], point[1], point[2], right[0], right[1], right[2], bright);
    frame.sprite(CrabhammerWaterHeadSprite, point[0], point[1], point[2], 0.5 * scale, 0, edge, 0, true);
});

// The forward fan is drawn at its real radius and span: the outer rim plus the two radial edges follow the same origin,
// heading and radius the server judged with, so a bystander reads exactly how far the water reached.
WorldCombatClient.scene(CrabhammerFanScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const origin = crabhammerTriple(data.point) || crabhammerTriple(entry.position);
    if (origin === null) return;
    const dir = crabhammerTriple(data.direction);
    if (dir === null) return;
    const radius = Math.max(0.4, crabhammerNumber(data.radius, 2.2));
    const span = Math.max(10, Math.min(180, crabhammerNumber(data.span, 90)));
    const start = crabhammerNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const life = 24, progress = Math.max(0, Math.min(1, age / life));
    const alpha = Math.round(200 * (1 - progress) * (1 - progress));
    if (alpha <= 6) return;
    const main = (alpha << 24 | 0x1F8FA8) | 0;
    const edgeColor = (Math.round(alpha * 0.85) << 24 | 0x5FC4D4) | 0;
    const base = Math.atan2(dir[0], dir[2]), half = span * Math.PI / 360;
    const samples = Math.max(4, Math.round(span / 15));
    const px = [], pz = [];
    for (let i = 0; i <= samples; i++) {
        const angle = base - half + (2 * half) * i / samples;
        px.push(origin[0] + Math.sin(angle) * radius);
        pz.push(origin[2] + Math.cos(angle) * radius);
    }
    for (let i = 0; i < samples; i++) frame.line(px[i], origin[1] + 0.08, pz[i], px[i + 1], origin[1] + 0.08, pz[i + 1], edgeColor);
    frame.line(origin[0], origin[1] + 0.08, origin[2], px[0], origin[1] + 0.08, pz[0], main);
    frame.line(origin[0], origin[1] + 0.08, origin[2], px[samples], origin[1] + 0.08, pz[samples], main);
    // Ripples sit exactly on the reached rim; their count follows the real radius, not a second constant.
    const beads = Math.max(4, Math.min(14, Math.round(radius * 3)));
    for (let i = 0; i < beads; i++) {
        const angle = base - half + (2 * half) * (i + 0.5) / beads;
        frame.sprite(CrabhammerRippleSprite, origin[0] + Math.sin(angle) * radius, origin[1] + 0.1, origin[2] + Math.cos(angle) * radius,
            0.5, 0, edgeColor, i % 5, false);
    }
});
