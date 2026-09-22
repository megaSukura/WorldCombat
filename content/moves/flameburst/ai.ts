/**
 * 烈焰溅射 / flameburst 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 16）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.cluster`（默认开）打开时，优先挑附近还站着别的对手的目标——火焰从爆点分出去，目标越挤越
 *   划算；关闭则只按普通远程招排序。`ai.finishLow`（默认关）打开时残血目标排前，用主爆收尾。
 * 够不到怎么办：reach 就是本招射程，不够先交给共享任务走入射程。
 * 放完之后：交回共享交战计划；主爆与溅射各自独立结算。
 */
namespace PokemonSkills {
    /** 目标身边（3.2 格内）是否还站着别的敌人：判定溅射能覆盖到几个人。 */
    function flameburstCrowded(context: WorldBehavior.Context, subject: CompanionBehavior.Entity): boolean {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || !(other.health > 0) || other.ref === subject.ref) continue;
            if (CompanionBehavior.distance(other.point, subject.point) <= 3.2) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(flameburstId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && flameburstCrowded(context, target)) score += 12;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", false) && CompanionBehavior.ratio(target) < 0.4) score += 8;
            return score;
        }
    });

    addPreferences(flameburstId, {}, [
        field(pathOf("spread"), "扇溅式", "boolean", {
            help: "开启：溅射半径 ×1.35、溅射威力 ×1.15、火滴更多更远，代价是爆裂威力 ×0.92、射程 −1.5 格。关闭（直爆式）：爆裂威力 ×1.08、射程 +1.5 格，代价是溅射半径 ×0.75、溅射威力 ×0.85。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 26, step: 1,
            help: "超过这个距离就不主动出手，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.cluster"), "优先扎堆", "boolean", {
            help: "开启：目标旁边还站着别的对手时优先出手，让火焰分出去烧到更多人；关闭：只按普通远程招排序。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用主爆收尾；关闭则只按普通远程攻击排序。"
        })
    ]);
}
