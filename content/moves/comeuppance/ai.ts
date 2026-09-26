/**
 * 复仇 / comeuppance 的 AI 用途。
 *
 * 什么局面下出手：只有账本上有新鲜的伤害（`comeuppanceDebt > 0`）时才可选——不花 PP 空追。
 * 账主在射程内时 priority 70，其他敌人 50。暗影会追人，所以它不是非贴身不可；手动施放不受此限。
 */
namespace PokemonSkills {
    CompanionBehavior.readFacts("world_combat:move_comeuppance/ai-fact", function (frame, access) {
        const actor = access.source();
        const record = comeuppanceRecord(access, actor);
        frame.facts.comeuppanceDebt = record === null ? 0 : record.amount;
        frame.facts.comeuppanceDebtor = record === null ? "" : record.source;
    });

    CompanionBehavior.registerUse(comeuppanceId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!(context.facts.comeuppanceDebt > 0)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            return context.facts.comeuppanceDebtor === target.ref ? 70 : 50;
        }
    });

    addPreferences(comeuppanceId, {}, [
        field(pathOf("grudge"), "记仇式", "boolean", {
            help: "开启：记账窗口多 2 秒、追讨延迟多 0.5 秒，暗影更沉得住气、能从更久以前的那笔仇出发，但起手多 2 刻、冷却多 8 刻。关闭：更快追讨、只认眼前的账。"
        }),
        field(pathOf("ai.maxChase"), "追讨距离", "number", {
            min: 2, max: 18, step: 1,
            help: "账主离自己这么远以内才放出暗影；调大愿意在更远处先手追债。"
        })
    ]);
}
