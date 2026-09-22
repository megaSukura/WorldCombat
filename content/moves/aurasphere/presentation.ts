/**
 * 波导弹 / aurasphere 的客户端表现。
 *
 * 一句话：波导之力从施法者体内被逼到掌前、凝成一颗脉动的蓝色球，随后沿瞄准线射出、一路拐弯咬住目标，
 *   命中处炸开一圈格斗冲击与散开的波导光点。
 * 色相家族：波导蓝（0x6FA8FF）为主体，近白蓝（0xDCEBFF）在球心与光点；饱和只出现在球心与命中核心的小面积。
 * 拍子：起 charge（体内逼出波导）→ 行 flight（球飞行、拐弯、拖尾）→ 击 burst（命中炸开）→ 收 miss。
 * 范围：burst 的环按 `data.scale`（判定半径 / 0.32）画开，玩家看出这颗球能压住多大一圈。
 * 运动：flight 绑 projectile 沿轨迹拖尾；`data.direction` 不写，球的实际朝向由引擎追踪决定，画面与机制同步。
 * 数：`data.motes`（特攻与等级派生）决定飞行与命中的光点密度；命中强弱按 `data.intensity` 抬亮。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AurasphereDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [7, 13], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0x6FA8FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "core", bind: "source", offset: [0, 0.05, 0], height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 12, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xDCEBFF, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 36
                }
            ]
        },
        flight: {
            duration: 120,
            exit: { stop: 96, drain: 18 },
            emitters: [
                {
                    name: "sphere", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [5, 10], size: [0.3, 0.12],
                    color: 0x6FA8FF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    trail: { minDistance: 0.22 }, rate: { data: "motes", fallback: 18 }, spin: 20,
                    direction: "away", speed: [0.0, 0.05], spread: 30,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xDCEBFF, alpha: [0.8, 0], light: "full", maxParticles: 130
                },
                {
                    name: "aura", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 16, shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0x6FA8FF, alpha: [0.55, 0], light: "full", maxParticles: 70
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.04, 0.18],
                    lifetime: 8, size: [0.34, 0.06], sizeMode: "index",
                    color: 0xDCEBFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 12
                },
                {
                    name: "wave", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.4, 0.9],
                    color: 0x6FA8FF, alpha: [0.6, 0], light: "full", bloom: 0.3
                },
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30, spin: 20,
                    lifetime: [9, 17], size: [0.1, 0.02],
                    color: 0xDCEBFF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "disperse", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.09, 0.02],
                    color: 0x6FA8FF, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aurasphere", 1, AurasphereDefinition);
