/**
 * 咬碎 / crunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。
 * `ai.openGuard`（默认开）实际改变候选排序：开启时优先咬**还没带破防身份**的目标——咬碎是「开缺口」的招，
 * 对已经带缺口的目标再咬收益低，排在后面；关闭时把它当普通近身重咬排序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("crunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "openGuard", true)) return 20;
            return CompanionBehavior.status(context, target, "guardbroken") ? 14 : 30;
        }
    });

    addPreferences("crunch", {}, [
        field(pathOf("crush"), "碾压式", "boolean", {
            help: "开启：磨得更久、咬塌几率更高、破防缺口留得更久，但咬合威力略低、起手与冷却更长；关闭：疾咬式，出手快、单口更高，但更难咬塌护甲。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。越大追得越执着，也越容易扑空后停在对手身边。"
        }),
        field(pathOf("ai.openGuard"), "优先开缺口", "boolean", {
            help: "开启：优先咬还没有破防身份的目标，把缺口留给后续招吃；关闭：把咬碎当普通近身重咬排序。"
        })
    ]);
}
