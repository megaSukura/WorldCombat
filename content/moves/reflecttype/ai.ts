/**
 * 镜面属性 / reflecttype — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内、有一条通视直线，它是宝可梦、当前属性读得出来，
 *   而且照过来的结果和自己现在不一样。
 * 什么时候最想出手：对手的属性正好克到自己（对任一现有属性 ≥2×）时 priority 抬到 60，先把受击面翻过去；
 *   否则只当作普通控制，16。
 * 对谁出手：当前威胁；属性读不出、或照过来不会变的跳过。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近到能通视的射程再照。
 * 放完之后：自己的属性变成对手当前的属性，交回共享交战计划；配置「镜像全部」时连副属性一起抄。
 * ai.maxChase 决定追多远；ai.leaveStation 决定驻守时是否愿意离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:reflecttype-types", function (access, actor, _argument) {
        return PokemonSkills.reflecttypeRead(access, actor);
    });

    function reflecttypeThreatened(theirs: string[], mine: string[]): boolean {
        for (let index = 0; index < theirs.length; index++) {
            for (let own = 0; own < mine.length; own++) {
                if (CobblemonCombat.typeEffectiveness(theirs[index], mine[own]) >= 2) return true;
            }
        }
        return false;
    }

    function reflecttypeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 12)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        const own = pokemonFacts(context, self), foe = pokemonFacts(context, target);
        if (!own || !foe || !own.types.length) return false;
        const theirs = fact<string[]>(context, "world_combat:reflecttype-types", target);
        if (theirs === null || theirs.length === 0) return false;
        const chosen = PokemonSkills.reflecttypeChoose(theirs, !!(item.data.config && item.data.config.pair));
        return chosen.slice().sort().join(",") !== own.types.slice().sort().join(",");
    }

    registerUse("reflecttype", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return reflecttypeWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !reflecttypeWants(context, item, target)) return 0;
            const own = pokemonFacts(context, source(context));
            const theirs = fact<string[]>(context, "world_combat:reflecttype-types", target);
            return own && theirs && reflecttypeThreatened(theirs, own.types) ? 60 : 16;
        }
    });

    const reflecttypeChase = PokemonSkills.number("ai.maxChase", "追击距离", 3, 26, 1);
    reflecttypeChase.help = "威胁进入这个距离内才考虑照镜；越大越愿意隔着一段距离先照，调小只在贴身时用。";
    const reflecttypeStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    reflecttypeStation.help = "开启后，驻守中的伙伴也会离位去照镜；关闭则只在原地够得到时出手。";
    const reflecttypePair = PokemonSkills.flag("pair", "镜像全部属性");
    reflecttypePair.help = "开启＝镜像全部：连副属性一起抄，维持 ×1.25、冷却 +14 刻；关闭＝只取主属：更便宜、冷却少 8 刻，能避开副属性带来的额外弱点。";

    PokemonSkills.addPreferences("reflecttype", { pair: false, ai: { maxChase: 12, leaveStation: false } },
        [reflecttypePair, reflecttypeChase, reflecttypeStation]);
}
