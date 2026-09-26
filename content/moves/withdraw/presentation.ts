/**
 * 缩入壳中 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：身体一收，水光与壳片由四面合拢、拼成一圈厚壳把施法者整个包住；壳在身时表面流转着水纹，
 *   每被挡下一击就有一枚大壳瓣熄灭、荡开一圈水花与壳屑，最后一枚熄灭的当刻整层壳炸开、身体回弹露出。
 *
 * 色相家族：壳青蓝（0x4C7FA8）为主体，水光蓝（0x8FC7D6）做高光，深水（0x2F5A78）做余韵；没有第二个色相。
 * 层次：合拢（起）／壳环与水泡（击）／壳面的水纹（收）／熄灭的壳瓣与水花（受击）／炸开的壳片与回弹（末）。
 * 起击收：tuck（收身）→ seal（合壳）→ hollow（持壳）／block（挡击）→ open（开壳）。
 * 范围：壳环绑身体、fit none，半径按 `data.scale`（实际壳半径 / 1.3）推出，画出来的壳就是护到的体积。
 * 运动：壳片与水光由外向内合拢、身体中心在合壳时压低；持壳时水纹沿壳面流转；挡击时水花沿 `data.direction`（真实来袭接触侧）荡开；
 *   开壳时壳片受重力落下、身体向上回弹。
 * 数：壳瓣用 `data.left`（真实剩余 1–3 次全挡）由托管场景逐枚点亮，挡一次灭一枚；挡击强度绑 `data.intensity`，尺寸绑 `data.scale`。
 * 持续状态：持壳期低密度、贴身，绑在 guard 池上：池被驱散或结束时同步停止，玩家仍看得清目标。
 */
const WithdrawDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tuck: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "tuck_ripple", bind: "source", fit: "none", height: 0.4, offset: [0, -0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 10, shape: { kind: "sphere", radius: 1.3 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 12,
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x8FC7D6, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        },
        seal: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "seal_plate", bind: "source", fit: "none", height: 0.45, offset: [0, -0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: { data: "blocks", fallback: 1 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.3 },
                    direction: "inward", speed: [0.05, 0.17], drag: 0.88, spin: 16,
                    lifetime: [12, 22], size: [0.34, 0.05],
                    color: 0x4C7FA8, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "seal_ring", bind: "source", fit: "none", height: 0.4, offset: [0, -0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 20], size: [0.44, 0.78], sizeMode: "index",
                    color: 0x8FC7D6, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "seal_bubble", bind: "source", fit: "none", height: 0.35, offset: [0, -0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 14, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.12], gravity: -0.01, drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x8FC7D6, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hollow: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "hollow_ripple", bind: "source", fit: "none", height: 0.4, offset: [0, -0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "up", speed: [0.01, 0.03], spin: 10,
                    lifetime: [12, 20], size: [0.1, 0.03],
                    color: 0x8FC7D6, alpha: [0.3, 0], light: "world", maxParticles: 18
                },
                {
                    name: "hollow_orb", bind: "source", fit: "none", height: 0.45, offset: [0, -0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "left", fallback: 1 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.006, 0.018], spin: 8,
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0x4C7FA8, alpha: [0.28, 0], light: "world", maxParticles: 12
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "block_petal", bind: "source", fit: "none", height: 0.4, offset: [0, -0.12, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "arc", radius: 0.5, arcDegrees: 40 },
                    direction: "shape", speed: [0.12, 0.22], gravity: 0.04, drag: 0.9, spin: 28,
                    lifetime: [12, 20], size: [0.5, 0.06],
                    color: 0x4C7FA8, alpha: [0.9, 0], light: "world", maxParticles: 4
                },
                {
                    name: "block_splash", bind: "source", fit: "none", height: 0.4, offset: [0, -0.12, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 12 },
                    shape: { kind: "arc", radius: 0.7, arcDegrees: 130 },
                    direction: "shape", speed: [0.05, 0.2], gravity: 0.03, drag: 0.9, spin: 20,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x8FC7D6, alpha: [0.85, 0], light: "world", maxParticles: 100
                },
                {
                    name: "block_flash", bind: "source", fit: "none", height: 0.45, offset: [0, -0.12, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "arc", radius: 0.4, arcDegrees: 120 },
                    direction: "shape",
                    lifetime: [10, 12], size: [0.5, 0.9],
                    color: 0x8FC7D6, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 4
                }
            ]
        },
        open: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "open_plate", bind: "source", fit: "none", height: 0.4, offset: [0, -0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    burst: { count: { data: "blocks", fallback: 1 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.13], gravity: 0.05, drag: 0.9, spin: 22,
                    lifetime: [12, 22], size: [0.34, 0.05],
                    color: 0x2F5A78, alpha: [0.65, 0], light: "world", maxParticles: 40
                },
                {
                    name: "open_rebound", bind: "source", fit: "none", height: 0.3, offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.06, 0.18], gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x8FC7D6, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_withdraw", 1, WithdrawDefinition);

// 壳瓣：按真实剩余的全挡次数画 1–3 枚大壳瓣围着身体；挡一次灭一枚，位置上不动，剩几枚一眼可见。
// 绑定在本招的 guard 池上，随它存续、随它收（提前破壳或驱散时同步停止）。
WorldCombatClient.scene("world_combat:move_withdraw_shell", 1, function (frame) {
    const entry: CombatSceneEntry<{ blocks: number; left: number; radius: number; scale: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    const blocks = Math.max(1, Math.round(data.blocks || 1));
    const left = Math.max(0, Math.min(blocks, Math.round(data.left == null ? blocks : data.left)));
    let x = entry.position[0], y = entry.position[1], z = entry.position[2], height = 1.4;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; height = Math.max(0.6, anchor.height); }
    const radius = Math.max(0.4, data.radius || (data.scale || 1) * 1.3);
    const size = Math.max(0.04, Math.min(0.1, 0.06 * (data.scale || 1)));
    for (let i = 0; i < left; i++) {
        const angle = (i / blocks) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(angle) * radius;
        const pz = z + Math.sin(angle) * radius;
        const py = y + height * 0.38;
        frame.billboard(px, py, pz, size, function (surface) {
            surface.fill(-8, -9, 16, 18, 0xF04C7FA8);
            surface.fill(-10, -5, 20, 4, 0xF08FC7D6);
            surface.fill(-8, -13, 16, 4, 0xF02F5A78);
        });
    }
});
