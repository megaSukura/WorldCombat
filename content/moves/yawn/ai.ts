/**
 * 哈欠 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：挂在共享的 control / ranged 位上。这是一记**预埋**：目标要可见、敌对、还活着、身上没有
 *   任何主异常（有的话哈欠压不下去）、也没有正在撑着睡意，且自己没被已知的睡眠免疫挡住。
 *   `ai.maxChase` 是硬门槛——超出这个距离就不再对这名目标考虑哈欠，不会先追近再放；驻守只通过共享站位的
 *   `leaveStation` 限制是否挪位，不在这里拒绝施放。它不掷命中，所以伙伴愿意在战斗一开始就先把睡意埋下去。
 * 对谁出手：当前威胁；`ai.mark` 开启时，隔了 5 格以上的威胁再抬一档（越远越该预埋）。
 * 放完之后：目标顶着几秒的睡意倒数，伙伴可以继续交战或把它逼在窗口里；走完就睡下。
 * 优先级：基础 50；目标生命高于七成（开局）时 +10；`ai.mark` 开启且距离超过 5 格时再 +8。
 */
namespace PokemonSkills {
    /** 目标身上已经有任何一个主异常时，哈欠压不下去（原生 onTryHit 的规则）。 */
    function yawnAffected(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const names = ["sleep", "burn", "paralysis", "frozen", "poison", "toxic"];
        return names.some(function (name) { return CompanionBehavior.status(context, target, name); });
    }

    /** 已知的睡眠免疫（特性/type policy）就先别埋：这一步走了共享门禁，免疫来源变化后自然跟随。 */
    function yawnSleepImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        return actor !== null && !CombatStatus.allowed(world, actor, "sleep", 100, 0).allowed;
    }

    function yawnWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "yawn") || yawnAffected(context, target)) return false;
        if (yawnSleepImmune(context, target)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
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
            let value = 50;
            if (CompanionBehavior.ratio(target) > 0.7) value += 10;
            if (mark && CompanionBehavior.distance(self.point, target.point) > 5) value += 8;
            return value;
        }
    });

    addPreferences(yawnId, { ai: { maxChase: 12, mark: false, leaveStation: true } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 18, step: 1,
            help: "只对这个距离以内的威胁考虑哈欠；超出就不再出手（不会先追近），调大从更远处先埋。"
        }),
        flag("ai.mark", "先埋远处的"),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
