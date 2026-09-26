/**
 * 再来一次 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抬手点出一串金色音符，一道亮色的回声圈扣在目标头上；接下来它只能一遍遍重复同一个动作，
 *   每响一次音符都在提醒它「还在循环」，直到回声散开。
 *
 * 色相家族：暖金（0xF2C14E）为主体与持续，亮黄（0xFFE08A）做强调与高光，近褐（0x6B5426）做烟与余韵；
 *   落空改用灰白（0x9AA0A6），与「点中了」一眼可分。
 * 层次：聚声（起手，源侧）／扣环＋音符（命中，目标侧）／回声循环（持续，目标头顶）／散尽（收）。
 * 起击收：call（聚声）→ loop（扣环）→ echo（循环）→ spent／release（散）。
 * 数：半径圈绑 data.scale（实际回声半径 / 0.35），音符量绑 data.motes（特攻派生），
 *   持续密度与亮度随 data.surge（剩余比例）变化——玩家一眼看出循环还剩多久。
 */
const EncoreDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        call: {
            duration: 18,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "call_notes", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 14, shape: { kind: "sphere", radius: 0.46 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xF2C14E, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "call_spark", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFFE08A, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        loop: {
            duration: 34,
            exit: { stop: 14, drain: 24 },
            emitters: [
                {
                    name: "loop_ring", bind: "target", fit: "none", height: 0.62, offset: [0, 0, 0], orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [12, 20], size: [0.3, 0.14],
                    color: 0xF2C14E, alpha: [0.7, 0], light: "full", maxParticles: 70
                },
                {
                    name: "loop_notes", bind: "target", offset: [0, 1.12, 0], height: 0.28,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 3, repeats: 3 }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.92,
                    lifetime: [12, 22], size: [0.22, 0.04],
                    color: 0xFFE08A, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "loop_flash", bind: "target", height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [5, 9], size: [0.42, 0.1], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 6
                }
            ]
        },
        echo: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "echo_ring", bind: "target", fit: "none", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2, burst: { count: 10, interval: 18 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0, 0.012],
                    lifetime: [20, 32], size: [0.26, 0.34], sizeMode: "sin",
                    color: 0xF2C14E, alpha: [0.32, 0.06], alphaMode: "sin",
                    light: "full", maxParticles: 16
                },
                {
                    name: "echo_notes", bind: "target", offset: [0, 1.06, 0], height: 0.26,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 2, burst: { count: { data: "motes", fallback: 10 }, interval: 20 }, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.18, 0.03], sizeMode: "sin",
                    color: 0xFFE08A, alpha: [0.6, 0], light: "full", maxParticles: 16
                },
                {
                    name: "echo_motes", bind: "target", offset: [0, 1.0, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 4, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 30], size: [0.05, 0.012],
                    color: 0x6B5426, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        spent: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "spent_fall", bind: "target", offset: [0, 1.0, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.03, drag: 0.92, spin: 8,
                    lifetime: [14, 26], size: [0.2, 0.03],
                    color: 0x8A7438, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "spent_smoke", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 28], size: [0.22, 0.4],
                    color: 0x3A3020, alpha: [0.24, 0], light: "world", maxParticles: 18
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "release_break", bind: "target", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.16],
                    color: 0xF2C14E, alpha: [0.55, 0], light: "full", maxParticles: 28
                },
                {
                    name: "release_notes", bind: "target", offset: [0, 1.0, 0], height: 0.26,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 28], size: [0.18, 0.03],
                    color: 0xFFE08A, alpha: [0.6, 0], light: "full", maxParticles: 22
                }
            ]
        },
        reject: {
            duration: 22,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "reject_slash", bind: "path", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "shape", speed: [0.02, 0.08], trail: { minDistance: 0.06 },
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xD85A5A, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "reject_notes", bind: "target", offset: [0, 1.0, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.03, drag: 0.92,
                    lifetime: [12, 22], size: [0.16, 0.02],
                    color: 0xD85A5A, alpha: [0.7, 0], light: "world", maxParticles: 16
                },
                {
                    name: "reject_puff", bind: "target", offset: [0, 0.9, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.2, 0.3],
                    color: 0x6B5426, alpha: [0.28, 0], light: "world", maxParticles: 14
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.22, 0.36],
                    color: 0x9AA0A6, alpha: [0.3, 0], light: "world", maxParticles: 24
                },
                {
                    name: "miss_notes", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "down", speed: [0.02, 0.06], gravity: 0.03,
                    lifetime: [12, 20], size: [0.16, 0.02],
                    color: 0x8A7438, alpha: [0.4, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_encore", 1, EncoreDefinition);
