/**
 * 辅助齿轮 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者体内的齿轮「咔」地啮合、越转越快，转速到顶时几条齿链从自己连到身边的伙伴，
 *   伙伴身上迸出钢屑、物攻与特攻一起抬起来；接上动力的人身上一直转着钢屑，直到动力真到期。
 *
 * 色相家族：钢白（0xC8CDD3）画齿轮与齿屑，近白（0xF2F4F6）做高光，暖铜（0xE0A060）只作为齿轮中心那一撮
 *   小面积强调——一个冷色家族加一点暖光，没有第二个色相。
 * 层次：起（空转的齿环）／啮（合拢的钢爆＋连到伙伴的齿链）／传（伙伴身上的动力迸发）／持（伙伴身上持续运转）／收（锁定散去）。
 * 起击收：spin（起）→ mesh（击）→ drive（落点的迸发）+ drive_hold（持续，绑在这次真正的等级窗口上）→ fade（收）。
 * 主体齿轮：由自定义场景 world_combat:move_gearup/gear 逐帧画在施法者身上——一圈轮齿加中心辐条按本招的
 *   齿数与稳啮/超速转速整体旋转；起手与啮合各播放一次，啮合后定格散开。
 * 范围：mesh 的齿环绑 `data.scale`（实际齿链半径 / 2.6），画面里的环就是动力能传到的范围。
 * 运动：齿屑绕身高速旋转；啮合瞬间沿 `data.path` 画出自己到各受益者的齿链（这是连接关系，不是沿线抛出的弹体）；
 *   伙伴身上钢屑向外迸开再落回，随后 drive_hold 持续绕身。
 * 数：齿数绑 `data.teeth`（物攻与体重派生），传动强度绑 `data.motes`（同源），齿链顶点来自 `data.path`，
 *   范围与尺寸绑 `data.scale`（体型与速度派生）——都由本招算出的机制值驱动。
 */
const GearUpDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        spin: {
            duration: 18,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "spin_teeth", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "teeth", fallback: 18 }, interval: 2, repeats: 4 },
                    shape: { kind: "ring", radius: 0.7 }, direction: "shape", speed: [0.01, 0.05], spin: 44,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xC8CDD3, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "spin_hub", bind: "source", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.4 }, direction: "inward", speed: [0.02, 0.08], spin: 30,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE0A060, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        mesh: {
            duration: 40,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "mesh_burst", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.5 }, direction: "outward", speed: [0.1, 0.3],
                    lifetime: [8, 14], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xC8CDD3, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "mesh_ring", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "teeth", fallback: 18 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: 2.6, thickness: 0.94 }, direction: "outward", speed: [0.08, 0.24],
                    lifetime: [12, 20], size: [0.3, 0.1], sizeMode: "index",
                    color: 0xC8CDD3, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 120
                },
                {
                    name: "mesh_chain", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "teeth", fallback: 18 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.06, 0.18], spin: 24,
                    lifetime: [7, 12], size: [0.11, 0.02],
                    color: 0xF2F4F6, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 140
                }
            ]
        },
        drive: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "drive_spall", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 5, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.5 }, direction: "outward", speed: [0.06, 0.18], gravity: 0.02, drag: 0.94, spin: 26,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xC8CDD3, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "drive_rise", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.45 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xE0A060, alpha: [0.45, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        drive_hold: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "hold_teeth", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 8 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.01, 0.05], spin: 30,
                    lifetime: [10, 18], size: [0.07, 0.015],
                    color: 0xC8CDD3, alpha: [0.4, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "hold_glow", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.03], spin: 12,
                    lifetime: [12, 20], size: [0.06, 0.015],
                    color: 0xE0A060, alpha: [0.3, 0], light: "full", bloom: 0.2, maxParticles: 16
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_spall", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 }, direction: "down", speed: [0.02, 0.07], spin: 18,
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xC8CDD3, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gearup", 1, GearUpDefinition);

/**
 * 齿轮本体：一圈轮齿 + 中心辐条，画在施法者身上、整体按 serverTick 连续旋转。
 * 轮面垂直于施法者朝向（水平横轴 (fz,-fx) 与竖直轴撑起圆面），轮齿数读 data.teeth，
 * 稳啮（data.steady=1）转得慢、超速转得快——都由本招算出的机制值驱动；不产生粒子、不新建实体。
 */
const GearUpGearScene = "world_combat:move_gearup/gear";
const GearUpGearSprite = "cobblemon:particle/generic/ring/mediumring";

WorldCombatClient.scene(GearUpGearScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const ref = data.target ? String(data.target) : String(entry.source || "");
    if (!ref) return;
    const raw = frame.anchor(ref);
    if (!raw) return;
    const anchor: any = JSON.parse(raw);
    if (!anchor) return;
    const height = Number(anchor.height) > 0 ? Number(anchor.height) : 1.2;
    const width = Number(anchor.width) > 0 ? Number(anchor.width) : 0.9;
    const radius = Math.max(0.3, Math.min(0.9, Math.max(width, height * 0.6) * 0.5));
    const teeth = Math.max(6, Math.min(24, Math.round(Number(data.teeth) || 16)));
    const speed = Number(data.steady) === 1 ? 40 : 64;
    const yaw = Number(anchor.bodyYaw || anchor.yaw || 0) * Math.PI / 180;
    const fx = -Math.sin(yaw), fz = Math.cos(yaw);
    const cx = Number(anchor.x), cy = Number(anchor.y) + height * 0.5, cz = Number(anchor.z);
    const phase = frame.serverTick() * speed * Math.PI / 180;
    const rim = (232 << 24 | 0xC8CDD3) | 0;
    const spoke = (196 << 24 | 0xF2F4F6) | 0;
    const hub = (236 << 24 | 0xE0A060) | 0;
    const frameIndex = Math.floor(frame.serverTick() * 0.5) % 6;
    for (let i = 0; i < teeth; i++) {
        const angle = phase + i * (Math.PI * 2 / teeth);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const x = cx + fz * radius * cos, y = cy + radius * sin, z = cz - fx * radius * cos;
        frame.line(cx, cy, cz, x, y, z, spoke);
        frame.sprite(GearUpGearSprite, x, y, z, radius * 0.6, -(angle * 180 / Math.PI) % 360, rim, frameIndex, true);
    }
    frame.sprite(GearUpGearSprite, cx, cy, cz, radius * 0.7, (phase * 90 / Math.PI) % 360, hub, frameIndex, true);
});
