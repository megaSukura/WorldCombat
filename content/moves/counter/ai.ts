/**
 * 双倍奉还 / counter 的 AI 用途。
 *
 * 什么局面下出手：有可见的敌对威胁、且在 `ai.maxChase` 之内就列入候选——被打中之前它先迎上去站定，
 * 逼对手出手（否则双方会各自走开）。账本上有新鲜的物理伤害（`counterDebt > 0`）时 priority 抬到 50，
 * 账主就是面前的目标时 70；没有账时只给 5，排在其他选择后面，但仍能应战。
 * 够不到交给共享接近逻辑。`ai.maxChase` 决定愿意追多远。
 */
namespace PokemonSkills {
    CompanionBehavior.readFacts("world_combat:move_counter/ai-fact", function (frame, access) {
        const actor = access.source();
        const record = counterRecord(access, actor);
        frame.facts.counterDebt = record === null ? 0 : record.amount;
        frame.facts.counterDebtor = record === null ? "" : record.source;
    });

    CompanionBehavior.registerUse(counterId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
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
            if (!(context.facts.counterDebt > 0)) return 5;
            return context.facts.counterDebtor === target.ref ? 70 : 50;
        }
    });

    addPreferences(counterId, {}, [
        field(pathOf("deepbreath"), "沉势以待", "boolean", {
            help: "开启：记账窗口多 1 秒、返还上限比例更高，愿意等来更重的一笔，但起手多 3 刻、冷却多 6 刻。关闭：反应更快、只认眼前的账。"
        }),
        field(pathOf("ai.maxChase"), "追账距离", "number", {
            min: 2, max: 14, step: 1,
            help: "账主离自己这么远以内才迎上去讨这笔账；调大愿意为债务主动靠近。"
        })
    ]);
}
