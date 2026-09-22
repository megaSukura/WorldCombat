/**
 * 迁怒 / frustration 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着，且在 `ai.maxChase` 之内。它是廉价、无副作用的贴身连抓，
 * 所以平时的 `priority` 只是普通近身候选；一旦亲密度低到 `ai.grudge` 以下（这招正因此变强），抬到 55 抢在别的输出前出手；
 * 目标残血且开启 `ai.finish` 时再抬一档，用连抓收尾。AI 读的是共享帧里的 `context.facts.friendship`。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("frustration", {
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
            const friendship = context.facts.friendship === undefined ? 255 : Number(context.facts.friendship);
            let value = friendship <= CompanionBehavior.ai<number>(capability, "grudge", 90) ? 55 : 20;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) value += 15;
            return value;
        }
    });

    addPreferences("frustration", {}, [
        field(pathOf("vent"), "发泄式", "boolean", {
            help: "开启：把连抓换成少而重的猛抓，单爪威力更高、起手与冷却更久；关闭：多而轻的快抓，出手密、更容易磨到人。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑上去，先走近。越大追击越执着。"
        }),
        field(pathOf("ai.grudge"), "积怨阈值", "number", {
            min: 0, max: 255, step: 5,
            help: "亲密度不高于这个值时，把这招当作主力抢在别的输出前出手（此时它的威力也最高）；调低则只有极度疏远的个体才会优先用它。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时再抬一档优先级，用连抓收尾；关闭：只按普通近身候选参与排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为连抓离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
