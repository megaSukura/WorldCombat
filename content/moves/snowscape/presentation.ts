/**
 * 雪景 / snowscape 的客户端表现。
 *
 * 一句话：施法者呼出一口白气 → 一场很轻的雪在落点落下来、贴地铺开 → 雪里冰之躯身上浮起一层薄光，
 * 地面被雪盖住、露天的水一点点冻成冰，雪花静静地一直落。
 * 色相家族：近白 0xF2FAFF 与冰蓝 0xCFEAF8／0xA8D8F0；一个冷色相，整体低饱和、低 alpha。
 * 起击收：起 windup 24t ／击 burst 44t ／持 field 每 5 刻续期 ／击 crisp 24t ／击 cover 28t ／击 lock 28t。
 * 持续状态：field 是稀疏、缓慢下落的雪花加一层贴地薄雾——**让出视线**，密度低、尺寸小，
 * 地面一圈白环画出「站哪里在雪里」。
 * 机制驱动：雪区半径决定雪花与白环的大小（data.scale = 半径/10），雪花数量直接读本招算出的 flakeDensity，
 * 覆雪与冻水各自的格数由 coverCells／freezeCells 派生（data.covers／data.locks）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 呼气 icy_snow        向前飘散       0.1-0.02 12-22 0.5→0  ≤60
 * burst  雪环 mediumring      贴地外扩       2.2-0.5 22-36 0.4→0   ≤40
 * burst  初雪 powdered_snow   缓慢下落       0.22-0.05 16-30 0.5→0 ≤300
 * field  雪花 icy_snow        缓慢下落＋漂移 0.1-0.02 18-34 0.45→0 ≤240
 * field  雪雾 smoke           贴地外涌       0.4-0.15 18-34 0.2→0  ≤160
 * field  白环 largering       贴地脉冲       0.4-0.8  26-44 0.2→0   ≤34
 * crisp  薄光 xsboost         球面外散       0.12-0.03 10-20 0.85→0 ≤60
 * cover  覆盖 powdered_snow   贴地铺开       0.3-0.1  16-28 0.6→0   ≤120
 * lock   冻水 icy_snow        球面外散       0.14-0.03 12-22 0.7→0   ≤80
 */
const SnowscapeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                { name: "breath", bind: "source", offset: [0, 0.9, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xF2FAFF, alpha: [0.5, 0], light: "world", maxParticles: 60 }
            ]
        },
        burst: {
            duration: 44,
            exit: { stop: 24, drain: 28 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 26, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.16, 0.28],
                    lifetime: [22, 36], size: [2.2, 0.5],
                    color: 0xCFEAF8, alpha: [0.4, 0], light: "world", maxParticles: 40 },
                { name: "opens", bind: "point", offset: [0, 2.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 10 }, length: 4 },
                    direction: "down", speed: [0.05, 0.18], gravity: 0.003, drag: 0.98,
                    lifetime: [16, 30], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.5, 0], light: "world", maxParticles: 300 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "flakes", bind: "point", offset: [0, 2.6, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 10 }, length: 4 },
                    direction: "down", speed: [0.02, 0.1], gravity: 0.001, drag: 0.99,
                    lifetime: [18, 34], size: [0.1, 0.02],
                    color: 0xF2FAFF, alpha: [0.45, 0], light: "world", maxParticles: 240 },
                { name: "mist", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 16, shape: { kind: "circle", radius: { data: "radius", fallback: 10 } },
                    direction: "outward", speed: [0.01, 0.06], gravity: -0.001, drag: 0.96,
                    lifetime: [18, 34], size: [0.4, 0.15], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.2, 0], light: "world", maxParticles: 160 },
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 5, shape: { kind: "ring", radius: { data: "radius", fallback: 10 } },
                    direction: "up", speed: [0.003, 0.01],
                    lifetime: [26, 44], size: [0.4, 0.8], sizeMode: "sin",
                    color: 0xCFEAF8, alpha: [0.2, 0], alphaMode: "sin", light: "world", maxParticles: 34 }
            ]
        },
        crisp: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                { name: "brace", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 20], size: [0.12, 0.03],
                    color: 0xA8D8F0, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 60 }
            ]
        },
        cover: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                { name: "lay", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "covers", fallback: 20 }, shape: { kind: "circle", radius: { data: "radius", fallback: 10 } },
                    direction: "up", speed: [0, 0.03], gravity: 0.004, drag: 0.95,
                    lifetime: [16, 28], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [0.6, 0], light: "world", maxParticles: 120 }
            ]
        },
        lock: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                { name: "freeze", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "locks", fallback: 4 }, interval: 4, repeats: { data: "locks", fallback: 4 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 10 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0xCFEAF8, alpha: [0.7, 0], light: "full", bloom: 0.15, maxParticles: 80 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_snowscape", 1, SnowscapeDefinition);
