/**
 * 金属爆炸 / metalburst 的 AI 用途。
 *
 * 什么局面下出手：有可见的敌对威胁、且在 `ai.maxChase` 之内就列入候选——先靠近、逼对手出手。
 * 账本上有新鲜的伤害（`metalburstDebt > 0`）时若威胁就是账主，priority 抬到 65；否则 55；没有账时只给 5。
 * 目标身边还挤着其他敌人时再加 10——这正是范围爆破的适用局面。
 */
namespace PokemonSkills {
    CompanionBehavior.readFacts("world_combat:move_metalburst/ai-fact", function (frame, access) {
        const actor = access.source();
        const record = metalburstRecord(access, actor);
        frame.facts.metalburstDebt = record === null ? 0 : record.amount;
        frame.facts.metalburstDebtor = record === null ? "" : record.source;
    });

    CompanionBehavior.registerUse(metalburstId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!(context.facts.metalburstDebt > 0)) return 5;
            let score = context.facts.metalburstDebtor === target.ref ? 65 : 55;
            const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
            let crowd = 0;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
                if (CompanionBehavior.distance(target.point, other.point) <= 2.8) crowd++;
            }
            return crowd >= 1 ? score + 10 : score;
        }
    });

    addPreferences(metalburstId, {}, [
        field(pathOf("shrapnel"), "破片式", "boolean", {
            help: "开启：爆炸半径更大、周围敌人分摊得更多，但主目标那一份降到八成、起手多 2 刻、冷却多 8 刻。关闭：外炸得更小，把全部应力压在主目标身上。"
        }),
        field(pathOf("ai.maxChase"), "引爆距离", "number", {
            min: 2, max: 12, step: 1,
            help: "账主离自己这么远以内才追上去引爆；调大愿意为这笔账主动靠近。"
        })
    ]);
}
