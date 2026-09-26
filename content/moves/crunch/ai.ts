/**
 * 咬碎 / crunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。
 * `ai.openGuard`（默认开）实际改变候选排序：开启时优先咬**还没带破防身份**的目标——咬碎是「开缺口」的招，
 * 对已经带缺口的目标再咬收益低，排在后面；关闭时把它当普通近身重咬排序。
 * `ai.hardShell`（默认开）把高防御与大体型目标往前排——獠牙专门啃硬壳；没有六维数据的原版生物退化为按体型估算。
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
            const openGuard = CompanionBehavior.ai<boolean>(capability, "openGuard", true);
            let value = openGuard && CompanionBehavior.status(context, target, "guardbroken") ? 14 : 30;
            if (!CompanionBehavior.ai<boolean>(capability, "hardShell", true)) return value;
            // 高防御的硬壳最值得磨；没有六维的原版生物按体型（宽×高）粗略代替。
            const stats = CompanionBehavior.combatStats(context, target);
            const def: any = stats && stats.stats ? stats.stats.def : null;
            if (typeof def === "number" && isFinite(def)) value += Math.max(0, Math.min(16, (def - 70) * 0.12));
            const size = (target.width || 0.9) * (target.height || 1.4);
            return value + Math.max(0, Math.min(10, (size - 1.2) * 6));
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
        }),
        field(pathOf("ai.hardShell"), "先咬硬壳", "boolean", {
            help: "开启：防御越高、体型越大的目标优先，让专门啃硬壳的獠牙先开缺口；关闭：所有近身目标按普通重咬排序。"
        })
    ]);
}
