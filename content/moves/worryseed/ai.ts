/** worryseed：行为、参数与目标条件以本单元实现为准。 */
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
