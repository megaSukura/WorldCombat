/**
 * 击掌奇袭 / fakeout 的客户端表现。
 *
 * 一句话：掌心一亮，人贴着地面闪过去，在对手脸侧「啪」地一拍——暖黄的掌击火花炸开，对手头顶转起一圈懵星。
 * 色相家族：暖黄与近白（F6D36B / FFE9A8 / FFF6DC）为主，掌击核心一点高饱和；没有冷色。
 * 拍子：起 ready（掌心蓄光）→ 拍 clap（命中峰值）→ 懵 daze（星圈）→ 收 miss（挥空刹停）。
 * 范围：clap 与 daze 都绑命中点（target），画面画出的就是掌掴真正落到的位置；起手 ring 绑施法者脚边。
 * 运动：ready 的光点向内收进掌心，clap 的碎光沿拍击方向向外炸，daze 的星子从头顶向上飘并绕圈。
 * 数：`data.count`（威力派生）决定掌击火花数，`data.stars`（拍懵时长派生）决定懵星数，`data.scale`（判定半径 / 0.4）放大掌风与星圈。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FakeoutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        ready: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "ring", radius: 0.32, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "palm", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.07, 0.02],
                    color: 0xFFF6DC, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        clap: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "smack", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: { data: "count", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [4, 9], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "sparks", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.02, drag: 0.93,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0xF6D36B, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 110
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.8, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.26, 0.06],
                    color: 0xEAD7A0, alpha: [0.5, 0], light: "world"
                }
            ]
        },
        daze: {
            duration: { data: "daze", fallback: 20 },
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "stars", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "stars", fallback: 6 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.06], spread: 12,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0xFFF2C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        whiff: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "swish", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.2, 0.05],
                    color: 0xEAD7A0, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xC9B98A, alpha: [0.45, 0], light: "world", maxParticles: 48
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fakeout", 1, FakeoutDefinition);
