/**
 * 热水 / scald 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 14）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.soakWet`（默认开）打开时优先已经湿身的目标——沸水浇上去更狠（命中 ×1.18）；
 *   `ai.soakCrowd`（默认开）打开时优先身边挤着别的敌人的目标，落地那摊水洼能连带封住他们；
 *   已经带着共享灼伤身份的目标排后（再点一次意义不大）；目标被冻住时略降——沸水会把它解冻，等于帮了它。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：一记带落点水洼的远程点射，交回共享交战计划。
 */
namespace PokemonSkills {
    function scaldWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    function scaldCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("scald", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return scaldWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !scaldWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 15;
            if (!CompanionBehavior.status(context, target, "burn")) score += 6;
            if (CompanionBehavior.status(context, target, "frozen")) score -= 8;
            if (CompanionBehavior.ai<boolean>(capability, "soakWet", true) && target.wet) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "soakCrowd", true))
                score += Math.min(16, scaldCrowd(context, target) * 8);
            return score;
        }
    });

    addPreferences("scald", {}, [
        field(pathOf("simmer"), "久沸式", "boolean", {
            help: "开启：水洼更大、留存更久、踏入更易被烫，但直击威力 ×0.9、冷却 +10 刻，用来封住一片地。关闭（急沸式）：直击 ×1.06、冷却 −2，水洼小而短，用来点杀。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 22, step: 1,
            help: "超过这个距离就不主动抛沸水，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.soakWet"), "优先浇湿身目标", "boolean", {
            help: "开启：已经湿身的目标排前，沸水浇上去多算 18% 伤害；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.soakCrowd"), "优先扎堆目标", "boolean", {
            help: "开启：身边挤着别的敌人的目标排前，落地那摊水洼能连带封住他们；关闭则只按普通远程攻击排序。"
        })
    ]);
}
