/**
 * 烦恼种子 / worryseed — 伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内、有一条通视直线，而且它是宝可梦、
 *   特性读得出来、可以被顶掉（不是不眠、不带 cantsuppress）。它还没有被种过。
 * 对谁出手：当前威胁；已经被种子种过、特性不可压制或已经是不眠的目标跳过，不重复投。
 * 候选之间怎么排：priority 55，排在普通控制之前——先把对手的特性换成不眠，顺手封掉它的睡眠打法。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近到能通视的射程再投。
 * 放完之后：对手的特性变成不眠一段时间，交回共享交战计划；标记与特性层同时到期。
 * 不眠本身由本单元 rules.ts 挂在共享 CombatStatus 门上，对任何来源的不眠生效。
 * ai.maxChase 决定追多远；ai.leaveStation 决定驻守时是否愿意离位。
 */
namespace CompanionBehavior {
    registerFact("world_combat:worryseed-ability", function (access, actor, _argument) {
        return PokemonSkills.worryseedAbility(access, actor);
    });

    function worryseedWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (status(context, target, "worryseed")) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (domain(context, target) !== "cobblemon") return false;
        const ability = fact<string>(context, "world_combat:worryseed-ability", target);
        return ability !== null && PokemonSkills.worryseedPlantable(ability);
    }

    registerUse("worryseed", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return worryseedWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            return worryseedWants(context, item, target) ? 55 : 0;
        }
    });

    const worryseedChase = PokemonSkills.number("ai.maxChase", "追击距离", 4, 28, 1);
    worryseedChase.help = "威胁进入这个距离内才考虑投种；越大越愿意隔着一段距离先种，调小只在贴身时用。";
    const worryseedStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    worryseedStation.help = "开启后，驻守中的伙伴也会离位去种对手；关闭则只在原地够得到时出手。";
    const worryseedDeep = PokemonSkills.flag("deep", "深植");
    worryseedDeep.help = "开启＝深植：烦恼时长 ×1.7、冷却 +20 刻，一口封死对手；关闭＝浅植：烦恼时长 ×0.6、冷却 -12 刻，适合频繁骚扰。时长与出手频率互相取舍。";

    PokemonSkills.addPreferences("worryseed", { deep: false, ai: { maxChase: 13, leaveStation: false } },
        [worryseedDeep, worryseedChase, worryseedStation]);
}
