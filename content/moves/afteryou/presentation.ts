/**
 * 您先请 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者掌心攒起一束先手之光，沿一条引线送到伙伴身上化作一圈绿意环绕的加速光；伙伴一旦真的
 *   出手，光在它身上炸成一撮速度火星——那一拍被送到了。施法者自己留一圈灰蓝余烬，表示让出的一拍。
 *
 * 色相家族：先手绿（0x8FE06A）画引线与伙伴的加速，暖白金（0xFFE9A8）做光芒高光，
 *   让手的灰蓝（0x8A93A0）只出现在施法者身上——绿向外送、灰蓝向内收，两个方向一眼可分。
 * 层次：起（windup 攒光）／让（call 引线飞向伙伴）／待（ready 伙伴身上的加速环）／
 *   兑现（go 出手瞬间的快闪）／收（fade 自然褪去、clear 被清除、recover 施法者让手结束）。
 * 起击收：windup → call → ready → go → fade／clear／recover。
 * 数：引线光点与快闪数量来自 data.motes，加速强度 data.haste 驱动光环亮度与范围，窗口时长 data.scale——
 *   都由服务端算出的机制值驱动。
 */
const AfterYouDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "windup_glow", bind: "source", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0x8FE06A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        call: {
            duration: 20,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "call_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "motes", fallback: 10 }, trail: { minDistance: 0.25 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.14],
                    lifetime: [7, 12], size: [0.12, 0.03],
                    color: 0x8FE06A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "call_streak", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 24, trail: { minDistance: 0.2 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.07],
                    lifetime: [6, 10], size: [0.1, 0.02],
                    color: 0xFFE9A8, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        ready: {
            duration: 34,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "ready_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [12, 18], size: [0.22, 0.05],
                    color: 0x8FE06A, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "ready_rise", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "haste", fallback: 60 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.96,
                    lifetime: [16, 24], size: [0.1, 0.02],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        go: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "go_flash", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [6, 11], size: [0.14, 0.02], sizeMode: "index",
                    color: 0x8FE06A, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "go_lines", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.28],
                    lifetime: [5, 9], size: [0.12, 0.02],
                    color: 0xFFE9A8, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "fade_motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x8FE06A, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        clear: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "clear_puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 22], size: [0.18, 0.3], color: 0x6E7C68, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        recover: {
            duration: 22,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "recover_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.45 }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 26], size: [0.1, 0.02], color: 0x8A93A0, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_afteryou", 1, AfterYouDefinition);
