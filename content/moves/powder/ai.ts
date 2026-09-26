/**
 * 粉尘 / powder 的伙伴 AI 用途：这是这招自己的一套出手计划——先给对手埋一颗，等它自己点火。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，且它身上还没有粉尘时。判断目标会不会放火不再只看火属性：
 *   优先看最近一次真实火攻记录与它实际配招里的火招（原生事实）；火属性只作次要加分，草属性直接跳过。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。
 * 够不到怎么办：reach 是投掷距离，超出先走近；这是远程一抛，站远一点也能埋。
 * 放完之后：粉尘贴在对手身上等它点火，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    /** 最近真的放过火、或实际配招里带着可用的火属性招式——不是仅凭属性猜。 */
    function powderFireArmed(context: WorldBehavior.Context, threat: Entity): boolean {
        const world = CompanionBehavior.world(context);
        const actor = world.actor(String(threat.ref));
        if (actor === null || !world.valid(actor)) return false;
        const memory = DamageSemantics.recentAttack(world, actor, 200);
        if (memory !== null && PokemonSkills.powderFire({ damageType: memory.type, damageTags: memory.tags })) return true;
        if (String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move && move.pp() > 0 && String(move.type()) === "fire") return true;
        }
        return false;
    }

    function powderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (status(context, threat, "powdered")) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        const facts = CompanionBehavior.pokemonFacts(context, threat);
        if (facts && facts.types && facts.types.indexOf("grass") >= 0) return false;
        return true;
    }

    registerUse("powder", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || powderWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !powderWants(context, item, target)) return 0;
            if (powderFireArmed(context, target)) return 82;
            const facts = CompanionBehavior.pokemonFacts(context, target);
            const fireType = !!facts && !!facts.types && facts.types.indexOf("fire") >= 0;
            return fireType ? 50 : 40;
        }
    });

    PokemonSkills.addPreferences("powder", { ai: { maxChase: 10, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
