/**
 * 绞紧 / wringout 的客户端表现。
 *
 * 一句话：施法者身侧先盘起一圈紫晶螺旋气，随即这股力沿瞄准方向扫出一条窄线、缠上第一个碰到的敌人，
 *   由脚到头越拧越紧，一道道流光被从身体里绞出、向上散开；双绞式会再反向拧一记，第二圈朝相反方向收、更亮更密。
 * 色相家族：紫晶（0x9A7BFF）主体、淡紫（0xD8CCFF）细节、深紫（0x5A3FA8）余韵；单一色相。
 * 拍子：起 coil（盘螺旋）→ 击 squeeze（第一拧，向右收）→ 再击 squeeze2（双绞式第二拧，向左收）→ 空 whiff / 撞墙 wall。
 * 范围：squeeze 的螺旋环半径按 `data.scale`（实际螺旋半径 / 1.2）铺开，画出的圈就是被缠住的范围。
 * 运动：螺旋贴目标向内旋紧；第一拧与第二拧的旋转方向相反（squeeze 的 spin 为正、squeeze2 为负），读作一紧一松的反拧；
 *   被绞出的流光沿目标向上飞出；收拢时环向内收；撞墙时窄线沿 `data.path` 停在接触面。
 * 数：`data.motes`（特攻与等级派生）决定螺旋点与流光量，`data.coil`（等级派生）决定扭转时长，
 *   `data.girth`（命中当刻的目标生命比例派生）决定威力环与螺旋管的粗细——血越满环越粗、血越少环越细；
 *   `data.intensity`（本拧威力 / 95）抬高亮度，`data.pulse` 区分第一／第二拧。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const WringoutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "spin_up", bind: "source", offset: [0, 0, 0], height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 16, shape: { kind: "sphere", radius: 0.95 },
                    direction: "inward", speed: [0.03, 0.12], spin: 20,
                    lifetime: [8, 16], size: [0.24, 0.05],
                    color: 0x9A7BFF, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "coil_mote", bind: "source", offset: [0, 0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08], drag: 0.9, spin: 14,
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xD8CCFF, alpha: [0.45, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        },
        squeeze: {
            duration: 32,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "spiral", bind: "target", offset: [0, 0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 40, shape: { kind: "torus", radius: { data: "scale", fallback: 1 }, thickness: { data: "girth", fallback: 0.5 } },
                    direction: "inward", speed: [0.02, 0.1], spin: 26,
                    lifetime: [10, 20], size: [0.3, 0.05],
                    color: 0x9A7BFF, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "squeeze_ring", bind: "target", offset: [0, 0, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 6, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, thickness: { data: "girth", fallback: 0.4 }, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.36, 0.6], sizeMode: "index",
                    color: 0xD8CCFF, alpha: [0.55, 0], light: "full", maxParticles: 30
                },
                {
                    name: "stream", bind: "target", offset: [0, 0, 0], height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.06, 0.2], gravity: -0.01, drag: 0.95, spin: 12,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xD8CCFF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.4, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 12, at: 2 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [6, 11], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xD8CCFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 46
                }
            ]
        },
        squeeze2: {
            duration: 32,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "spiral2", bind: "target", offset: [0, 0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 60, shape: { kind: "torus", radius: { data: "scale", fallback: 1 }, thickness: { data: "girth", fallback: 0.55 } },
                    direction: "inward", speed: [0.03, 0.14], spin: -32,
                    lifetime: [10, 20], size: [0.34, 0.06],
                    color: 0xB79CFF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 220
                },
                {
                    name: "stream2", bind: "target", offset: [0, 0, 0], height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.08, 0.24], gravity: -0.01, drag: 0.95, spin: -14,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xE6DEFF, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 140
                },
                {
                    name: "flash2", bind: "target", offset: [0, 0.4, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.05, 0.22],
                    lifetime: [6, 11], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                }
            ]
        },
        wall: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "streak", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0x9A7BFF, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "splash", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.92,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0x5A3FA8, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0x5A3FA8, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wringout", 1, WringoutDefinition);
