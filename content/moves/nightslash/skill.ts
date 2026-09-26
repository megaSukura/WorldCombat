/**
 * 暗袭要害 / nightslash 的出手方式。
 *
 * 核心念头：站定收刀，朝本次瞄准方向递出一记身前窄斜切；刀口从肩侧斜下，落在第一个真实接触上。它不动、
 *   不闪，只在对手把空门露出来的那一瞬加重。它是本族唯一**读对手注意力**的一击：目标正把攻击对着别人时，这一刀更重。
 *
 * 三幕：
 *   伏（windup，提交前）：施法者收刀伏低，脚边聚起一圈暗影；只播预告，可被打断（打断不花 PP）。
 *   斩（cut → miss）：朝本次手动朝向递出短窄刀路（`kind: "aim"`，方向、点或空挥都行）；
 *       `action.trace(..., true)` 取真实首碰（前排的身体与墙都会截住），第一个接触的非友方吃一记 `cut` 接触斩击；
 *       命中那一刻若它正把攻击对着别人（空门），公式里的 `nightslash.opening` 让威力显著抬高，并在落点补一记更亮的暗痕。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器再补一发亮紫强调与浮字。
 *
 * 与既有招分开：出奇一击闪到背后放假替身、燕返掠一整条刀路、暗影拳从目标影子里出拳——暗袭要害站着不动，
 *   身份是「等对手露出空门」。与空手劈（找护甲的缝）、以牙还牙（打刚受过的伤）读的不是同一件事。
 */
namespace PokemonSkills {
    /** 窄刀路的接触半径（格）；几何常量，不随个体变化。 */
    const nightslashEdge = 0.26;
    define({
        id: nightslashId,
        cooldownParameter: "recharge",
        name: "Night Slash",
        description: "站定收刀，朝本次瞄准方向递出一记身前窄斜切：刀口从肩侧斜下，落在第一个接触的身体或方块上。不走位、不闪身；暴击率比同族高一档，目标正把攻击对着别人时，这一刀会明显更重。",
        uses: ["站定朝瞄准方向递出一记窄斜切", "对手正忙着打别人时这一刀更重", "站定出手，不走位不闪身"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.6,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "dark",
        stationary: true,
        defaults: { ambush: false, ai: { maxChase: 6, punishOpening: true, finishLow: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(nightslashId, "reach", pokemon), geometry: "line", style: "dark", color: 0x6E5AA8,
                label: config && config.ambush === true ? "伏击暗袭" : "暗袭要害" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[nightslashId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(nightslashId, "tempo", context)),
                recover: Math.round(p(nightslashId, "aftercast", context)),
                cooldown: Math.round(p(nightslashId, "recharge", context)),
                active: 0,
                range: p(nightslashId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_nightslash:coil", nightslashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", ambush: config && config.ambush === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const direction = aim(action);
            const reach = Math.max(1.2, p(nightslashId, "reach", action));
            const depth = Math.max(0.4, p(nightslashId, "depth", action));
            const motes = Math.max(10, Math.round(p(nightslashId, "motes", action)));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const heading = WorldCombat.point(direction.x(), 0, direction.z());
            const side = heading.length() < 1e-6 ? WorldCombat.point(1, 0, 0)
                : WorldCombat.point(-heading.unit().z(), 0, heading.unit().x());
            const height = self.height();
            // 肩侧起手：从肩高、偏一侧的起刀点，斜下递向瞄准方向的落点。
            const from = origin.plus(WorldCombat.point(0, height * 0.35, 0)).plus(side.scale(Math.min(0.4, height * 0.18)));
            const to = origin.plus(direction.scale(reach));

            // 权威判定：窄刀路的第一接触（含友方身体与实墙）就是刀口真实停下的地方。
            const contact = action.trace(from, to, nightslashEdge, true);
            const at = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;
            const blade = [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]];

            if (victim === null) {
                // 空挥或撞墙：刀停在接触点，只留一记窄斜收刀。
                WorldFeedback.emit(world, nightslashScene, 1, at,
                    { moment: "cut", path: blade, direction: [direction.x(), direction.y(), direction.z()],
                        motes: motes, scale: Math.max(0.5, Math.min(2.0, depth / nightslashReference)),
                        intensity: 0.7, opening: 0, target: "" }, 16);
                WorldFeedback.emit(world, nightslashScene, 1, at, { moment: "miss", scale: 1 }, 14);
                if (!contact.blocked() && lander === null)
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), nightslashMissText, [], 20);
                sound(action, "minecraft:entity.player.attack.sweep");
                done(action);
                return;
            }

            const foe = world.observe(victim);
            const busy = foe === null ? null : foe.attacking();
            const opening = busy !== null && String(busy.ref()) !== String(actor.ref());
            // 用真实命中目标求威力：空门加成属于这一刀真正切到的人。
            const power = p(nightslashId, "cut", withTarget(factContext(action), victim));
            const scale = Math.max(0.6, Math.min(2.0, depth / nightslashReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));

            WorldFeedback.emit(world, nightslashScene, 1, at,
                { moment: "cut", path: blade, direction: [direction.x(), direction.y(), direction.z()],
                    motes: motes, scale: scale, intensity: intensity, target: String(victim.ref()) }, 20);

            const landed = impact(action, contact, nightslashId, power,
                { damage: damageSpec(nightslashId, "cut"), contact: true, slice: true });
            if (landed) {
                if (opening) WorldFeedback.emit(world, nightslashScene, 1, at,
                    { moment: "seam", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), opening ? nightslashSeamText : nightslashHitText, [], 22);
                sound(action, "cobblemon:impact.dark");
            } else {
                // 伤害被拒（免疫、不可选中）：不声称命中，只留一记软收。
                WorldFeedback.emit(world, nightslashScene, 1, at,
                    { moment: "miss", target: String(victim.ref()), scale: scale }, 16);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), nightslashMissText, [], 20);
            }
            sound(action, "minecraft:entity.player.attack.sweep");
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记亮紫强调与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_nightslash/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== nightslashId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, nightslashScene, 1, at,
            { moment: "crit", target: String(target.ref()), motes: Math.max(10, Math.min(50, Math.round(ratio * 4))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), nightslashCritText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
