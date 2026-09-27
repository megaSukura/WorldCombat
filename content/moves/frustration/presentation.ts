/**
 * 迁怒 / frustration 的客户端表现。
 *
 * 一句话：暗色的怨气在身前攥成一簇刺团，随后贴着目标一爪接一爪地抓出去，每爪左右交替甩出一道短促的暗色抓痕与白芯，
 * 只有最后一爪明确把目标抛开（fling 沿抓击方向炸开一线），收势时余恨从身上散开。
 * 色相家族：暗紫栗（obscuringsmoke、impact_dark、slash 染暗）为主，抓痕芯是近白（impact_normal），
 * 速度线用灰紫；没有暖色。
 * 拍子：起（coil 聚恨）→ 行（rush 扑近）→ 击（hit 命中接触点爆一下）→ 抛（fling 最后一爪抛开）→ 收（spite 余恨 / miss 扑空）。
 * 范围：每爪的短扫段主体交给自定义场景 `world_combat:move_frustration/claw`，用服务端判定同一条世界端点画左右交替的刃线；
 *   命中的暗色冲击只在真实接触点爆一下，挥空只留刃迹、不撒粒子。
 * 运动：刺团从四面收进来；每爪刃线在身体前方交替甩出、很快收住；最后一爪沿真实顶开方向炸开一线；余恨向四周散开。
 * 数：`data.near`／`data.far`（当刻刃段两端）与 `data.hit`（真实接触点）驱动刃线与命中标记；`data.sparks` 决定碎屑量，
 *   `data.intensity` 抬高亮度；`data.moved`（真实推开距离）决定 fling 抛出线的长度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FrustrationDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "spite_gather", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0x5A3149, alpha: [0.5, 0], light: "world", maxParticles: 50
                },
                {
                    name: "claw_sparks", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "rakes", fallback: 2 }, interval: 3, repeats: 2 },
                    shape: { kind: "box", size: [0.5, 0.4, 0.5] },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xC9A6BC, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        rush: {
            duration: 44,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "rush_smoke", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 24, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.12, 0.03],
                    color: 0x4B2939, alpha: [0.45, 0], light: "world", maxParticles: 120
                },
                {
                    name: "rush_lines", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 28, shape: { kind: "box", size: [0.3, 0.45, 0.3] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [3, 7], size: [0.14, 0.04],
                    color: 0xB79AB0, alpha: [0.4, 0], light: "full", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "claw_hit", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.22], spread: 24,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xF0E6EC, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "claw_specks", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.02, drag: 0.92,
                    lifetime: [7, 14], size: [0.06, 0.02],
                    color: 0x8E6E82, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        fling: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fling_cut", bind: "point", fit: "none", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 2, at: 0 },
                    shape: { kind: "line", length: { data: "moved", fallback: 0.5 } },
                    orient: "direction", direction: "shape", speed: [0.2, 0.55], spin: 120,
                    lifetime: [4, 9], size: [0.32, 0.06], sizeMode: "index",
                    color: 0x8A4766, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 16
                },
                {
                    name: "fling_spite", bind: "point", fit: "none", offset: [0, 0.42, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "line", length: { data: "moved", fallback: 0.5 } },
                    orient: "direction", direction: "shape", speed: [0.1, 0.3],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x8E6E82, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        spite: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "spite_out", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "embers", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.16],
                    drag: 0.94,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x5A3149, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "overrun", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.03, drag: 0.93,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xA98CA0, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_frustration", 1, FrustrationDefinition);

/**
 * 每一爪的真实刃段：服务端把判定用的同一组世界端点写进 data.near／data.far，客户端只按这组端点画线，不再是绑在
 * 身上的固定世界偏移。左右交替由服务端的 side 决定，命中时 data.hit 是真实接触点，挥空时只留下渐隐的刃迹。
 * 只用真实世界端点画线/贴图，没有粒子生灭或额外实体；每爪独立短寿命，替换同一 key 保持一次一对爪。
 */
const FrustrationClawScene = "world_combat:move_frustration/claw";
const FrustrationSlash = "cobblemon:particle/generic/slash";
const FrustrationCut = "cobblemon:particle/generic/cut";

function frustrationNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function frustrationTriple(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}

WorldCombatClient.scene(FrustrationClawScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const near = frustrationTriple(data.near), far = frustrationTriple(data.far);
    if (near === null || far === null) return;
    const moment = String(data.moment || "rake");
    const start = frustrationNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const life = moment === "rake" ? 10 : 8;
    if (!(age < life)) return;
    const fade = Math.max(0, 1 - age / life);
    const side = frustrationNumber(data.side, 1);
    const last = frustrationNumber(data.last, 0) > 0;
    const base = moment === "rake" ? 235 : 165;
    const alpha = Math.round(base * fade);
    const stroke = (alpha << 24 | (last ? 0x9A4A6E : 0x7A3B5A)) | 0;
    const edge = (Math.round(alpha * 0.5) << 24 | 0xC9A6BC) | 0;
    const dx = far[0] - near[0], dy = far[1] - near[1], dz = far[2] - near[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const hx = -dz / length, hz = dx / length, off = 0.05;
    frame.line(near[0], near[1], near[2], far[0], far[1], far[2], stroke);
    frame.line(near[0] + hx * off, near[1], near[2] + hz * off, far[0] + hx * off, far[1], far[2] + hz * off, edge);
    frame.line(near[0] - hx * off, near[1], near[2] - hz * off, far[0] - hx * off, far[1], far[2] - hz * off, edge);
    frame.sprite(FrustrationSlash, far[0], far[1], far[2], 0.32 * fade, 0, stroke, side > 0 ? 4 : 5, true);
    const hit = frustrationTriple(data.hit);
    if (moment === "rake" && hit !== null) frame.sprite(FrustrationCut, hit[0], hit[1], hit[2], 0.4 * fade, 0, (alpha << 24 | 0xF0E6EC) | 0, 0, true);
});
