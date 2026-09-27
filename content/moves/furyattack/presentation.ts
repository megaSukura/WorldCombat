/**
 * 乱击 / furyattack 的客户端表现。
 *
 * 一句话：施法者低头压角，然后用角尖朝身前一刺接一刺地戳出去；每一刺是一根短角影从身前往返到真实接触点，
 *   命中处炸开角风碎屑，被顶退的目标沿刺击方向退出去，失手或戳空时只剩一撮擦空的角尘。
 * 色相家族：角尖暖金（0xFFE9A8）与命中近白（0xFFFFFF）做本体与强调，角风碎屑灰褐（0xB8A67E）只做余韵。
 * 拍子：起 lower（压角亮尖）→ 刺 horn（自定义场景：角影往返到真接触）→ 中 hit（命中）或擦空 → 收 settle。
 * 主体在自定义场景 `world_combat:move_furyattack_horn`：服务端每刺给同一时刻的真实起点与接触点，
 *   客户端只画当前这一刺的短角影，不再铺一条平面走廊；判定与表现共用端点。
 * 数：`data.sparks`（物攻派生）绑定碎屑量，`data.intensity`（每刺威力派生）抬高亮度。
 */
const FuryattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        lower: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 9 },
            emitters: [
                {
                    name: "press", bind: "source", offset: [0, 0.35, -0.35], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: 3, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1], spread: 30, drag: 0.9,
                    lifetime: [6, 10], size: [0.14, 0.04],
                    color: 0xFFE9A8, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.42, 0.1],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.35, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.28 }, direction: "outward", speed: [0.1, 0.32], spread: 30, gravity: 0.06, drag: 0.9,
                    lifetime: [9, 15], size: [0.08, 0.02],
                    color: 0xB8A67E, alpha: [0.5, 0], light: "world", maxParticles: 200
                }
            ]
        },
        settle: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 1.0, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 12], size: [0.16, 0.05],
                    color: 0xFFE9A8, alpha: [0.3, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_furyattack", 1, FuryattackDefinition);

function furyattackNumber(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }
function furyattackClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function furyattackColour(alpha: number, rgb: number): number { return ((Math.round(255 * furyattackClamp(alpha, 0, 1)) << 24) | rgb) | 0; }

/** 乱击的主体：每刺从身前往返到该刺的真实接触点；失手/戳空只留一撮角尘。 */
WorldCombatClient.scene("world_combat:move_furyattack_horn", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const origin = data.origin, contact = data.contact;
    if (!Array.isArray(origin) || origin.length !== 3 || !Array.isArray(contact) || contact.length !== 3) return;
    const start = furyattackNumber(data.start, frame.serverTick());
    const trip = Math.max(1, furyattackNumber(data.trip, 4));
    const age = frame.serverTick() - start;
    if (age < 0 || age > trip + 2) return;
    const half = Math.max(1, Math.round(trip / 2));
    const travel = age <= half ? age / half : Math.max(0, 1 - (age - half) / Math.max(1, trip - half));
    const scale = furyattackNumber(data.scale, 1);
    const miss = data.miss === 1;
    const tip = furyattackClamp(travel * (miss ? 1 : 1.04), 0, 1);
    const tipX = origin[0] + (contact[0] - origin[0]) * tip;
    const tipY = origin[1] + (contact[1] - origin[1]) * tip + 0.35;
    const tipZ = origin[2] + (contact[2] - origin[2]) * tip;
    if (travel <= 0) return;
    const line = furyattackColour(0.85 * travel, miss ? 0xB8A67E : 0xFFE9A8);
    const tipColour = furyattackColour(0.95 * travel, miss ? 0xB8A67E : 0xFFFFFF);
    frame.line(origin[0], origin[1] + 0.35, origin[2], tipX, tipY, tipZ, line);
    frame.sprite("cobblemon:particle/generic/slash", tipX, tipY, tipZ, 0.16 + 0.08 * scale, 0, tipColour, 0, !miss);
    const dust = furyattackClamp(Math.round(furyattackNumber(data.sparks, 12) * 0.35 * travel), 1, 18);
    const dx = tipX - origin[0], dy = tipY - (origin[1] + 0.35), dz = tipZ - origin[2];
    for (let i = 0; i < dust; i++) {
        const f = (i + 0.5) / dust * travel, a = i * 2.1 + travel * 5, r = 0.06 + 0.1 * f;
        frame.sprite("cobblemon:particle/generic/tinydust",
            origin[0] + dx * f + Math.cos(a) * r, origin[1] + 0.35 + dy * f + Math.sin(a * 1.6) * r * 0.5,
            origin[2] + dz * f + Math.sin(a) * r, 0.05 + 0.02 * scale, 0, furyattackColour(0.5 * travel, 0xB8A67E), 0, false);
    }
});
