/**
 * 暗袭要害 / nightslash 的出手方式。
 *
 * 核心念头：脚下牵出一缕影线，顺着影线在对手身上切出一道暗痕——它不动、不闪，只在对手把空门露出来
 *   的那一瞬加重。它是本族唯一**读对手注意力**的一击：目标正把攻击对着别人时，这一刀更重。
 *
 * 三幕：
 *   伏（windup，提交前）：施法者伏低，脚边聚起一圈暗影；只播预告，可被打断（打断不花 PP）。
 *   牵（thread，提交后）：一缕暗影从脚下牵到目标身前，标出这一刀的来路。
 *   斩（cut → miss）：目标吃一记 `cut` 接触斩击；命中那一刻若它正把攻击对着别人（空门），
 *       公式里的 `nightslash.opening` 让威力显著抬高，并在落点补一记更亮的暗痕。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器再补一发亮紫强调与浮字。
 *
 * 与既有招分开：出奇一击闪到背后放假替身、燕返掠一整条刀路、暗影拳从目标影子里出拳——暗袭要害站着不动，
 *   身份是「等对手露出空门」。与空手劈（找护甲的缝）、以牙还牙（打刚受过的伤）读的不是同一件事。
 */
namespace PokemonSkills {
    define({
        id: nightslashId,
        name: "Night Slash",
        description: "The user slashes the target the instant an opportunity arises. This move has a heightened chance of landing a critical hit.",
        uses: ["脚下牵出一缕影线，在对手身上切一道暗痕", "对手正忙着打别人时这一刀更重", "站定出手，不走位不闪身"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.2,
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
            const target = action.target();
            const direction = aim(action);
            const reach = p(nightslashId, "reach", action);
            const depth = p(nightslashId, "depth", action);
            const power = p(nightslashId, "cut", action);
            const motes = Math.max(10, Math.round(p(nightslashId, "motes", action)));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const scale = Math.max(0.6, Math.min(2.0, depth / nightslashReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));

            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, nightslashScene, 1, origin.plus(direction.scale(reach)), { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, origin.plus(direction.scale(reach)).plus(WorldCombat.point(0, 0.9, 0)), nightslashMissText, [], 20);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { done(action); return; }
            const strike = foe.position();
            const busy = foe.attacking();
            const opening = busy !== null && String(busy.ref()) !== String(actor.ref());

            WorldFeedback.emit(world, nightslashScene, 1, origin,
                { moment: "thread", path: [[origin.x(), origin.y(), origin.z()], [strike.x(), strike.y(), strike.z()]],
                    direction: [direction.x(), direction.y(), direction.z()], motes: motes, scale: scale, intensity: intensity }, 20);

            const landed = hurt(action, target, nightslashId, power,
                { damage: damageSpec(nightslashId, "cut"), contact: true, slice: true });
            WorldFeedback.emit(world, nightslashScene, 1, strike,
                { moment: landed ? "cut" : "miss", target: String(target.ref()), opening: opening ? 1 : 0,
                    motes: motes, scale: scale, intensity: intensity }, 20);
            if (landed) {
                if (opening) WorldFeedback.emit(world, nightslashScene, 1, strike,
                    { moment: "seam", target: String(target.ref()), motes: motes, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.1, 0)), opening ? nightslashSeamText : nightslashHitText, [], 22);
                sound(action, "cobblemon:impact.dark");
            } else {
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.1, 0)), nightslashMissText, [], 20);
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
