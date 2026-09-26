/**
 * 玩泥巴 / mudsport 的客户端表现。
 *
 * 一句话：施法者把脚下的泥甩开 → 落点炸开一圈泥浆、泥泡贴地糊满一块地，一层薄泥面把真实范围标出来 →
 * 站进去的活体被泥糊住，电招被压。
 * 色相家族：泥褐 0x6B4A2E 作主体、湿泥亮面 0x9C8460 作细节、灰绿 0x7A6B4F 作地表碎点；不用饱和色。
 * 起击收：起 windup 20t ／击 splash 48t ／持 field 每 5 刻续期 ／击 coat 22t。
 * 持续状态：field 是贴地薄泥面加边圈与滚动泥泡，低密度、贴脚边，不遮视线；泥面半径跟着真实机制半径缩放，
 * 一眼读出「站哪里会被糊上泥」。地表方块不被替换，范围只由这层泥面表达。
 * 机制驱动：泥滩半径决定泥面、边圈与泥花的实际大小（data.scale = 半径/3.2），薄泥面点数直接读 mudCover，
 * 泥泡数量读 mudDensity，落点翻起的泥量也用 mudCover。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 甩泥 mudsplash   球面外散     0.05-0.12 12-20 0.8→0 ≤80
 * splash 泥浆 sludgesplash 环面外扩    0.3-0.6   16-26 0.7→0 ≤60
 * splash 泥泡 mudbubble  圆面上浮     0.06-0.14 18-30 0.6→0 ≤160
 * splash 泥面 mudsplash  圆面翻落     0.05-0.12 14-24 0.5→0 ≤140
 * field  泥面 earth      圆面铺展     0.55-0.45 36-60 0.5→0 ≤130
 * field  边圈 ripple     环上脉冲     0.4-0.8   22-34 0.3→0 ≤40
 * field  泥泡 mudbubble  圆面上浮     0.05-0.12 18-32 0.35→0 ≤180
 * coat   糊泥 mudsplash  球面外散     0.06-0.16 10-18 0.9→0 ≤40
 * coat   泥点 sludgesplash 环面外扩   0.04-0.1  10-18 0.9→0 ≤30
 */
const MudsportDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "fling", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 24, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.12, 0.04],
                    color: 0x6B4A2E, alpha: [0.85, 0], light: "world", maxParticles: 80 }
            ]
        },
        splash: {
            duration: 48,
            exit: { stop: 24, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 34, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.16, 0.3],
                    lifetime: [16, 26], size: [0.3, 0.6],
                    color: 0x6B4A2E, alpha: [0.75, 0], light: "world", maxParticles: 60 },
                { name: "bubbles", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    burst: { count: { data: "density", fallback: 20 }, interval: 3, repeats: 6 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [18, 30], size: [0.08, 0.03],
                    color: 0x9C8460, alpha: [0.6, 0], light: "world", maxParticles: 160 },
                { name: "mud", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "cover", fallback: 10 }, interval: 2, repeats: 5 }, shape: { kind: "circle", radius: 3.2 },
                    direction: "down", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: [0.09, 0.03],
                    color: 0x7A6B4F, alpha: [0.5, 0], light: "world", maxParticles: 140 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "film", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    spriteFrom: "random", rate: { data: "cover", fallback: 10 }, shape: { kind: "circle", radius: 3.2 },
                    direction: "up", speed: [0, 0.006],
                    lifetime: [36, 60], size: [0.55, 0.45],
                    color: 0x6B4A2E, alpha: [0.5, 0], alphaMode: "sin", light: "world", maxParticles: 130 },
                { name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 7, shape: { kind: "ring", radius: 2.9 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [22, 34], size: [0.4, 0.8], sizeMode: "sin",
                    color: 0x7A6B4F, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 40 },
                { name: "bubbles", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: { data: "density", fallback: 20 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [18, 32], size: [0.06, 0.02],
                    color: 0x9C8460, alpha: [0.35, 0], alphaMode: "sin", light: "world", maxParticles: 180 }
            ]
        },
        coat: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "splat", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.12, 0.04],
                    color: 0x6B4A2E, alpha: [0.9, 0], light: "world", maxParticles: 40 },
                { name: "dots", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.1, 0.03],
                    color: 0x9C8460, alpha: [0.9, 0], light: "world", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mudsport", 1, MudsportDefinition);
