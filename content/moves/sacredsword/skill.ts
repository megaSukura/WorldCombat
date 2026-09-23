/** 斩击选中目标，忽略其防御能力等级变化。普通生物的装备护甲仍参与减伤。 */
namespace PokemonSkills {
    const sacredswordScene = "world_combat:move_sacredsword";
    const sacredswordHitText = "world_combat.move.sacredsword.text.hit";
    const sacredswordMissText = "world_combat.move.sacredsword.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function sacredswordHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 一道斜下的长切痕：从身侧偏下到身前偏上，横跨整条刃程；判定与画面共用两端点。 */
    function sacredswordStroke(origin: CombatPoint, heading: CombatPoint, reach: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const near = origin.plus(side.scale(reach * 0.18)).plus(heading.scale(0.25));
        const far = origin.plus(side.scale(-reach * 0.16)).plus(heading.scale(reach));
        return [[near.x(), near.y() + 0.45, near.z()], [far.x(), far.y() + 1.15, far.z()]];
    }

    define({
        freeMovement: true,
        id: sacredswordId,
        cooldownParameter: "recharge",
        name: "Sacred Sword",
        description: "斩击选中目标，忽略其防御能力等级变化。普通生物的装备护甲仍参与减伤。",
        uses: ["把长角拉满，朝前送出一记最长的切斩", "把目标涨起来的防御等级直接无视掉", "在射程外缘一刀切开单个目标"],
        kind: "enemy",
        range: 3.2,
        maxRange: 4.6,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "sword",
        defaults: { iaido: false, ai: { maxChase: 6, breakGuard: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(sacredswordId, "reach", pokemon), geometry: "line", style: "sword", color: 0xE8E0A8,
                label: config && config.iaido === true ? "圣剑·居合" : "圣剑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[sacredswordId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(sacredswordId, "tempo", context)),
                recover: Math.round(p(sacredswordId, "aftercast", context)),
                cooldown: Math.round(p(sacredswordId, "recharge", context)),
                active: 0,
                range: p(sacredswordId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sacredsword:draw", sacredswordScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", windup: prepare, iaido: config && config.iaido === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const heading = sacredswordHeading(aim(action));
            const reach = Math.max(2.6, p(sacredswordId, "reach", action));
            const edge = Math.max(0.22, p(sacredswordId, "edge", action));
            const depth = Math.max(1.6, p(sacredswordId, "depth", action));
            const lunge = Math.max(0, p(sacredswordId, "lunge", action));
            const power = p(sacredswordId, "cut", action);
            const gleam = Math.max(8, Math.round(p(sacredswordId, "gleam", action)));
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const scale = Math.max(0.6, Math.min(1.9, reach / 3.2));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const direction = [heading.x(), heading.y(), heading.z()];
            const iaido = config && config.iaido === true ? 1 : 0;

            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, sacredswordScene, 1, origin,
                    { moment: "miss", path: sacredswordStroke(origin, heading, reach), direction: direction,
                      gleam: Math.round(gleam * 0.6), scale: scale, iaido: iaido }, 16);
                WorldFeedback.text(world, origin.plus(heading.scale(reach * 0.8)).plus(WorldCombat.point(0, 1.0, 0)), sacredswordMissText, [], 20);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { done(action); return; }
            const toTarget = foe.position().minus(origin);
            const distance = toTarget.length();
            if (distance > reach * 0.85 && lunge > 0.02) {
                const step = Math.min(lunge, Math.max(0, distance - reach * 0.7));
                if (step > 0.02) world.displace(actor, toTarget.unit().scale(step));
            }
            const arrived = world.observe(actor);
            const at = arrived === null ? origin : arrived.position();
            const strike = foe.position();
            const stroke = sacredswordStroke(at, heading, reach);

            sound(action, "minecraft:item.trident.hit");
            WorldFeedback.emit(world, sacredswordScene, 1, at,
                { moment: "slash", path: stroke, direction: direction, reach: reach, gleam: gleam,
                  scale: scale, intensity: intensity, iaido: iaido }, 20);

            const landed = hurt(action, target, sacredswordId, power,
                { damage: damageSpec(sacredswordId, "cut"), contact: true, slice: true });
            WorldFeedback.emit(world, sacredswordScene, 1, strike,
                { moment: landed ? "cut" : "miss", target: String(target.ref()), gleam: gleam,
                  scale: scale, intensity: intensity }, 20);
            WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.15, 0)), landed ? sacredswordHitText : sacredswordMissText, [], 22);
            sound(action, landed ? "cobblemon:impact.fighting" : "minecraft:entity.player.attack.sweep");
            done(action);
        }
    });

    // 「无视对手的能力变化」：本招结算前，把目标本段对应的防御能力等级归零。
    // 归零只作用于这一次结算的本地快照，不修改目标真正的等级；攻击方自身等级与其余结算照常。
    PokemonDamage.metadata.define({
        id: "world_combat:move_sacredsword/ignore-stages",
        applies: function (context: PokemonDamage.MetadataContext) {
            return context.metadata.move === sacredswordId && !!context.targetFacts;
        },
        apply: function (context: PokemonDamage.MetadataContext) {
            PokemonDamage.ignoreDefenceStages(context);
        }
    });
}
