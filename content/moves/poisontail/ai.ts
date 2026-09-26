/**
 * 毒尾 / poisontail 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）之内；更远交给共享接近逻辑。
 * 对谁出手：`ai.seekUnpoisoned`（默认开）打开时，还没中毒的目标排得更前——尾梢的毒抹在没中毒的人身上才有意义；
 *   圈里人越多排得越前；圈内敌人少于 `ai.minFoes`（默认 1）时降低优先级，仍保留普通攻击用途。
 *   毒免疫的目标只是抹不上毒，原扫击伤害照吃，所以它们仍是合格的选择。
 * 够不到怎么办：扫击半径交给 `reach`，共享任务把身位收进尾长范围再扫。
 * 放完之后：被扫到的人吃一记并可能带毒，交回共享交战计划；这是对多目标的一次清场，循环冷却短。
 */
namespace PokemonSkills {
    function poisontailClose(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    /** 扫击半径（含一点容差）内挤着几个敌人（含正对目标）。 */
    function poisontailCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), reach = capability.data.range + 0.6;
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= reach) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("poisontail", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return poisontailClose(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !poisontailClose(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const crowd = poisontailCrowd(context, capability);
            let score = 26;
            if (crowd >= CompanionBehavior.ai<number>(capability, "minFoes", 1)) score += Math.min(16, crowd * 5);
            else score -= 18;
            if (CompanionBehavior.ai<boolean>(capability, "seekUnpoisoned", true) && !CompanionBehavior.status(context, target, "poison")) score += 8;
            return Math.max(1, score);
        }
    });

    addPreferences("poisontail", {}, [
        field(pathOf("venom"), "毒尾式", "boolean", {
            help: "开启：中毒概率 ×1.25、中毒时长 ×1.15、毒滴更多，但扫击威力 ×0.9、弧面收窄——以抹毒为主。关闭（扫尾式）：扫得更宽更重，但毒更难抹上。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动甩尾，先走近；扫击半径很短，设大也常常够不到。"
        }),
        field(pathOf("ai.minFoes"), "优先人数", "number", {
            min: 1, max: 4, step: 1,
            help: "扫击范围内的敌人达到这个数时提高毒尾优先级；人数不足时降低优先级，仍可作为普通攻击。"
        }),
        field(pathOf("ai.seekUnpoisoned"), "优先扫没中毒的", "boolean", {
            help: "开启：还没中毒的目标排得更前，让尾梢的毒抹在没中毒的人身上；关闭则所有目标同价。"
        })
    ]);
}
