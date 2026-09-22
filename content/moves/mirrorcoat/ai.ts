/**
 * 镜面反射 / mirrorcoat 的 AI 用途。
 *
 * 什么局面下出手：有可见的敌对威胁、且在 `ai.maxChase` 之内就列入候选——先迎上去立镜、逼对手出手。
 * 账本上有新鲜的特殊伤害（`mirrorcoatDebt > 0`）时若账主在射程内，priority 抬到 70；其他敌人 50，
 * 没有账时只给 5。它能在远处兑现，所以 `ai.maxChase` 通常比近战大。
 */
namespace PokemonSkills {
    CompanionBehavior.readFacts("world_combat:move_mirrorcoat/ai-fact", function (frame, access) {
        const actor = access.source();
        const record = mirrorcoatRecord(access, actor);
        frame.facts.mirrorcoatDebt = record === null ? 0 : record.amount;
        frame.facts.mirrorcoatDebtor = record === null ? "" : record.source;
    });

    CompanionBehavior.registerUse(mirrorcoatId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
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
            if (!(context.facts.mirrorcoatDebt > 0)) return 5;
            return context.facts.mirrorcoatDebtor === target.ref ? 70 : 50;
        }
    });

    addPreferences(mirrorcoatId, {}, [
        field(pathOf("polish"), "抛光镜面", "boolean", {
            help: "开启：记账窗口多 1.2 秒、返还上限比例加 8%，镜面记得更久、映回更多，但起手多 3 刻、冷却多 8 刻。关闭：收镜更快、只认眼前的账。"
        }),
        field(pathOf("ai.maxChase"), "反射距离", "number", {
            min: 2, max: 18, step: 1,
            help: "账主离自己这么远以内才把账射回去；调大愿意在更远处先手兑现。"
        })
    ]);
}
