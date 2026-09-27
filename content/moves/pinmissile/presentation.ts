/**
 * 飞弹针 / pinmissile 的客户端表现。
 *
 * 一句话：施法者抖开一身虫绿细针，按固定节奏一根接一根「咻、咻」地追着目标飞过去，每根扎进去就留在身上不拔；
 *   扎得越多，目标身上固定位置亮起的针头越多，直到钉刺到期或被清除才一起退去；撞墙按真实接触点扎住，撞到友体则被弹开。
 * 色相家族：虫绿（0x9FD44A spike 偏色）＋近白针尖亮点（glowingsparkle）＋一点impact 亮边。
 * 拍子：起 bristle（竖针）→ 射 volley（一根接一根，真实投影）→ 钉 stick／扎墙 stuck／友体 friendly／被挡 blocked
 *   → 持续 pinned（固定针位数量＝实际钉数，自定义场景）→ 收 done（针架回收）。
 * 范围：本招是单体追踪连发，画面靠每根针的真实轨迹标出「追到哪」，落点在目标身上，没有地面轮廓。
 * 运动：每根针是服务端 `LivingActions.projectile` 的真投递（`bind:"projectile"`），命中在目标身上炸开一小簇。
 * 数：`data.shots` 让起手读出一梭几根，`data.bristles`（物攻换算的针量）绑定命中碎屑量，
 *   `data.intensity`（单针威力 / 25）放大整幕，`data.scale`（针判定 / 0.13）让大个子的针更长；
 *   身上针头由下方 `world_combat:move_pinmissile_pinned` 自定义场景按 `data.count` 画固定数量的贴图，不生成粒子。
 */
const PinmissileDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bristle: {
            duration: 12,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "shake", bind: "source", offset: [0, 0.4, 0.15], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shots", fallback: 3 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.16, 0.03],
                    color: 0x9FD44A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 22
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.4, 0.15], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [4, 9], size: [0.07, 0.015],
                    color: 0xE6F5B0, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "needle", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    trail: { minDistance: 0.2 }, rate: 30,
                    direction: "velocity", speed: [0.0, 0.02], spin: 4,
                    lifetime: [4, 8], size: [0.17, 0.04],
                    color: 0x9FD44A, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: 12,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.04, drag: 0.92,
                    lifetime: [5, 10], size: [0.05, 0.015],
                    color: 0x8FA83A, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        stick: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [4, 8], size: [0.24, 0.04], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 12
                },
                {
                    name: "chips", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bristles", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.06, drag: 0.9,
                    lifetime: [7, 14], size: [0.05, 0.015],
                    color: 0x8FA83A, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        stuck: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "plant", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x9FD44A, alpha: [0.85, 0], light: "full", maxParticles: 6
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.06], gravity: 0.05, drag: 0.9,
                    lifetime: [7, 12], size: [0.04, 0.012],
                    color: 0x8FA83A, alpha: [0.4, 0], light: "world", maxParticles: 14
                }
            ]
        },
        friendly: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    // 友体：针被弹开、掉头滑走，不扎进身体，与扎墙/被挡分开。
                    name: "deflect", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.26], spread: 30, gravity: 0.05, spin: 14,
                    lifetime: [6, 12], size: [0.13, 0.025],
                    color: 0x6E8A3A, alpha: [0.6, 0], light: "world", maxParticles: 16
                }
            ]
        },
        blocked: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ward", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], spread: 24,
                    lifetime: [6, 11], size: [0.12, 0.025],
                    color: 0x7C8A5A, alpha: [0.6, 0], light: "world", maxParticles: 14
                }
            ]
        },
        done: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "settle", bind: "source", offset: [0, 0.28, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.04],
                    color: 0x9FD44A, alpha: [0.5, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pinmissile", 1, PinmissileDefinition);

/**
 * 身上钉针的自定义场景：固定针位、数量等于实际钉数。
 *
 * 针位由服务端给出的 `data.count` 决定，位置按受术者锚点的 bodyYaw 与体型实时换算成世界点，
 * 所以转身、不同体型时针头都仍贴在身上；不生成粒子、不加实体，随载体的续期消息存亡。
 */
const PinmissilePinned = "cobblemon:particle/generic/spike";
const PinmissilePinnedGlow = "cobblemon:particle/generic/sparkle/glowingsparkle";

function pinmissileNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

/** 受术者身上的一个固定针位：按锚点朝向/体型把 [前, 右, 上] 分量换算成世界点。 */
function pinmissileSite(frame: CombatClientFrame, ref: string, f: number, r: number, u: number, fallback: number[]): number[] {
    const raw = ref ? frame.anchor(ref) : null;
    const anchor = raw ? JSON.parse(raw) : null;
    if (anchor) {
        const width = pinmissileNumber(anchor.width, 0.9) > 0 ? pinmissileNumber(anchor.width, 0.9) : 0.9;
        const height = pinmissileNumber(anchor.height, 1.4) > 0 ? pinmissileNumber(anchor.height, 1.4) : 1.4;
        const yaw = pinmissileNumber(anchor.bodyYaw, pinmissileNumber(anchor.yaw, 0)) * Math.PI / 180;
        const fx = -Math.sin(yaw), fz = Math.cos(yaw);
        const rx = -Math.cos(yaw), rz = -Math.sin(yaw);
        const hw = width * 0.5, hh = height * 0.5;
        return [anchor.x + fx * (f * hw) + rx * (r * hw), anchor.y + hh + u * hh, anchor.z + fz * (f * hw) + rz * (r * hw)];
    }
    return fallback.slice();
}

/** 固定针位表：按索引给出 [前, 右, 上] 分量与绘制滚角，前几根始终落在同样的位置。 */
const PinmissileSites: number[][] = [
    [0.55, 0.15, 0.55, 22],
    [0.15, 0.78, 0.30, 128],
    [-0.35, 0.55, 0.68, 74],
    [0.38, -0.65, 0.02, 205],
    [-0.22, -0.45, 0.42, 300],
    [0.05, 0.25, 0.82, 350]
];

WorldCombatClient.scene("world_combat:move_pinmissile_pinned", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const ref = String(data.target || entry.source || "");
    const count = Math.max(0, Math.min(PinmissileSites.length, Math.round(pinmissileNumber(data.count, 0))));
    if (!ref || count <= 0) return;
    for (let index = 0; index < count; index++) {
        const site = PinmissileSites[index];
        const point = pinmissileSite(frame, ref, site[0], site[1], site[2], entry.position);
        const pulse = 0.5 + 0.5 * Math.sin(frame.serverTick() * 0.2 + index * 1.9);
        frame.sprite(PinmissilePinned, point[0], point[1], point[2], 0.2 + 0.05 * pulse, site[3],
            ((Math.round(150 + 80 * pulse) << 24) | 0xB6E86B) | 0, 0, true);
        frame.sprite(PinmissilePinnedGlow, point[0], point[1], point[2], 0.05 + 0.02 * pulse, 0,
            ((Math.round(90 + 60 * pulse) << 24) | 0xE6F5B0) | 0, 0, true);
    }
});
