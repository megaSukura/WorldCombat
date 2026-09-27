/**
 * 戏法 / trick 的客户端表现。
 *
 * 一句话：施法者朝目标抛出一撮假印记把它的注意力引开，一条超能心线在两者之间拉直，两件持有物各沿心线
 * 飞向对方，手里各落一圈紫色落定光。
 * 色相家族：超能紫（psyring / orb）为主，近白细节（tinydust / smallsparkle）作衬；饱和紫只出现在心线与脉冲的小面积。
 * 拍子：起（feint 假印记）→ 连（link 心线拉直）→ 换（trade 两件道具对飞）→ 落（settle 两端落定）。
 * 范围：feint 画在目标身上，link 沿 data.path 的施法者—目标顶点铺开，画面就是心线落到的两点之间。
 * 运动：假印记朝目标飘出后被吸散；心线上的光点由两端向中间涌、再沿道具飞行的方向分开。
 * 数：`data.motes`（特攻与等级派生的心尘数）驱动心线与两端粒子量，`data.decoys`（等级派生的假印记数）驱动起手，
 * `data.span`（本次实际两点距离）随载荷提供；两只精灵放同一招画面也不同。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const TrickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        feint: {
            duration: 22,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "decoy", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "decoys", fallback: 3 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.09, 0.015],
                    color: 0xD9A8FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "hush", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 11], size: [0.05, 0.01],
                    color: 0x9B6FD0, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "hint", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xC77DFF, alpha: [0.4, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        link: {
            duration: 28,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0xC77DFF, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "node", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: 12, size: [0.24, 0.05],
                    color: 0xE7D2FF, alpha: [0.75, 0], light: "full", maxParticles: 30
                },
                {
                    name: "nodeFoe", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: { data: "motes", fallback: 14 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: 12, size: [0.26, 0.05],
                    color: 0xD9B8FF, alpha: [0.75, 0], light: "full", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "land", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [9, 16], size: [0.11, 0.02],
                    color: 0xF2E6FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "target",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x6E5A82, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_trick", 1, TrickDefinition);

/**
 * 戏法换装已由原子事务即时完成；这里只把两件真实物品沿施法者—目标的实际短路径做纯视觉对飞：
 * 从身体外沿发射、沿直线到位后结束，不生成实体、不参与碰撞，因此不会被源体或遮挡提前打断。
 * 两端位置逐帧读 `frame.anchor`（插值脚点/体型），物品贴图由物品 id 映射到图集。
 */
WorldCombatClient.scene("world_combat:move_trick_arc", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ mine?: string; theirs?: string; source?: string; target?: string; start?: number; dur?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data) return;
    const start = typeof data.start === "number" && isFinite(data.start) ? data.start : frame.serverTick();
    const duration = typeof data.dur === "number" && data.dur > 0 ? data.dur : 12;
    const elapsed = frame.serverTick() - start;
    if (elapsed < 0 || elapsed > duration) return;
    const progress = Math.max(0, Math.min(1, elapsed / duration));
    const ease = progress * progress * (3 - 2 * progress);
    const from = trickAnchor(frame, entry.source);
    const to = trickAnchor(frame, data.target);
    if (from === null || to === null) return;
    const fromEdge = trickOutside(from, to), toEdge = trickOutside(to, from);
    if (data.mine) trickCarry(frame, data.mine, fromEdge, toEdge, ease, progress);
    if (data.theirs) trickCarry(frame, data.theirs, toEdge, fromEdge, ease, progress);
});

interface TrickAnchor { x: number; y: number; z: number; width: number; height: number; }
function trickAnchor(frame: CombatClientFrame, ref: any): TrickAnchor | null {
    const parsed = ref ? JSON.parse(frame.anchor(String(ref))) : null;
    if (!parsed) return null;
    const x = Number(parsed.x), y = Number(parsed.y), z = Number(parsed.z);
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return null;
    return { x: x, y: y, z: z, width: typeof parsed.width === "number" ? parsed.width : 0.9,
        height: typeof parsed.height === "number" ? parsed.height : 1.4 };
}
/** 从身体外沿起步：沿朝向挪出至少半个身位，物品不在源体内部出现。 */
function trickOutside(from: TrickAnchor, to: TrickAnchor): TrickAnchor {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length < 0.01) return from;
    const step = Math.max(0.4, from.width * 0.5 + 0.15);
    return { x: from.x + dx / length * step, y: from.y + dy / length * step, z: from.z + dz / length * step,
        width: from.width, height: from.height };
}
function trickCarry(frame: CombatClientFrame, item: any, from: TrickAnchor, to: TrickAnchor, ease: number, progress: number): void {
    const x = from.x + (to.x - from.x) * ease;
    const y = from.y + (to.y - from.y) * ease + from.height * 0.5 + Math.sin(progress * Math.PI) * 0.35;
    const z = from.z + (to.z - from.z) * ease;
    const alpha = Math.max(0, Math.min(255, Math.round(240 * (1 - progress * 0.3))));
    frame.sprite(trickItemSprite(item), x, y, z, 0.32, progress * 360, (alpha << 24) | 0xE9DDF4, 0, true);
}
/** 物品注册 id 到原版物品图集贴图 id：`cobblemon:oran_berry` -> `cobblemon:item/oran_berry`。 */
function trickItemSprite(id: any): string {
    const value = String(id || "");
    if (!value) return "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";
    const split = value.indexOf(":");
    return split < 0 ? "minecraft:item/" + value : value.slice(0, split) + ":item/" + value.slice(split + 1);
}


