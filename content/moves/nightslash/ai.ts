/**
 * 暗袭要害 / nightslash 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 6）格以内；更远交给共享接近逻辑。
 * 对谁出手：`ai.punishOpening`（默认开）打开时，正把攻击对着别人（空门）的目标优先——这一刀在那时最重；
 *   目标残血且 `ai.finishLow` 打开时再抬一档收尾。
 * 站位：它站定出手，由共享接近把身位收进出手距离。
 * 放完之后：交回共享交战计划；若目标仍露空门，冷却一过可以再来一刀。
 */
namespace PokemonSkills {
    function nightslashBusy(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const busy = (<any>target).attacking;
        if (typeof busy !== "string" || busy.length === 0) return false;
        return busy !== CompanionBehavior.source(context).ref;
    }

    CompanionBehavior.registerUse(nightslashId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability, purpose) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range + 1.2) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "punishOpening", true) && nightslashBusy(context, target)) score += 18;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", false) && CompanionBehavior.ratio(target) < 0.45) score += 12;
            return score;
        }
    });

    const nightslashChase = number("ai.maxChase", "出手距离", 2, 12, 1);
    nightslashChase.help = "超过这个距离不主动牵影线，先走近；越大越愿意从稍远处出刀。";
    const nightslashGate = flag("ai.punishOpening", "专等空门");
    nightslashGate.help = "开启：正把攻击对着别人的目标优先吃这一刀，那时威力更高；关闭：不读注意力，按普通近战排序。";
    const nightslashFinish = flag("ai.finishLow", "优先收尾");
    nightslashFinish.help = "开启：目标生命低于 45%% 时再抬一档优先收尾；关闭：不看血量。";

    addPreferences(nightslashId, { ambush: false, ai: { maxChase: 6, punishOpening: true, finishLow: false } },
        [nightslashChase, nightslashGate, nightslashFinish]);
}
