/**
 * 藤鞭 / vinewhip 的客户端表现。
 *
 * 一句话：细藤从身侧绷起、闪过一点绿光 → 朝瞄准方向快抽出一道细而亮的线性鞭痕、末端甩出一记鞭梢闪点 →
 * 命中点炸开一小簇叶片与草绿冲击，末端撞墙则在真实墙面磕出碎叶；双抽式是两次独立的短闪，各抽各的。
 * 色相家族：亮草绿（0x9BD05A 鞭痕、0x6FA83C 叶）与米白鞭梢为主，无第二个色相。
 * 拍子：起 read（绷藤聚光）→ 抽 flick（一条细线鞭痕 + 鞭梢闪点）→ 击 hit（命中散叶）／撞墙 wall（墙面碎叶）→ 空 miss（抽空散叶）。
 * 范围：flick 的 polyline 直接消费服务端 `data.path`（当刻施法者中心到墙/全长的真实三维线段），画出的就是真正够到的那条窄线；
 *     服务端每记单独 emit 一次 flick，双抽式为两次独立的短线，而不是一条长效果假装两击。
 * 运动：鞭痕沿线一次绷直扫出，末端叶屑沿离心方向飞出；命中是一小簇外散叶加一点草绿冲击。
 * 数：鞭痕叶量与命中散叶绑 `data.notes`（物攻与速度派生），命中强度绑 `data.intensity`（本击威力 / 48）；
 *     线宽与鞭梢尺寸随 `data.scale`（真实线宽 / 0.45）变化，`data.reach` 记录本记真实长度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const VineWhipDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "tense", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    spin: 8, lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x9BD05A, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        flick: {
            duration: 12,
            exit: { stop: 5, drain: 8 },
            emitters: [
                {
                    name: "cord", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 14 } },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.04, 0.15],
                    spin: 10, lifetime: [5, 10], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x9BD05A, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cord_core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: 4 },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.02, 0.09],
                    lifetime: [4, 8], size: [0.13, 0.02],
                    color: 0xF2F8DC, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "wrist", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.06, 0.01],
                    color: 0xCFE98A, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "tip", bind: "point", height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: 7, at: 1 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.06, 0.2],
                    spin: 14, lifetime: [4, 8], size: [0.11, 0.02], sizeMode: "index",
                    color: 0xF2F8DC, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 24
                }
            ]
        },
        wall: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "chips", bind: "point", height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.06, drag: 0.92, spin: 10,
                    lifetime: [5, 10], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9BD05A, alpha: [0.7, 0], light: "world", maxParticles: 34
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 9, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.08, 0.24],
                    lifetime: [4, 8], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xEAF8B8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "scatter", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "notes", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.2],
                    spread: 45, spin: 14,
                    lifetime: [6, 12], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xA8DC64, alpha: [0.75, 0], light: "full", maxParticles: 55
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 10 } },
                    shape: { kind: "arc", radius: 0.4, arcDegrees: 140, rotation: [0, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0x9BD05A, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vinewhip", 1, VineWhipDefinition);
