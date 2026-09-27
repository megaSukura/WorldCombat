/**
 * 灭亡之歌 的粒子语言与固定图形。
 *
 * 一句话：施法者开口聚声，一圈冷色的歌环把整块歌域圈住；名单上每个活物的头顶固定亮着三枚音符，每过一拍少一枚，
 *   最后一枚撑满整拍才灭；数完那一刻被收走的散成惨白，撑住的只淡下，被挡下的声纹散开；脱出歌域的人音符直接散掉。
 *
 * 色相家族：冷蓝紫（0x5A6BB0）为主体，深靛（0x161528）做底与烟，近白蓝（0xB8C4E8）只做「还剩几拍」的高光，
 *   结清的一瞬改用惨白（0xEAF0FF）。
 * 层次：聚声（sing，起手）／歌域（song／beat，原点固定）／名单（notes，每个被点名者头顶的固定 3 枚）／
 *   终曲（doom／judge／resist）／甩脱（lift）。
 * 数：歌域半径绑 data.radius，音符数量绑 data.motes；头顶固定音符数直接绑 data.turnsLeft——机制里的数就是画面里的数。
 * 歌域边缘就是解除边界，原点固定不追施法者；音符位置由客户端 anchor 跟随真实身体，不使用会自行运动的粒子冒充。
 */
const PerishSongDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sing: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "sing_notes", bind: "source", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 14, burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0x5A6BB0, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "sing_breath", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: 8, shape: { kind: "sphere", radius: 0.38 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 16], size: [0.14, 0.03],
                    color: 0xB8C4E8, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        song: {
            duration: 44,
            exit: { stop: 20, drain: 28 },
            emitters: [
                {
                    name: "song_ring", bind: "point", height: 0.06, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 56 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4.0 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: [0.4, 0.8],
                    color: 0x5A6BB0, alpha: [0.6, 0], light: "full", maxParticles: 140
                },
                {
                    name: "song_notes", bind: "point", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "motes", fallback: 14 }, interval: 6, repeats: 3 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.93, spin: 6,
                    lifetime: [14, 26], size: [0.2, 0.03],
                    color: 0xB8C4E8, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "song_mist", bind: "point", height: 0.16, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 5, shape: { kind: "ring", radius: { data: "radius", fallback: 4.0 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 38], size: [0.26, 0.06],
                    color: 0x161528, alpha: [0.22, 0], light: "world", maxParticles: 40
                }
            ]
        },
        beat: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "beat_ring", bind: "point", height: 0.06, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 24 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4.0 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.26, 0.5], sizeMode: "index",
                    color: 0x8A9AD8, alpha: [0.55, 0], light: "full", maxParticles: 40
                },
                {
                    name: "beat_notes", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "turnsLeft", fallback: 3 }, interval: 3 }, shape: { kind: "circle", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xB8C4E8, alpha: [0.6, 0.05], alphaMode: "sin",
                    light: "full", maxParticles: 14
                }
            ]
        },
        doom: {
            duration: 48,
            exit: { stop: 22, drain: 40 },
            emitters: [
                {
                    name: "doom_burst", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.32],
                    lifetime: [8, 16], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xEAF0FF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "doom_column", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 3, at: 1, interval: 3 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [20, 34], size: [0.4, 0.9],
                    color: 0x5A6BB0, alpha: [0.6, 0], light: "full", maxParticles: 12
                },
                {
                    name: "doom_notes", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 20, at: 1, interval: 4, repeats: 4 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [16, 30], size: [0.18, 0.02],
                    color: 0xB8C4E8, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "doom_ring", bind: "point", offset: [0, 0.04, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 3, at: 1, interval: 2 }, shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.06, 0.12],
                    lifetime: [14, 22], size: [0.5, 1.0],
                    color: 0x8A9AD8, alpha: [0.6, 0], light: "full", maxParticles: 10
                }
            ]
        },
        judge: {
            duration: 30,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "judge_ring", bind: "point", offset: [0, 0.04, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.13],
                    lifetime: [12, 20], size: [0.3, 0.14],
                    color: 0x5A6BB0, alpha: [0.5, 0], light: "full", maxParticles: 24
                },
                {
                    name: "judge_notes", bind: "point", offset: [0, 1.0, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 28], size: [0.16, 0.02],
                    color: 0xB8C4E8, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        resist: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "resist_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.24, 0.1],
                    color: 0x6E7488, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        lift: {
            duration: 24,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "lift_break", bind: "point", offset: [0, 0.04, 0], fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.13],
                    lifetime: [12, 20], size: [0.3, 0.16],
                    color: 0x5A6BB0, alpha: [0.5, 0], light: "full", maxParticles: 22
                },
                {
                    name: "lift_notes", bind: "point", offset: [0, 1.0, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 28], size: [0.16, 0.02],
                    color: 0xB8C4E8, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_perishsong", 1, PerishSongDefinition);

/**
 * 名单印记：固定三枚音符悬在被点名者的头顶，数量直接由机制 data.turnsLeft 决定，逐个熄灭；
 * 最后一枚要撑到本拍结束才灭（phase 越接近 1 越淡，但不会提前消失）。位置由客户端 anchor 每帧跟随真实身体。
 */
WorldCombatClient.scene("world_combat:move_perishsong_notes", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle || !data.target) return;
    const turnsLeft = typeof data.turnsLeft === "number" ? Math.max(0, Math.round(data.turnsLeft)) : 0;
    if (turnsLeft <= 0) return;
    const body = JSON.parse(frame.anchor(String(data.target)));
    if (!body) return;
    const cx = Number(body.x), cy = Number(body.y), cz = Number(body.z);
    const height = typeof body.height === "number" ? body.height : 1.4;
    const start = typeof data.start === "number" ? data.start : frame.serverTick();
    const beat = Math.max(1, typeof data.beatTicks === "number" ? data.beatTicks : 30);
    const phase = ((frame.serverTick() - start) % beat) / beat;
    const baseY = cy + height + 0.4;
    for (let i = 0; i < turnsLeft; i++) {
        const offset = i - (turnsLeft - 1) / 2;
        const x = cx + offset * 0.42;
        const y = baseY + 0.05 * Math.sin(i * 1.7);
        const z = cz - 0.06 * i;
        const fade = i === turnsLeft - 1 ? 0.45 + 0.55 * phase : 1;
        const colour = (Math.round(230 * fade) << 24 | 0xB8C4E8) | 0;
        frame.sprite("cobblemon:particle/generic/note", x, y, z, 0.3, i * 22, colour, 0, true);
    }
});

/**
 * 歌域边界：原点固定、半径就是真实解除边界的稳定圆环；每拍有一道更亮的圈收进来，
 * 剩余拍数越少内圈越紧。不画会随波逐流的粒子，边缘与判定读同一个半径。
 */
WorldCombatClient.scene("world_combat:move_perishsong_domain", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const radius = typeof data.radius === "number" && data.radius > 0 ? data.radius : 0;
    if (radius <= 0) return;
    const origin = Array.isArray(data.origin) && data.origin.length === 3 ? data.origin : entry.position;
    const x = Number(origin[0]), y = Number(origin[1]) + 0.06, z = Number(origin[2]);
    const start = typeof data.start === "number" ? data.start : frame.serverTick();
    const beat = Math.max(1, typeof data.beatTicks === "number" ? data.beatTicks : 30);
    const phase = ((frame.serverTick() - start) % beat) / beat;
    const pulse = 1 - phase;
    frame.ring(x, y, z, radius, (Math.round(120 + 80 * pulse) << 24 | 0x5A6BB0) | 0);
    frame.ring(x, y, z, Math.max(0.3, radius * (0.35 + 0.65 * pulse)), (Math.round(50 + 60 * pulse) << 24 | 0xB8C4E8) | 0);
});
