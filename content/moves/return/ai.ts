/**
 * 报恩 / return 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着，且在 `ai.maxChase` 之内。这是一记无副作用的近身重击；
 * 当亲密度不低于 `ai.bond`（羁绊阈值，默认 150）时，它的威力正处在高位，`priority` 抬到 50 作为主力近战；
 * 羁绊不足时只作普通近身候选。目标残血且开启 `ai.finish` 时再抬一档收尾。AI 读共享帧里的 `context.facts.friendship`。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("return", {
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
            const friendship = context.facts.friendship === undefined ? 0 : Number(context.facts.friendship);
            let value = friendship >= CompanionBehavior.ai<number>(capability, "bond", 150) ? 50 : 20;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) value += 15;
            return value;
        }
    });

    addPreferences("return", {}, [
        field(pathOf("devoted"), "受托式", "boolean", {
            help: "开启：誓约压得更重、冲得更远，撞实后顺势越过对手换位，代价是起手、收招与冷却更久；关闭：一记更短更快的重击，撞实即停。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动冲上去，先走近。越大追击越执着。"
        }),
        field(pathOf("ai.bond"), "羁绊阈值", "number", {
            min: 0, max: 255, step: 5,
            help: "亲密度不低于这个值时，把这招当作主力近战抢在别的输出前出手（此时它的威力也最高）；调高则只有羁绊深厚的个体才会优先用它。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成半时再抬一档优先级，用这一记收尾；关闭：只按普通近身候选参与排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为冲撞离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
