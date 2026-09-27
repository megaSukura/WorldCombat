/**
 * 日光刃 / solarblade 的客户端表现。
 *
 * 一句话：日光在施法者身侧由真实身体朝向竖着凝成一把整刃 → 身体贴着那道刃贴地踏出去 → 在终点整刃扫过扇内 →
 *         被扫到的活体各自炸开一簇草绿的碎光；挥空只留一小片散开的光屑。
 *
 * 两处主体交给自定义场景（`world_combat:move_solarblade/blade`），只用真实世界端点画线/贴图，没有粒子生灭或额外实体：
 *   gather 由身体锚点与真实 forward/right/up 在局部侧方画出整刃，亮到真实准备结束，转身不落固定世界轴；
 *   slash  从真实落点起，把整刃在 `arc` 张角内从一侧扫到另一侧——整把光刃挥过扇内，而不是只在扇区外缘同时闪一下；
 *          突刺形态换成一条沿 `direction` 的短直刺，与判定同一条直线。
 * 逐刻位移的拖尾交给粒子：`dash` 绑身体 + `trail`，身体每走一步由引擎沿真实历史补点，被墙拦住就收脚。
 *
 * 色相家族：金白（0xFFFBE8 的刃芯、0xFFD873 的刀身）＋中性尘；草绿（impact_grass）只作为命中点的小面积属性强调。
 * 数：`data.blade`（日光与攻击换算）决定凝刃与挥斩的密度，`data.intensity`（威力/130）决定亮度，
 *     `data.reach` 与 `data.arc` 决定刃的尺度和张角，`data.scale`（半径/3.2）决定碎光大小。
 */
const SolarBladeLight = "cobblemon:particle/generic/lightbeam";
const SolarBladeCut = "cobblemon:particle/generic/cut";
const SolarBladeSpark = "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";

function solarbladeVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

function solarbladeNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

const SolarBladeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        dash: {
            duration: 0,
            exit: { stop: 0, drain: 10 },
            emitters: [
                {
                    name: "dash_lines", bind: "source", offset: [0, 0.45, 0], height: 0.45, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    trail: { minDistance: 0.28 },
                    rate: { data: "blade", fallback: 14 }, shape: { kind: "line", length: 0.7 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [4, 9], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xFFFBE8, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "dash_grit", bind: "source", offset: [0, 0.02, 0], height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.24 },
                    rate: 26, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 14], size: [0.06, 0.02],
                    color: 0xB8A87E, alpha: [0.45, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "blade", fallback: 16 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.32 } },
                    direction: "outward", speed: [0.07, 0.24], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEFFFC0, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "hit_grit", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "blade", fallback: 12 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.34 } },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC0A86A, alpha: [0.6, 0], light: "world", maxParticles: 100
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle_motes", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "blade", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFE9A0, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_solarblade", 1, SolarBladeDefinition);

WorldCombatClient.scene("world_combat:move_solarblade/blade", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const anchor = JSON.parse(frame.anchor(entry.source));
    let x = entry.position[0], y = entry.position[1], z = entry.position[2];
    if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; }
    const direction = solarbladeVector(data.direction, [0, 0, 1]);
    const right = solarbladeVector(data.right, [1, 0, 0]);
    const up = solarbladeVector(data.up, [0, 1, 0]);
    const start = solarbladeNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const moment = data.moment;

    if (moment === "gather") {
        const windup = Math.max(1, solarbladeNumber(data.windup, 20));
        if (age > windup + 6) return;
        const span = Math.max(0.8, solarbladeNumber(data.span, 1.4));
        const side = solarbladeNumber(data.side, 0.5);
        const glow = Math.min(1, age / windup);
        const bx = x + right[0] * side, by = y + right[1] * side - 0.15, bz = z + right[2] * side;
        const tx = bx + up[0] * span, ty = by + up[1] * span, tz = bz + up[2] * span;
        const alpha = Math.round(60 + 180 * glow);
        frame.line(bx, by, bz, tx, ty, tz, (alpha << 24 | 0xFFD873) | 0);
        const strands = Math.max(2, Math.min(8, Math.round(solarbladeNumber(data.blade, 12) / 6)));
        for (let i = 0; i <= strands; i++) {
            const t = i / strands;
            frame.sprite(SolarBladeLight, bx + (tx - bx) * t, by + (ty - by) * t, bz + (tz - bz) * t,
                0.2 + 0.14 * glow, 0, (alpha << 24 | 0xFFFBE8) | 0, i % 6, true);
        }
        return;
    }

    if (moment === "slash") {
        const duration = Math.max(6, solarbladeNumber(data.duration, 20));
        if (age > duration) return;
        const reach = Math.max(1, solarbladeNumber(data.reach, 3.2));
        const arc = Math.max(10, solarbladeNumber(data.arc, 120));
        const strandCount = Math.max(1, Math.min(3, Math.round(solarbladeNumber(data.blade, 12) / 10)));
        const thrust = solarbladeNumber(data.thrust, 0) > 0.5;
        const t = Math.min(1, age / duration);
        const alpha = Math.round(220 * (1 - Math.max(0, t - 0.72) / 0.28));
        const color = (alpha << 24 | 0xFFFBE8) | 0;
        const tip = (alpha << 24 | 0xFFD873) | 0;

        if (thrust) {
            const ex = x + direction[0] * reach, ey = y + 0.5 + direction[1] * reach, ez = z + direction[2] * reach;
            frame.line(x, y + 0.5, z, ex, ey, ez, color);
            for (let i = 0; i <= strandCount; i++) {
                const s = i / strandCount;
                frame.sprite(SolarBladeCut, x + (ex - x) * s, y + 0.5 + (ey - (y + 0.5)) * s, z + (ez - z) * s,
                    0.34, 0, color, i % 5, true);
            }
            frame.sprite(SolarBladeSpark, ex, ey, ez, 0.3, 0, tip, 0, true);
            return;
        }

        let hx = direction[0], hz = direction[2];
        const hl = Math.sqrt(hx * hx + hz * hz);
        if (hl < 1e-6) { hx = 0; hz = 1; } else { hx /= hl; hz /= hl; }
        const half = arc * Math.PI / 360;
        const angle = -half + 2 * half * t;
        // 整把光刃在扇内扫过：主刃 + 几道尾随残影，覆盖扇面内部而不是只在弧缘闪一下。
        for (let ghost = 3; ghost >= 0; ghost--) {
            const a = angle - 2 * half * (ghost * 0.05);
            const cs = Math.cos(a), sn = Math.sin(a);
            const dx = hx * cs + hz * sn, dz = -hx * sn + hz * cs;
            const gAlpha = Math.max(0, Math.round(alpha * (ghost === 0 ? 1 : 0.3 - ghost * 0.06)));
            const gColor = (gAlpha << 24 | (ghost === 0 ? 0xFFFBE8 : 0xFFD873)) | 0;
            frame.line(x, y + 0.5, z, x + dx * reach, y + 0.5, z + dz * reach, gColor);
        }
        const cs = Math.cos(angle), sn = Math.sin(angle);
        const dx = hx * cs + hz * sn, dz = -hx * sn + hz * cs;
        for (let i = 0; i <= strandCount; i++) {
            const s = i / strandCount;
            frame.sprite(SolarBladeCut, x + dx * reach * s, y + 0.5, z + dz * reach * s, 0.3, 0, color, i % 5, true);
        }
        frame.sprite(SolarBladeSpark, x + dx * reach, y + 0.5, z + dz * reach, 0.32, 0, tip, 0, true);
    }
});
