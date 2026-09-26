/**
 * 雷电拳 / thunderpunch 的客户端表现。
 *
 * 一句话：拳面窜起电流、快拳正中目标炸开一撮电火花；接着一条短粗电索把双方拴住并随双方位置移动，
 * 在放电窗里越来越亮；目标退开就断电熄灭，贴满窗口才在目标身上炸开放电并把分枝电弧送向邻敌。
 * 色相家族：电弧黄（0xE8D24A）与近白（0xFFFBE0）；饱和黄只出现在电流与火花的细小面积。
 * 拍子：起 charge（拳面聚电）→ 击 hit（命中电爆）→ 贴 contact（电索，progress 逐渐变亮）→
 *   放电 discharge 或断电 break → 链 arc（电弧跳向邻敌）与 whiff（空拳）。
 * 范围：contact 的电索用 `data.path: ["source","target"]`，两端实体每帧跟随；arc 用电弧折线。
 * 运动：拳面沿瞄准方向冲出，电弧从真实目标跃向邻敌。
 * 数：contact 的分枝数绑 `data.bolts`，亮度绑 `data.progress`；命中强度绑 `data.intensity`。
 */
const ThunderpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [4, 8], size: [0.22, 0.05],
                    color: 0xFFFBE0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "feet", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 8, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [5, 9], size: [0.1, 0.03],
                    color: 0xE8D24A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.08, 0.26], spread: 24,
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFBE0, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "branch", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "bolts", fallback: 5 }, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 30,
                    lifetime: [5, 9], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xE8D24A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        contact: {
            duration: 0,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "tether", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/bolt",
                    shape: { kind: "polyline" }, rate: 16,
                    direction: "shape", orient: "direction", speed: [0.02, 0.07],
                    lifetime: [3, 6], size: [0.3, 0.07],
                    color: 0xFFFBE0, alpha: [{ data: "progress", fallback: 0.45 }, 0], light: "full", bloom: 0.5, maxParticles: 44
                },
                {
                    name: "crackle", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" }, burst: { count: { data: "bolts", fallback: 5 }, interval: 2, repeats: 3 },
                    direction: "shape", orient: "direction", speed: [0.04, 0.16], spread: 20,
                    lifetime: [3, 7], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xE8D24A, alpha: [{ data: "progress", fallback: 0.4 }, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        discharge: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28], spread: 26,
                    lifetime: [5, 10], size: [0.36, 0.07], sizeMode: "index",
                    color: 0xFFFBE0, alpha: [1, 0], light: "full", bloom: 0.55
                },
                {
                    name: "sendoff", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "bolts", fallback: 5 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [5, 9], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xE8D24A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        break: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "snuff", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [3, 7], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x8A7E3A, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        arc: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "bolt", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/bolt",
                    shape: { kind: "polyline" }, burst: { count: 8, interval: 2, repeats: 2 },
                    direction: "shape", orient: "direction", speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFBE0, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "crackle", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" }, burst: { count: { data: "bolts", fallback: 5 } },
                    direction: "shape", orient: "direction", speed: [0.05, 0.2], spread: 18,
                    lifetime: [4, 8], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xE8D24A, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 50
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 14, interval: 2 },
                    shape: { kind: "cone", radius: 0.5, angleDegrees: 32 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [5, 9], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xE8D24A, alpha: [0.55, 0], light: "full", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thunderpunch", 1, ThunderpunchDefinition);
