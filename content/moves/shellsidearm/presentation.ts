/**
 * 臂贝武器 / shellsidearm 的客户端表现。
 *
 * 一句话：施法者把一具带毒的壳压进发射腔、毒气从缝里聚起；壳脱膛后拖一条厚尾飞出，命中处按这一面炸开——
 *   钝击是一圈壳屑与冲击环，喷射是一团扩散的毒云。
 * 色相家族：毒紫（0x8A6BA8）做壳与钝击的色相，毒绿（0x9BE86B）做喷射的毒云，近白只做命中亮点。
 *   两种形态用不同色相与轮廓彼此分开，与同族的细针/双针一眼不同。
 * 拍子：起 charge（聚毒压壳，开合壳预告形态）→ 钝击 swing（真近身粗短弧）→ ram（砸中）／喷射 fire（炮口）→ shell（厚尾）→ spray（命中）→ 空 whiff。
 * 范围：钝击 swing 从身体沿真实 trace 方向伸出、长度读 `data.reach`（服务端取首碰止点到身体的距离），ram 绑在命中者身上；
 *   喷射 shell 沿投射物本部走，spray 绑在命中点、`data.scale` 对应实际判定；两者画面就是会打到的那块地。
 * 运动：钝击是瞬时伸出的一记短横砸，喷射是一发厚实毒壳沿直线（带有限追踪）飞出去；命中处向四周炸开，一沉一扩散。
 * 数：`data.cloud`（由个体最强一面派生）绑定起手聚毒与命中毒云的粒子量，`data.scale`（由判定半径派生）缩放整体，
 *   `data.intensity`（由威力派生）抬高亮度与速度。画面里的数量和机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShellsidearmDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "press", bind: "source", offset: [0, 0.3, 0.3], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0x8A6BA8, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "venom", bind: "source", offset: [0, 0.3, 0.3], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "cloud", fallback: 12 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 12], size: [0.09, 0.02],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 50
                }
            ]
        },
        swing: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "arm", bind: "source", fit: "none", orient: "direction", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 2.4 }, rotation: [0, 0, 0] },
                    direction: "shape", speed: [0.02, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [5, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x8A6BA8, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "crush", bind: "source", fit: "none", orient: "direction", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.18], spread: 24,
                    lifetime: [5, 11], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xE6D8F0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 18
                },
                {
                    name: "backdraft", bind: "source", offset: [0, 0.1, -0.2], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "away", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xB8C88A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        fire: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "muzzle", bind: "source", fit: "none", offset: [0, 0.3, 0.4],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    lifetime: [5, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xD7F5A8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "smoke", bind: "source", fit: "none", offset: [0, 0.28, 0.35],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16], gravity: -0.01, drag: 0.9,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0x6B4E8A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        shell: {
            duration: 0,
            exit: { drain: 14 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalball",
                    rate: 30, shape: { kind: "sphere", radius: 0.11 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [5, 10], size: [0.24, 0.04],
                    color: 0x8A6BA8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "trail", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    trail: { minDistance: 0.28 },
                    rate: 22, shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.01, 0.06], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 15], size: [0.12, 0.02],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        ram: {
            duration: 26,
            exit: { stop: 10, drain: 15 },
            emitters: [
                {
                    name: "crush", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [5, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xE6D8F0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 26
                },
                {
                    name: "shards", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "cloud", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.08, drag: 0.88,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8A6BA8, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shockring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [9, 16], size: [0.24, 0.08],
                    color: 0xB6A0CC, alpha: [0.55, 0], light: "world", maxParticles: 20
                }
            ]
        },
        spray: {
            duration: 26,
            exit: { stop: 10, drain: 15 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.22], spread: 22,
                    lifetime: [5, 11], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xD7F5A8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 26
                },
                {
                    name: "cloud", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "cloud", fallback: 12 }, interval: 3, repeats: 4 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.16], gravity: -0.01, drag: 0.9,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "ripple", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.26, 0.08],
                    color: 0xC8F0A0, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], gravity: -0.01, drag: 0.9,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x6B4E8A, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shellsidearm", 1, ShellsidearmDefinition);
