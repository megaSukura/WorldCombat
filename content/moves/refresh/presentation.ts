/**
 * 焕然一新 / Refresh 的粒子语言。
 *
 * 一句话：身体一沉把一口气吸满（windup）→ 一圈净息从脚下炸开，抖落的毒／灼／麻化成暗紫污浊四散（purge）→
 *   残留的清爽光环在身侧轻轻升散（clear）→ 有人想再挂异常时，一圈薄薄的护膜把他弹开（ward）。
 * 色相家族：清爽草绿 0x9CE07A 为主体，近白高光 0xE8FFD8 只做强调；被抖落的污浊用低饱和暗紫 0x8A6BB0 画小面积。
 * 拍子：起 windup 0–12t ／ 击 purge 0–26t ／ 收 clear 0–40t；ward 是反制的一下闪光。
 * 范围：purge 与 clear 的环半径随 `data.scale`（服务端按净息半径算出的倍率）缩放，站在环外就没事。
 * 运动：净息自下向上升腾、污浊向外四散、护膜向外弹开。
 * 数：purge 的爆发粒子数绑 `data.motes`（特防与体型派生），起手强度随 `data.cured` 提高。
 */
const RefreshDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "inhale", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 22, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xE8FFD8, alpha: [0.75, 0], light: "full", maxParticles: 40
                },
                {
                    name: "breath", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0x9CE07A, alpha: [0.3, 0], light: "world", maxParticles: 22
                }
            ]
        },
        purge: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "outward", speed: [0.07, 0.2], drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0x9CE07A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "shock_ring", bind: "target", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 4 }, shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [10, 18], size: [0.34, 0.78], sizeMode: "sin",
                    color: 0xE8FFD8, alpha: [0.7, 0], light: "full", maxParticles: 16
                },
                {
                    name: "residue", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "cured", fallback: 1 }, interval: 3, repeats: 6 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0x8A6BB0, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "rise", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 24, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x9CE07A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        ward: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "repel", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [7, 12], size: [0.3, 0.7], sizeMode: "sin",
                    color: 0xE8FFD8, alpha: [0.85, 0], light: "full", maxParticles: 12
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [6, 11], size: [0.07, 0.01],
                    color: 0x9CE07A, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        clear: {
            duration: 40,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "calm", bind: "target", offset: [0, 0.42, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 6, shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.006, 0.022],
                    lifetime: [16, 28], size: [0.09, 0.02],
                    color: 0xE8FFD8, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 22
                },
                {
                    name: "halo", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "circle", radius: 0.9, thickness: 0.8 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [18, 30], size: [0.16, 0.05],
                    color: 0x9CE07A, alpha: [0.22, 0.02], alphaMode: "sin", light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_refresh", 1, RefreshDefinition);
