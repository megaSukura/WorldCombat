/**
 * Ｖ热焰 / vcreate 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.opener`（默认开）打开时，自身生命还在六成以上、且目标也还硬朗时抬优先——这是一记三降级的
 *   舍身撞击，趁自己还撑得住、趁目标还值得换的时候用；关闭则只按普通近身接触招排序。
 * 够不到怎么办：reach 就是本招射程，不够先交给共享任务走近；跑过头会把自己的机动性赔进去，别在追不上时用。
 * 放完之后：三段降级已经背上，交回共享交战计划，多半转入防守或走位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(vcreateId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range + 1.5) return 0;
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "opener", true)) {
                if (CompanionBehavior.ratio(self) > 0.6) score += 8;
                if (CompanionBehavior.ratio(target) > 0.6) score += 4;
            }
            return score;
        }
    });

    addPreferences(vcreateId, {}, [
        field(pathOf("nova"), "尽燃式", "boolean", {
            help: "开启：热焰威力 ×1.15、V 焰更盛，但自身速度额外再降一段、收招 +2 刻、冷却 +8 刻、冲程 ×0.95、冲速 ×0.94——赌上机动性的一次爆发。关闭（收焰式）：冲速 ×1.1、冲程 ×1.1、冷却 −8 刻，代价是热焰威力 ×0.95。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑出，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.opener"), "趁硬朗时开火", "boolean", {
            help: "开启：自身生命还在六成以上、且目标也还硬朗时优先出手，用三降级换一次最重的交换；关闭：只按普通近身接触招排序，不管双方血量。"
        })
    ]);
}
