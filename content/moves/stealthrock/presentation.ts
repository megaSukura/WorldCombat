/**
 * 隐形岩 / stealthrock 的客户端表现。
 *
 * 一句话：脚边碎石被抬到半空，散成 6 枚小石悬在各自轨位上；有人闯入时，最近那枚小石从它所在的轨位飞出，
 * 打中目标（或撞上墙）时溅开碎屑；空位会在一段时间后补回。
 * 色相家族：岩石灰（0x9E9A90 偏冷的石面）为主、冷白（0xE8E6DE）做落地高光，`sparkle/smallsparkle` 原色做尖端反光。
 * 拍子：起（windup）→ 抬（throw / raise）→ 守（launch 离轨短飞 / hit 命中）→ 碎（shatter 打空撞墙）。
 * 范围：raise 是 `bind:"point"`、`fit:"none"`；6 个悬石轨位由独立 scene 逐帧按真实槽位绘制（见文件末）。
 * 运动：岩块由 `bind:"projectile"` 跟随真实弹体；命中朝目标下坠、撞墙向外溅开。
 * 数：`data.power`（机制威力）决定命中碎屑数量，`data.stones` 决定抛/抬的石量，`data.scale`（半径/参考 2.6）控制尺寸。
 */
const StealthRockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.2, 0.3], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 18, shape: { kind: "sphere", radius: 0.42 },
                    direction: "down", speed: [0.01, 0.06], spin: 10,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9E9A90, alpha: [0.7, 0], maxParticles: 50
                }
            ]
        },
        throw: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stones", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 22, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.07], spread: 22, spin: 24,
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0x9E9A90, alpha: [0.85, 0], maxParticles: 60
                },
                {
                    name: "grit", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 3, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0, 0.02],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE8E6DE, alpha: [0.5, 0], maxParticles: 40
                }
            ]
        },
        raise: {
            duration: 38,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "ground_ring", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 20], size: [0.26, 0.6],
                    color: 0xE8E6DE, alpha: [0.6, 0], maxParticles: 80
                },
                {
                    name: "rise", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "stones", fallback: 6 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.06, 0.18], spread: 14, spin: 30,
                    lifetime: [14, 26], size: [0.3, 0.06],
                    color: 0x9E9A90, alpha: [0.9, 0], maxParticles: 90
                },
                {
                    name: "dust_cloud", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 44 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xE8E6DE, alpha: [0.45, 0], maxParticles: 90
                }
            ]
        },
        launch: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "flying", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 20, shape: { kind: "sphere", radius: 0.14 },
                    direction: "velocity", speed: [0.01, 0.04], spread: 12, spin: 26,
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0x9E9A90, alpha: [0.9, 0], maxParticles: 30
                },
                {
                    name: "depart", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE8E6DE, alpha: [0.5, 0], maxParticles: 24
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "smash", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 3, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.26], spread: 24,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8E6DE, alpha: [1, 0], maxParticles: 50
                },
                {
                    name: "fall", bind: "target", height: 1.3,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "stones", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.08, 0.2], spread: 20, spin: 40,
                    lifetime: [8, 16], size: [0.2, 0.04],
                    color: 0x9E9A90, alpha: [0.9, 0], maxParticles: 50
                }
            ]
        },
        shatter: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "bits", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.18], spread: 26, spin: 30,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0x9E9A90, alpha: [0.85, 0], maxParticles: 26
                },
                {
                    name: "grit", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8E6DE, alpha: [0.45, 0], maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stealthrock", 1, StealthRockDefinition);

// 6 个真实轨位：有石头的轨位画一块石，空轨位只留一圈淡淡的空座。数据来自 field 的 slots（世界坐标 + 占位）。
// 绑定在 field 效果上（WorldFeedback.onEffect），随石阵自然到期或被替换一起消失。
WorldCombatClient.scene("world_combat:move_stealthrock_field", 1, function (frame) {
    const entry: CombatSceneEntry<{ slots: number[][]; radius: number; heavy: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const slots = entry.data.slots || [];
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot[3]) {
            frame.billboard(slot[0], slot[1], slot[2], 0.022, function (surface) {
                surface.fill(-6, -7, 12, 14, 0xE0A9A49A);
                surface.fill(-8, -9, 16, 3, 0xE0E8E6DE);
            });
        }
        else {
            frame.ring(slot[0], slot[1], slot[2], 0.12, 0x66807C74);
        }
    }
});
