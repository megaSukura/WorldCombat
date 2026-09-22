/**
 * 哈欠 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：挂在共享的 control / ranged 位上。这是一记**预埋**：目标要可见、敌对、还活着、身上没有
 *   任何主异常（有的话哈欠压不下去）、也没有正在撑着睡意，且与施法者通视。它不掷命中，所以伙伴愿意在
 *   战斗一开始就先把睡意埋下去，等它自己走完再动手。**距离不在这里拒绝**：超过 ai.maxChase 只是优先级
 *   下降，伙伴会先走近再打哈欠；只剩本招时它照样会放。
 * 对谁出手：当前威胁；`ai.mark` 开启时，隔着几格的威胁抬一档（越远越该预埋）。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒。
 * 放完之后：目标顶着几秒的睡意倒数，伙伴可以继续交战或把它逼在窗口里；走完就睡下。
 * 优先级：基础 50；生命高于七成（开局）时 +10；超出 ai.maxChase 时降到 16（`ai.mark` 开启则 34）。
 */
namespace PokemonSkills {
    /** 目标身上已经有任何一个主异常时，哈欠压不下去（原生 onTryHit 的规则）。 */
    function yawnAffected(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const names = ["sleep", "burn", "paralysis", "frozen", "poison", "toxic"];
        return names.some(function (name) { return CompanionBehavior.status(context, target, name); });
    }

    function yawnWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "yawn") || yawnAffected(context, target)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(yawnId, {
        protocols: ["world_combat:control", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : yawnWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !yawnWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const mark = CompanionBehavior.ai<boolean>(item, "mark", false);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return mark ? 34 : 16;
            let value = 50;
            if (CompanionBehavior.ratio(target) > 0.7) value += 10;
            if (mark && CompanionBehavior.distance(self.point, target.point) > 5) value += 8;
            return value;
        }
    });

    addPreferences(yawnId, { ai: { maxChase: 12, mark: false, leaveStation: true } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 18, step: 1,
            help: "威胁进入这个距离内才考虑打哈欠；越大越愿意隔远点先埋下去。"
        }),
        flag("ai.mark", "先埋远处的"),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
