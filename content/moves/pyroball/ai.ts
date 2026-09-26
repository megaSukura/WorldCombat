/**
 * 火焰球 / pyroball 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 20）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.finishLow`（默认开）打开时，残血目标排前，用这一记高威力火球收尾；有低弧视线可达的目标
 *   更靠前，被墙挡住的排后——瞄准是自由点射，不要求提交瞬间存在敌人，但一击要打得进去；
 *   已经带着共享灼伤身份的目标排后（再点一次意义不大）。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：它是一记高威力单体点射，不负责收尾之外的事，交回共享交战计划。
 */
namespace PokemonSkills {
    function pyroballWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
    }

    /** 低弧射线是否可达：目标与自身之间没有实心方块挡住这一脚。 */
    function pyroballReachable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.source(context);
        return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse("pyroball", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return pyroballWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !pyroballWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 12;
            // 有低弧视线才值得踢；被地形挡住的直点排在后面。
            if (pyroballReachable(context, target)) score += 6; else score -= 6;
            if (CompanionBehavior.status(context, target, "burn")) score -= 6;
            return score;
        }
    });

    addPreferences("pyroball", {}, [
        field(pathOf("savage"), "蛮踢式", "boolean", {
            help: "开启：威力 ×1.1、灼伤概率 +4%%、焦土更大，但出膛散布 +6 度（更难踢正）、射程 −1.5 格、起手与冷却更久。关闭（精准抽射）：踢得更直更远更快，代价是威力与引燃都略低。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 28, step: 1,
            help: "超过这个距离就不主动踢球，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用这记高威力火球收尾；关闭则只按普通远程攻击排序。"
        })
    ]);
}
