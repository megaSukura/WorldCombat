/**
 * 吐丝 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：从口边射出一缕银白的丝，丝身后拖着速度线；撞上对手时收紧成一条线、爆开一小团丝结把腿脚裹住；
 *   撞上墙面时同一根丝绷在表面上，只在真实接触点外侧摊开一小片网，摊不下就只留一段装饰丝。
 *
 * 色相家族：近白丝（0xF2F0E8）与冷灰（0xE6E2D6／0xD9DED8）为主体，深一点的灰只做细节。没有第二个色相。
 * 层次：丝光（起手）→ 丝身＋速度线（飞行）→ 丝结＋绷紧连线（缠住）→ 首碰表面小网（实放）→
 *   短丝印（没摊开）→ 掉速到底线的灰白（无效）→ 未干丝光（持续）。
 * 起击收：windup（蓄丝）→ strand（丝飞出去）→ bind／net（落到人身上或表面）→ tangle（只留装饰丝）→ linger。
 * 数：缠住时爆开的丝量按服务端 data.coils 派生；实放蛛网按服务端真正 placed 的格子（data.cells）与表面法线
 *   逐格画，范围就是实际放下的格数，不再把结网半径当已铺开的范围。
 */
const StringShotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "silk_gather", bind: "source", offset: [0, 0.25, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0xF2F0E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        strand: {
            duration: 20,
            emitters: [
                {
                    name: "strand_wisp", bind: "projectile", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.14, 0.03], spin: 14,
                    color: 0xF2F0E8, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "strand_dash", bind: "projectile", height: 0.15, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 3, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xD9DED8, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        bind: {
            duration: 28,
            emitters: [
                {
                    name: "bind_core", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "coils", fallback: 18 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [8, 14], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xEDEDED, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "bind_wrap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.18, 0.06],
                    color: 0xD9DED8, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "bind_line", bind: "path", offset: [0, 0.72, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xF2F0E8, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        net: {
            duration: 30,
            emitters: [
                {
                    name: "net_taut", bind: "path", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    shape: { kind: "polyline" },
                    rate: 20, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xD9DED8, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        tangle: {
            duration: 22,
            emitters: [
                {
                    name: "tangle_knot", bind: "point", height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.04],
                    color: 0xE6E2D6, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "tangle_line", bind: "path", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    shape: { kind: "polyline" },
                    rate: 16, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xF2F0E8, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "tangle_dust", bind: "point", height: 0.18, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.06], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2F0E8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        ward: {
            duration: 18,
            emitters: [
                {
                    name: "ward_fade", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD9DED8, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_silk", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 3, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0xE6E2D6, alpha: [0.35, 0], light: "world", maxParticles: 14
                },
                {
                    name: "linger_dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xF2F0E8, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stringshot", 1, StringShotDefinition);

function stringshotNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function stringshotVec(value: any): number[] | null {
    return Array.isArray(value) && value.length === 3 && (value as any[]).every(n => typeof n === "number" && isFinite(n))
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : null;
}
function stringshotColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 实放蛛网（自定义客户端场景，不生成粒子或实体）：服务端只传来 `terrainResult` 真正 placed 的方块格
 * （data.cells）与首碰表面法线（data.normal）；这里在每个格子的外侧面上画一小片贴在表面上的网纹。
 * 放不下就根本没有这个场景，范围与实际方块一致，不再把一个半径当成已铺开的网。
 */
WorldCombatClient.scene("world_combat:move_stringshot_net", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const cells = data.cells;
    const normal = stringshotVec(data.normal);
    if (!Array.isArray(cells) || cells.length === 0 || !normal) return;
    const life = Math.max(1, stringshotNumber(data.life, 30));
    const age = Math.max(0, frame.serverTick() - stringshotNumber(data.tick, frame.serverTick()));
    const fade = Math.max(0, 1 - age / life);
    if (fade <= 0) return;
    // 表面平面：水平面用 x/z；x 法线用 z/y；其余用 x/y。
    let ux = 1, uy = 0, uz = 0, vx = 0, vy = 1, vz = 0;
    if (Math.abs(normal[1]) > 0.5) { ux = 1; uy = 0; uz = 0; vx = 0; vy = 0; vz = 1; }
    else if (Math.abs(normal[0]) > 0.5) { ux = 0; uy = 0; uz = 1; vx = 0; vy = 1; vz = 0; }
    const threads = Math.max(8, Math.min(60, Math.round(stringshotNumber(data.threads, 12))));
    const half = 0.34;
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (!Array.isArray(cell) || cell.length < 3) continue;
        const cx = Number(cell[0]) + 0.5 + normal[0] * 0.52;
        const cy = Number(cell[1]) + 0.5 + normal[1] * 0.52;
        const cz = Number(cell[2]) + 0.5 + normal[2] * 0.52;
        const shade = 0xE6E2D6;
        // 方形外框
        const corners = [[-half, -half], [half, -half], [half, half], [-half, half]];
        for (let k = 0; k < 4; k++) {
            const a = corners[k], b = corners[(k + 1) % 4];
            frame.line(cx + ux * a[0] + vx * a[1], cy + uy * a[0] + vy * a[1], cz + uz * a[0] + vz * a[1],
                cx + ux * b[0] + vx * b[1], cy + uy * b[0] + vy * b[1], cz + uz * b[0] + vz * b[1],
                stringshotColour(0.55 * fade, shade));
        }
        // 对角与中心辐条：丝数越多越密。
        const spokes = Math.max(2, Math.min(4, Math.round(threads / 12)));
        for (let k = 0; k < spokes; k++) {
            const a = k * Math.PI * 2 / spokes / 2;
            const ex = Math.cos(a) * half, ey = Math.sin(a) * half;
            frame.line(cx, cy, cz, cx + ux * ex + vx * ey, cy + uy * ex + vy * ey, cz + uz * ex + vz * ey,
                stringshotColour(0.4 * fade, 0xF2F0E8));
        }
    }
});
