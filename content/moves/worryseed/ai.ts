/** worryseed：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    registerFact("world_combat:worryseed-ability", function (access, actor, _argument) {
        return PokemonSkills.worryseedAbility(access, actor);
    });

    /** 这颗种子对敌人是否有意义：特性读得出、可被顶掉、还没被种过，且有通视线。 */
    function worryseedEnemyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (status(context, target, "worryseed")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (domain(context, target) !== "cobblemon") return false;
        const ability = fact<string>(context, "world_combat:worryseed-ability", target);
        return ability !== null && PokemonSkills.worryseedPlantable(ability);
    }

    /** 支援一个伙伴：只在它正睡着或已挂上睡意（临近催眠）时才值得出手。 */
    function worryseedFriendWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (!item.data.config || item.data.config.helpFriends === false) return false;
        if (target.health <= 0 || !target.friendly || !target.visible) return false;
        if (target.ref === source(context).ref) return false;
        if (status(context, target, "worryseed")) return false;
        if (!(status(context, target, "sleep") || status(context, target, "yawn"))) return false;
        const self = source(context);
        if (distance(self.point, target.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (domain(context, target) === "cobblemon") {
            const ability = fact<string>(context, "world_combat:worryseed-ability", target);
            if (ability === null || !PokemonSkills.worryseedPlantable(ability)) return false;
        }
        return true;
    }

    function worryseedWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        return target.friendly ? worryseedFriendWants(context, item, target) : worryseedEnemyWants(context, item, target);
    }

    registerUse("worryseed", {
        protocols: ["world_combat:control", "world_combat:heal"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return worryseedWants(context, item, target);
        },
        accepts: function (context, item, target) { return target.health > 0 && target.visible && worryseedWants(context, item, target); },
        priority: function (context, item, target) {
            if (target === null) return 0;
            if (!worryseedWants(context, item, target)) return 0;
            if (target.friendly) return status(context, target, "sleep") ? 82 : 60;
            return 55;
        }
    });

    const worryseedChase = PokemonSkills.number("ai.maxChase", "追击距离", 4, 28, 1);
    worryseedChase.help = "威胁进入这个距离内才考虑投种；越大越愿意隔着一段距离先种，调小只在贴身时用。";
    const worryseedStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    worryseedStation.help = "开启后，驻守中的伙伴也会离位去种对手；关闭则只在原地够得到时出手。";
    const worryseedDeep = PokemonSkills.flag("deep", "深植");
    worryseedDeep.help = "开启＝深植：烦恼时长 ×1.7、冷却 +20 刻，一口封死对手；关闭＝浅植：烦恼时长 ×0.6、冷却 -12 刻，适合频繁骚扰。时长与出手频率互相取舍。";
    const worryseedHelp = PokemonSkills.flag("helpFriends", "支援伙伴");
    worryseedHelp.help = "开启＝伙伴睡着或已经被挂上睡意时，会主动投种把它叫醒并挡住催眠；关闭则只顾对手，不再花一颗种子救伙伴。";

    PokemonSkills.addPreferences("worryseed", { deep: false, helpFriends: true, ai: { maxChase: 13, leaveStation: false } },
        [worryseedDeep, worryseedHelp, worryseedChase, worryseedStation]);
}
