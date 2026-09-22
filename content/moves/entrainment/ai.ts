/**
 * 找伙伴 / entrainment — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内、有一条通视直线，双方都是宝可梦、
 *   双方特性读得出来且不同、对方特性接得住（不是 truant、不带 cantsuppress），自己的特性递得出去。
 *   还要求这次递出去不亏：自己的特性是拖累（懒惰、慢启动、软弱…），或对手的特性值得被顶掉。
 * 对谁出手：当前威胁；特性已经被顶成和自己一样、读不出特性、或者递过去会帮到对手的目标跳过。
 * 候选之间怎么排：自己特性是拖累时 priority 64，排在普通控制之前；对手特性值得顶掉时 30。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近到能通视的射程再踩。
 * 放完之后：对手（以及节拍波及到的其他敌人）特性变成施法者的，交回共享交战计划；标记与特性层同时到期。
 * ai.maxChase 决定追多远；ai.leaveStation 决定驻守时是否愿意离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:entrainment-ability", function (access, actor, _argument) {
        return PokemonSkills.entrainmentAbility(access, actor);
    });

    function entrainmentWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (!pokemonFacts(context, self) || !pokemonFacts(context, target)) return false;
        const mine = fact<string>(context, "world_combat:entrainment-ability", self);
        const theirs = fact<string>(context, "world_combat:entrainment-ability", target);
        if (!mine || !PokemonSkills.entrainmentShareable(mine) || mine === theirs) return false;
        if (!theirs || !PokemonSkills.entrainmentReceivable(theirs)) return false;
        return PokemonSkills.entrainmentLiabilityAbility(mine) || PokemonSkills.entrainmentWorthOverwriting(theirs);
    }

    registerUse("entrainment", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return entrainmentWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            if (!entrainmentWants(context, item, target)) return 0;
            const mine = fact<string>(context, "world_combat:entrainment-ability", source(context));
            return mine && PokemonSkills.entrainmentLiabilityAbility(mine) ? 64 : 30;
        }
    });

    const entrainmentChase = PokemonSkills.number("ai.maxChase", "追击距离", 4, 28, 1);
    entrainmentChase.help = "威胁进入这个距离内才考虑找伙伴；越大越愿意隔着一段距离先踩，调小只在贴身时用。";
    const entrainmentStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    entrainmentStation.help = "开启后，驻守中的伙伴也会离位去改对手特性；关闭则只在原地够得到时出手。";
    const entrainmentWhole = PokemonSkills.flag("whole", "全场节拍");
    entrainmentWhole.help = "开启＝全场节拍：波及半径 ×1.6、维持 ×0.65、冷却 +16 刻，一次改掉围上来的整圈敌人；关闭＝贴身节拍：波及半径 ×0.7、维持 ×1.4、冷却 -10 刻，只盯一个对手、压得更久。覆盖范围与持续时长互相取舍。";

    PokemonSkills.addPreferences("entrainment", { whole: false, ai: { maxChase: 13, leaveStation: false } },
        [entrainmentWhole, entrainmentChase, entrainmentStation]);
}
