/**
 * 灭亡之歌 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者开口，一圈冷色的歌环从它身上推到整个半径；被歌声写进名单的人在头顶亮起与剩余拍数等量的音符，
 *   一拍一拍减少，最后一拍收紧变亮，数完那一刻整个人被一束冷光收走；被甩掉的人只是音符散开。
 *
 * 色相家族：冷蓝紫（0x5A6BB0）为主体，深靛（0x161528）做底与烟，近白蓝（0xB8C4E8）只做「还剩几拍」的高光，
 *   结清的一瞬改用惨白（0xEAF0FF）——与同组同命的玫红、怨念的脏黄一眼分开。
 * 层次：聚声（起手，源侧）／歌环（起唱，整个半径）／名单（命中，每个被点名者）／拍子（持续，头顶）／
 *   终曲（最后一拍）／结清／甩脱（收）。
 * 起击收：sing（聚声）→ mark（入名单）→ song（歌环推开）→ beat／final（数拍）→ doom／lift（结清或甩脱）。
 * 数：歌环半径绑 data.scale（实际歌声半径 / 4.0），音符量绑 data.motes（特攻派生），
 *   入名单的人数绑 data.heard，头顶亮起的音符数直接绑 data.turnsLeft（还剩几拍就亮几个）——机制里的数就是画面里的数。
 */
const PerishSongDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sing: {
            duration: 22,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "sing_notes", bind: "source", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 16, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0x5A6BB0, alpha: [0.8, 0], light: "full", maxParticles: 32
                },
                {
                    name: "sing_breath", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: 8, shape: { kind: "sphere", radius: 0.38 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 16], size: [0.14, 0.03],
                    color: 0xB8C4E8, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        song: {
            duration: 56,
            exit: { stop: 26, drain: 34 },
            emitters: [
                {
                    name: "song_ring", bind: "point", height: 0.08, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 60, interval: 14, repeats: { data: "turns", fallback: 3 } },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: [0.4, 0.8],
                    color: 0x5A6BB0, alpha: [0.6, 0], light: "full", maxParticles: 160
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
                    name: "song_mist", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 6, shape: { kind: "circle", radius: 4.0 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 38], size: [0.26, 0.06],
                    color: 0x161528, alpha: [0.22, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "mark_note", bind: "target", offset: [0, 1.06, 0], height: 0.26,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 4 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 24], size: [0.18, 0.03],
                    color: 0xB8C4E8, alpha: [0.85, 0], light: "full", maxParticles: 10
                },
                {
                    name: "mark_ring", bind: "target", offset: [0, 0.04, 0], fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.3, 0.14],
                    color: 0x5A6BB0, alpha: [0.55, 0], light: "full", maxParticles: 20
                }
            ]
        },
        beat: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "beat_ring", bind: "target", offset: [0, 0.04, 0], fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2, burst: { count: 10, interval: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0, 0.012],
                    lifetime: [20, 32], size: [0.26, 0.34], sizeMode: "sin",
                    color: 0x5A6BB0, alpha: [0.3, 0.06], alphaMode: "sin",
                    light: "full", maxParticles: 14
                },
                {
                    name: "beat_count", bind: "target", offset: [0, 1.18, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "turnsLeft", fallback: 3 }, interval: 4 }, shape: { kind: "circle", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xB8C4E8, alpha: [0.7, 0.05], alphaMode: "sin",
                    light: "full", maxParticles: 12
                },
                {
                    name: "beat_notes", bind: "target", offset: [0, 1.0, 0], height: 0.22,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 2, burst: { count: { data: "motes", fallback: 12 }, interval: 20 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0x5A6BB0, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        },
        final: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "final_ring", bind: "target", offset: [0, 0.04, 0], fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 5, burst: { count: 16, interval: 14 }, shape: { kind: "ring", radius: 0.44 },
                    direction: "up", speed: [0, 0.014],
                    lifetime: [18, 28], size: [0.32, 0.46], sizeMode: "sin",
                    color: 0x8A9AD8, alpha: [0.42, 0.1], alphaMode: "sin",
                    light: "full", maxParticles: 20
                },
                {
                    name: "final_count", bind: "target", offset: [0, 1.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "turnsLeft", fallback: 1 }, interval: 6, repeats: 3 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.11, 0.02],
                    color: 0xEAF0FF, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        doom: {
            duration: 56,
            exit: { stop: 26, drain: 46 },
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
                },
                {
                    name: "doom_mist", bind: "point", offset: [0, 0.04, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 2, rate: 12, shape: { kind: "ring", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [22, 40], size: [0.32, 0.5],
                    color: 0x161528, alpha: [0.32, 0], light: "world", maxParticles: 50
                }
            ]
        },
        lift: {
            duration: 30,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "lift_break", bind: "target", offset: [0, 0.04, 0], fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.13],
                    lifetime: [12, 20], size: [0.3, 0.16],
                    color: 0x5A6BB0, alpha: [0.5, 0], light: "full", maxParticles: 26
                },
                {
                    name: "lift_notes", bind: "target", offset: [0, 1.0, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 28], size: [0.16, 0.02],
                    color: 0xB8C4E8, alpha: [0.6, 0], light: "full", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_perishsong", 1, PerishSongDefinition);
