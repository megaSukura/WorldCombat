/**
 * 识破 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）且视线畅通的威胁，自己身上还没有同一次识破。
 * 什么时候最想出手：目标属性里有幽灵时 priority 抬到 90——识破之后一般与格斗才接得上；目标带着正闪避时 82，
 *   把这层闪避一次拔掉；自己或附近队友最近真的打出了一般／格斗攻击（DamageSemantics.recentAttack 的 elementType）
 *   时 66，说明虚体兑现接得上；普通目标 40，只做通用显形，不再常驻高分。
 * 对谁出手：当前威胁；已经带着 foresight 身份的目标跳过，避免浪费 PP。
 * 够不到怎么办：reach 就是识破距离（按体型估算），由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：印记留在目标身上、一般与格斗接得上；印记还在时不重复。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 *
 * 说明：队友的招式属性不在共享观测里（survey 只发布属性、等级等个体事实），所以「队伍有一般／格斗铺垫」读的是
 *   DamageSemantics.recentAttack 里真正已发生的原生攻击 elementType，而不是按精灵自身的物种属性推断配招。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("foresight", { ai: { maxChase: 12, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function foresightTargetGhost(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && Array.isArray(facts.types) && facts.types.indexOf("ghost") >= 0;
    }

    /** 该战斗者最近一次真正打出的攻击是不是一般／格斗属性；读已发生的原生攻击记忆，不看物种属性。 */
    function foresightRecentStrike(context: WorldBehavior.Context, ref: string): boolean {
        const world = CompanionBehavior.world(context), actor = world.actor(ref);
        if (actor === null) return false;
        const recent = DamageSemantics.recentAttack(world, actor, 80);
        return !!recent && (recent.elementType === "normal" || recent.elementType === "fighting");
    }

    /** 自己或附近队友最近实际打出的一般／格斗攻击，说明识破后的虚体兑现能直接接上。 */
    function foresightPartySupport(context: WorldBehavior.Context): boolean {
        const self = source(context);
        if (foresightRecentStrike(context, String(self.ref))) return true;
        const nearby = (context.facts.nearby || []) as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.ref === self.ref) continue;
            if (foresightRecentStrike(context, other.ref)) return true;
        }
        return false;
    }

    function foresightWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "foresight")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("foresight", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || foresightWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !foresightWants(context, item, target)) return 0;
            if (foresightTargetGhost(context, target)) return 90;
            if (stage(context, target, "evasion") > 0) return 82;
            if (foresightPartySupport(context)) return 66;
            return 40;
        }
    });
}
