/**
 * 毒瓦斯 / poisongas 的客户端表现。
 *
 * 一句话：施法者朝选定处吐出一股灰绿瓦斯，瓦斯摊成一片贴地的云；云罩住谁谁就冒绿泡，被火点着时整片云翻成橙火。
 * 色相家族：灰绿（smoke / poisonbubble / ooze）为主体，饱和的黄绿只在冒泡细节，点火后叠一层橙（fire / ember）。
 * 拍子：起（windup 0–12t，喉间聚气）→ 击（exhale 喷出 / cloud 落地成云）→ 收（云慢慢稀薄；ignite 是它的第二种结局）。
 * 范围：exhale 的锥体长度就是喷吐距离，cloud 的盘面就是覆盖半径——两处都随 `data.scale`／`data.distance` 与判定同步。
 * 运动：瓦斯沿喷吐方向冲出，落定后低垂原地翻涌；被点着时向四周炸开。
 * 数：服务端把覆盖半径换算成 `scale`、喷吐距离传成 `distance`，又把爆燃的 `count`／`size`／`speed` 一并交给发射器；
 * 云越大、爆燃越猛，画面越大越密。
 * 参照节：视觉语言第二、三、四、六、七、九节（云本身要把里面藏住，遮挡在这里是目的）。
 */
const PoisongasDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.18, 0.05],
                    color: 0x8AA03A, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        exhale: {
            duration: 30,
            exit: { stop: 18, drain: 20 },
            emitters: [
                {
                    name: "jet", bind: "source", offset: [0, 0.55, 0], height: 0.4, fit: "none",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 60, shape: { kind: "cone_volume", radius: { data: "distance", fallback: 3 }, length: { data: "distance", fallback: 3 }, angleDegrees: 16 },
                    direction: "shape", speed: [0.08, 0.32],
                    lifetime: [14, 26], size: [0.3, 0.14],
                    color: 0x9AA855, alpha: [0.45, 0], light: "world", maxParticles: 220
                },
                {
                    name: "droplets", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 40, shape: { kind: "cone_volume", radius: { data: "distance", fallback: 3 }, length: { data: "distance", fallback: 3 }, angleDegrees: 14 },
                    direction: "shape", speed: [0.1, 0.38],
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xC6D84A, alpha: [0.8, 0], light: "full", maxParticles: 180
                }
            ]
        },
        cloud: {
            emitters: [
                {
                    name: "bed", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    rate: 18, shape: { kind: "circle", radius: 2.4, thickness: 0.6 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [30, 50], size: [0.55, 0.25],
                    color: 0x7E8C4A, alpha: [0.3, 0.0], alphaMode: "sin", light: "world", maxParticles: 90
                },
                {
                    name: "bubbles", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 16, shape: { kind: "circle", radius: 2.4, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [18, 34], size: [0.09, 0.03], sizeMode: "sin",
                    color: 0xA8C24A, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "rim", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 2.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [26, 40], size: [0.5, 0.2], sizeMode: "sin",
                    color: 0x6E8A3A, alpha: [0.28, 0.08], alphaMode: "sin", light: "world", maxParticles: 16
                }
            ]
        },
        burncloud: {
            emitters: [
                {
                    name: "fire_bed", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 34, shape: { kind: "circle", radius: 2.4, thickness: 0.7 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [18, 32], size: [0.42, 0.14],
                    color: 0xFF8A3A, alpha: [0.55, 0], light: "full", maxParticles: 130
                },
                {
                    name: "fire_band", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: 2.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [22, 36], size: [0.5, 0.22], sizeMode: "sin",
                    color: 0xE05A18, alpha: [0.4, 0.1], alphaMode: "sin", light: "full", maxParticles: 18
                },
                {
                    name: "stink", bind: "point", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "circle", radius: 2.2, thickness: 0.6 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [24, 40], size: [0.5, 0.24],
                    color: 0x5A4A3A, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        poisoned: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x9BE04A, alpha: [0.8, 0], light: "full", maxParticles: 16
                }
            ]
        },
        burning: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "cinder", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xFFB25A, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        ignite: {
            duration: 36,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "core", bind: "point", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 30 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: { data: "speed", fallback: 0.3 },
                    lifetime: [8, 15], size: { data: "size", fallback: 0.4 }, sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "blast_fire", bind: "point", offset: [0, 0.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 46 } },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: { data: "speed", fallback: 0.4 },
                    lifetime: [14, 26], size: { data: "size", fallback: 0.24 },
                    color: 0xFF8A3A, alpha: [0.9, 0], gravity: 0.02, drag: 0.94, light: "full", maxParticles: 180
                },
                {
                    name: "blast_smoke", bind: "point", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: { data: "speed", fallback: 0.2 },
                    lifetime: [20, 34], size: [0.4, 0.14],
                    color: 0x4A4234, alpha: [0.4, 0], light: "world", maxParticles: 100
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poisongas", 1, PoisongasDefinition);
