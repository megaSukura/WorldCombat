/**
 * 空手劈 / karatechop 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 5）格以内——它够得极近，由共享接近把身位收进劈距。
 * 对谁出手：`ai.punish`（默认开）打开时，正被睡眠／冰冻／麻痹压住的目标优先——这是手刀找缝的读法；
 *   目标已在劈距内时也加价（已经贴脸就顺手劈）。
 * 优先级：目标残血且 `ai.finishLow` 打开时再抬一档收尾。
 * 放完之后：交回共享顺序；它冷却极短，是贴身连打里的常用一记。
 */
namespace PokemonSkills {
    /** 目标是否正被无法行动一类状态压住（睡／冻／麻）。 */
    function karatechopOpen(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.status(context, target, "sleep")
            || CompanionBehavior.status(context, target, "frozen")
            || CompanionBehavior.status(context, target, "paralysis");
    }

    CompanionBehavior.registerUse(karatechopId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability, purpose) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 18;
            if (distance <= capability.data.range + 0.4) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "punish", true) && karatechopOpen(context, target)) score += 16;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", false) && CompanionBehavior.ratio(target) < 0.35) score += 12;
            return score;
        }
    });

    const karatechopChase = number("ai.maxChase", "出手距离", 1, 10, 1);
    karatechopChase.help = "超过这个距离不主动劈，先走近；它是一记贴身招，不宜调得太大。";
    const karatechopPunish = flag("ai.punish", "打击破绽");
    karatechopPunish.help = "开启：正被睡眠、冰冻或麻痹压住的目标优先吃这一记手刀；关闭：不看状态，按普通近战排序。";
    const karatechopFinish = flag("ai.finishLow", "优先收尾");
    karatechopFinish.help = "开启：目标生命低于 35%% 时抬高这一记的优先级；关闭：不看血量。";

    addPreferences(karatechopId, { knife: false, ai: { maxChase: 5, punish: true, finishLow: false } },
        [karatechopChase, karatechopPunish, karatechopFinish]);
}
