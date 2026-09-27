/**
 * 大快朵颐 / Stuff Cheeks 的粒子语言。
 *
 * 一句话：施法者把手里的树果举到嘴边、颊部鼓动，一口咬碎吞下——果屑与果汁在嘴边炸开，接着身周撑起一圈
 *   硬壳般的护体环，最后打个饱嗝收势。
 * 色相家族：果肉暖红 0xD2506A 作进食层，果壳暖黄 0xE0B67A 作护体环，银白 0xDCE0E8 只给硬壳的高光。
 * 拍子：起（raise 举果鼓颊）／击（eat 咬碎 + brace 撑壳）／收（settle 饱嗝）。
 * 范围：brace 的护体环绑身体、`fit:"none"`，形状按参考半径 0.9 书写、由 `data.scale`（实际护体半径 / 0.9）
 *   推出真实大小——画面里的环就是撑起来的那道壳。
 * 运动：果屑从嘴边向外抛洒后下坠，护体环由内向外一撑并轻微脉动，饱嗝是一团向上散去的白雾。
 * 数：果屑数量绑 `data.motes`（体重＋物攻派生）；护体环的硬片数量绑 `data.plates`（防御等级派生，防御越高壳越密）。
 * 手里的果子另用 `WorldCombatClient.scene` 画：按客户端实测的 yaw/pitch 放到真实嘴前，细嚼期间逐渐咬碎变小。
 */
const StuffCheeksDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.75, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.25 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xE0B67A, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "cheek", bind: "source", offset: [0, 0.72, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 6, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xD2506A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        eat: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "crumbs", bind: "source", offset: [0, 0.72, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 30, gravity: 0.03, drag: 0.9, spin: 30,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xD2506A, alpha: [0.85, 0], light: "world", maxParticles: 50
                },
                {
                    name: "juice", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.035, drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xB8405A, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        brace: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "shell_ring", bind: "source", fit: "none", offset: [0, 0.0, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "circle", radius: 0.9, thickness: 0.8 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: [0.4, 0.16], sizeMode: "index",
                    color: 0xE0B67A, alpha: [0.7, 0], light: "full", maxParticles: 16
                },
                {
                    name: "plates", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "plates", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], spread: 20,
                    lifetime: [10, 18], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xDCE0E8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "hard_glint", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 6 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xDCE0E8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        settle: {
            duration: 22,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "burp", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0xC9C3B4, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        none: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "empty", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.18, 0.04],
                    color: 0x8A8378, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stuffcheeks", 1, StuffCheeksDefinition);

/**
 * 嘴里那颗果的图：用施法者当帧插值后的 yaw/pitch 把果的小图标放到真实嘴前（不再用固定世界 +Z 偏移）；
 * `moment: "raise"` 举在嘴边，`moment: "eat"` 起算 `chew` 刻内逐渐咬碎、alpha 归零。
 * 固定数量（每刻一枚），不生成粒子或实体；贴图取物品图集 `item/<path>`。
 */
function stuffcheeksBerryTexture(item: string): string {
    const split = item.indexOf(":");
    const namespace = split < 0 ? "minecraft" : item.slice(0, split);
    const path = split < 0 ? item : item.slice(split + 1);
    return namespace + ":item/" + path;
}
WorldCombatClient.scene("world_combat:move_stuffcheeks_berry", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (typeof data.item !== "string" || !data.item) return;
    const anchor: any = JSON.parse(frame.anchor(entry.source));
    if (!anchor || typeof anchor.x !== "number" || typeof anchor.yaw !== "number") return;
    const yaw = Number(anchor.yaw) * Math.PI / 180, pitch = Number(anchor.pitch) * Math.PI / 180;
    const forward = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const height = Math.max(0.16, Math.min(0.5, Number(anchor.height) * 0.3));
    const reach = Number(anchor.width) * 0.5 + height * 0.55;
    let size = height, alpha = 1;
    if (data.moment === "eat") {
        const start = typeof data.start === "number" ? data.start : frame.serverTick();
        const chew = typeof data.chew === "number" && data.chew > 0 ? data.chew : 8;
        const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / chew));
        if (t >= 1) return;
        size = height * (1 - 0.9 * t);
        alpha = 1 - t;
    }
    const color = ((Math.round(alpha * 255) << 24) | 0xFFFFFF) | 0;
    frame.sprite(stuffcheeksBerryTexture(data.item),
        Number(anchor.x) + forward[0] * reach,
        Number(anchor.y) + height * 0.6 + forward[1] * reach + (data.moment === "raise" ? Math.sin(frame.serverTick() * 0.4) * 0.02 : 0),
        Number(anchor.z) + forward[2] * reach,
        size, 0, color, 0, true);
});
