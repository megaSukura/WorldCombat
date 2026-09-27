/**
 * 超级角击 / megahorn 的客户端表现。
 *
 * 一句话：后腿刨起一圈土，角尖压低攒起一线金光，随后一根真正的金角沿真实三维方向送出、角尖在接触点停住；
 * 被扎中的目标身上炸开虫系冲击与碎屑，角要么把伤口的残刺留下、慢慢随减速消退，要么被猛甩出来、把人挑上空中。
 * 色相家族：琥珀金（0xD9A63A）作主体、橄榄绿（0x9AB24A）作细节、暖白（0xF6E6B8）作强调；中性尘屑收尾。
 * 拍子：起 charge（刨地蓄势）→ 击 horn/thrust（一根角尖送入）与 pierce（扎实）／wall（撞墙）→ 收 pin（留刺随减速消退）或 toss（挑飞）。
 * 本体：角由自定义场景 `move_megahorn_horn` 按服务端真实端点画一根从粗到尖的角，角尖停在接触点；thrust 粒子只作尘屑陪衬。
 * 拥有：pin 的留刺由服务端 WorldFeedback.onEffect 绑在减速 carrier 的托管 mark 上，减速结束即收，不留残影。
 * 数：碎屑量绑 `data.shards`（物攻换算）、命中爆点绑同一个值；角长与体积绑 `data.scale`（射程换算）。
 */
const MegahornDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "paw", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spread: 18,
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0xB9A06A, alpha: [0.5, 0], gravity: 0.05, drag: 0.94, light: "world", maxParticles: 34
                },
                {
                    name: "aim", bind: "source", offset: [0, 0.55, 0.34], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.16, 0.04],
                    color: 0xF0D060, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 22
                },
                {
                    name: "hone", bind: "source", offset: [0, 0.55, 0.34], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 5, shape: { kind: "line", length: 0.7 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xD9A63A, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        thrust: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "tracks", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xB9A06A, alpha: [0.5, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 30
                },
                {
                    name: "slipstream", bind: "source", offset: [0, 0.45, 0.15], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "line", length: 0.9 },
                    direction: "velocity", speed: [0.08, 0.22],
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xF6E6B8, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        pierce: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shatter", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "barbs", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xD9A63A, alpha: [0.85, 0], light: "world", maxParticles: 46
                },
                {
                    name: "powder", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0x9AB24A, alpha: [0.55, 0], gravity: 0.05, drag: 0.94, light: "world", maxParticles: 32
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "hardstop", bind: "point", height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "shards", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2], spread: 30,
                    gravity: 0.08, drag: 0.92, spin: 12,
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xB9A06A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "sparks", bind: "point", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [5, 10], size: [0.14, 0.03],
                    color: 0xF6E6B8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        pin: {
            // 时长由托管 mark 的生命周期决定：减速持续多久，留刺就随它留多久，不写死。
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hold", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.24, 0.06],
                    color: 0xE0C86A, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "grip", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xB9A06A, alpha: [0.55, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        toss: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [6, 12], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xF6E6B8, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "clods", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [9, 18], size: [0.1, 0.03],
                    color: 0xB9A06A, alpha: [0.6, 0], gravity: 0.08, drag: 0.94, light: "world", maxParticles: 40
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 11], size: [0.16, 0.03],
                    color: 0xF0D060, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.55, 0.5], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 14, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.4, angleDegrees: 16 },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [5, 10], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xD9A63A, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_megahorn", 1, MegahornDefinition);

const MegahornHornSpike = "cobblemon:particle/generic/spike";
const MegahornHornGlint = "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";

function megahornNumberAt(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function megahornVecAt(value: any): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return null;
}

function megahornColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 一根角：服务端传回 origin→角尖的真实三维端点（命中时角尖停在接触点）。从角根到角尖逐枚贴图由粗到尖，尖端再亮一下；
 * 固定数量图形，没有粒子生灭或额外实体。角尖的位置就是判定的接触位置。
 */
WorldCombatClient.scene("world_combat:move_megahorn_horn", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    const a = megahornVecAt(path[0]), b = megahornVecAt(path[1]);
    if (!a || !b) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(length > 0.05)) return;
    const ux = dx / length, uy = dy / length, uz = dz / length;
    const reference = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let rx = uy * reference[2] - uz * reference[1];
    let ry = uz * reference[0] - ux * reference[2];
    let rz = ux * reference[1] - uy * reference[0];
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;
    const scale = Math.max(0.6, Math.min(1.9, megahornNumberAt(data.scale, 1)));
    const intensity = Math.max(0.5, Math.min(2.4, megahornNumberAt(data.intensity, 1)));
    frame.line(a[0], a[1], a[2], b[0], b[1], b[2], megahornColour(0.85, 0xD9A63A));
    const beads = 8;
    for (let i = 0; i < beads; i++) {
        const t = i / (beads - 1);
        const px = a[0] + dx * t, py = a[1] + dy * t, pz = a[2] + dz * t;
        const size = (0.34 - 0.24 * t) * scale * (0.85 + 0.3 * intensity);
        const roll = (i * 33) % 360;
        frame.sprite(i === beads - 1 ? MegahornHornGlint : MegahornHornSpike, px, py, pz, size, roll,
            megahornColour(0.9 - 0.3 * t, i === beads - 1 ? 0xF6E6B8 : 0xD9A63A), i % 6, i === beads - 1);
    }
    frame.sprite(MegahornHornGlint, b[0], b[1], b[2], 0.2 * scale, (frame.serverTick() * 40) % 360,
        megahornColour(0.95, 0xFFFFFF), 0, true);
});
