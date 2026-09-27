/**
 * 啄钻 / drillpeck 的客户端表现。
 *
 * 一句话：原地转起来、翅与气流拧成一圈上升的螺旋，随后一条钻轴贴着身前捅出去，尖喙一口接一口咬进目标、
 * 每咬一口崩起一圈羽毛与碎屑；对离地的目标，螺旋从下方往上卷得更亮。
 * 色相家族：天青（0x9FD6FF）作主体、钢灰（0xB8C6D8）作余韵、亮白（0xE8F6FF）作强调；中性尘屑收尾。
 * 拍子：起 spin（旋起螺旋）→ 击 bore（钻轴捅出）与 bite（每一口）→ 收 dive（对空更亮）或 drift（目标脱离）／whiff。
 * 范围：bore 的钻轴用 `data.path`（与服务端 lane 同一条轴）画成一条窄带，玩家一眼看出只有这条轴上会被钻到。
 * 运动：螺旋绕轴自转并沿 `data.direction` 前推，每一口的碎屑从目标身上向外崩开、带重力落下。
 * 数：钻轴粒子量绑 `data.shavings`（物攻换算），口数脉冲绑 `data.bites`（速度与配置换算），空中命中另起更亮的幕。
 */
const DrillpeckDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        spin: {
            duration: 16,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "whirl", bind: "source", offset: [0, 0.5, 0.12], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 10, shape: { kind: "cylinder", radius: 0.4, length: 0.8 },
                    direction: "inward", speed: [0.03, 0.1], spin: 20,
                    lifetime: [5, 10], size: [0.22, 0.05],
                    color: 0xBFE4F6, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "wind", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.18, 0.04],
                    color: 0xE8F6FF, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        bore: {
            duration: 0,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "drill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/drill",
                    shape: { kind: "polyline" }, burst: { count: { data: "shavings", fallback: 10 } },
                    direction: "shape", orient: "direction", speed: [0.06, 0.2], spread: 12, spin: 16,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE8F6FF, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "gust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: { data: "bites", fallback: 3 }, interval: 2 },
                    direction: "shape", orient: "direction", speed: [0.12, 0.32],
                    lifetime: [5, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9FD6FF, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        bite: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "peck", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.2], spread: 22,
                    lifetime: [5, 9], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.35
                },
                {
                    name: "feathers", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: { data: "shavings", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xBFE4F6, alpha: [0.8, 0], gravity: 0.04, light: "world", maxParticles: 40
                }
            ]
        },
        dive: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "rise", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 12, interval: 2, repeats: 2 },
                    shape: { kind: "cylinder", radius: 0.24, length: 0.9 },
                    direction: "up", speed: [0.1, 0.28],
                    lifetime: [6, 12], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xE8F6FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 36
                },
                {
                    name: "spiral", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.22], spin: 18,
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9FD6FF, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        drift: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "loose", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [6, 11], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x9FD6FF, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: 14, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.4, angleDegrees: 22 },
                    direction: "outward", speed: [0.1, 0.26], spin: 12,
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBFE4F6, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_drillpeck", 1, DrillpeckDefinition);

/**
 * 真实钻头：服务端每一口按当前身体轴上传一次轴线与钻头压深，客户端固定数量的贴图绕轴自转、从锥底收紧到喙尖，
 * 读得出「围轴钻进、随身体前推」而不是整条轴随机撒贴图。轴线端点与剑击判定共用；实际命中仍由服务端 `bite` 回执驱动。
 */
const DrillpeckHeadDrill = "cobblemon:particle/generic/drill";
const DrillpeckHeadSpiral = "cobblemon:particle/generic/spinbeam";
const DrillpeckHeadTip = "cobblemon:particle/generic/impact/impact_flying";

function drillpeckNumberAt(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function drillpeckVecAt(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

function drillpeckPointsAt(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const points: number[][] = [];
    for (let i = 0; i < value.length; i++) { const point = drillpeckVecAt(value[i], null); if (point) points.push(point); }
    return points;
}

WorldCombatClient.scene("world_combat:move_drillpeck_head", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = drillpeckPointsAt(data.path);
    if (path.length < 2) return;
    const scale = Math.max(0.5, Math.min(1.8, drillpeckNumberAt(data.scale, 1)));
    const intensity = Math.max(0.4, Math.min(2.4, drillpeckNumberAt(data.intensity, 1)));
    const origin = path[0];
    const far = path[1];
    const dir = drillpeckVecAt(data.direction, [0, 0, 1])!;
    const length = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]) || 1;
    const ux = dir[0] / length, uz = dir[2] / length;
    let sx = -uz, sz = ux;
    const side = Math.sqrt(sx * sx + sz * sz);
    if (side < 1e-4) { sx = 1; sz = 0; } else { sx /= side; sz /= side; }
    const head = drillpeckVecAt(data.head, [far[0], far[1], far[2]])!;
    const tick = frame.serverTick();
    frame.line(origin[0], origin[1], origin[2], head[0], head[1], head[2], 0x669FD6FF | 0);
    const beads = 6 + Math.round(intensity * 2);
    for (let i = 0; i < beads; i++) {
        const t = beads <= 1 ? 1 : i / (beads - 1);
        const along = 0.4 + 0.6 * t;
        const px = origin[0] + (head[0] - origin[0]) * along;
        const py = origin[1] + (head[1] - origin[1]) * along;
        const pz = origin[2] + (head[2] - origin[2]) * along;
        const angle = tick * 0.7 + t * Math.PI * 4;
        const radius = (0.22 - 0.16 * t) * scale;
        const ox = Math.cos(angle) * radius, oy = Math.sin(angle) * radius;
        frame.sprite(DrillpeckHeadSpiral,
            px + sx * ox, py + oy, pz + sz * ox,
            (0.13 + 0.06 * (1 - t)) * scale, (angle * 180 / Math.PI) % 360, 0xCC9FD6FF | 0, Math.floor(tick / 2 + i) % 27, true);
        frame.sprite(DrillpeckHeadDrill,
            px + sx * ox * 0.8, py + oy * 0.8, pz + sz * ox * 0.8,
            (0.2 + 0.05 * (1 - t)) * scale, (angle * 180 / Math.PI) % 360, 0xFFE8F6FF | 0, Math.floor(tick / 2 + i) % 6, true);
    }
    frame.sprite(DrillpeckHeadTip, head[0], head[1], head[2], (0.26 + 0.1 * intensity) * scale,
        0, 0xFFFFFFFF | 0, Math.floor(tick) % 7, true);
});
