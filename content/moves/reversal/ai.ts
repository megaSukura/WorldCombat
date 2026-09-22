/**
 * 起死回生 / reversal 的 AI 用途。
 *
 * 什么局面下出手：它是一记格斗系的范围反打，任何血量都能用；但威力与喷发半径都随自己已损失的生命上涨，
 * 所以 `priority` 在残血时抬得最高——当生命比例跌到 `ai.desperate`（默认五成半）以下，抬到 70 并随伤势继续加码，
 * 抢在别的输出前反打；健康时只作普通近战候选。目标可见、敌对、活着且在 `ai.maxChase` 之内。
 * 拼命式配置由玩家承担反噬风险，不影响这里的出手判断。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("reversal", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const ratio = CompanionBehavior.ratio(self);
            let value = 22;
            if (ratio <= CompanionBehavior.ai<number>(capability, "desperate", 0.55)) value = 70 + Math.round((1 - ratio) * 50);
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) value += 10;
            return value;
        }
    });

    addPreferences("reversal", {}, [
        field(pathOf("reckless"), "拼命式", "boolean", {
            help: "开启：威力再抬一截，但每次打中后自己按最大生命扣掉 8%，残血时可能因此倒下、也可能因此把下一记推到更高；关闭：没有反噬。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑上去，先走近。越大追击越执着。"
        }),
        field(pathOf("ai.desperate"), "背水阈值", "number", {
            min: 0, max: 1, step: 0.05,
            help: "自己生命比例不高于这个值时，把这招当作主力抢在别的输出前反打，并随伤势继续加码；调低则只在更危险时才优先用它。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成半时再抬一档优先级；关闭：只按普通近身候选参与排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为喷发离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
