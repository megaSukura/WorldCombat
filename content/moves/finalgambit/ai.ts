/**
 * 搏命 / finalgambit 的 AI 用途。
 *
 * 什么局面下出手：这是一张一换一的牌，不能随便花。默认 `ai.lethal`（开）要求自己当前生命不低于对手当前生命——
 * 这样这一记足以把对手打空，才值得把自己搭进去；关闭后放宽为「自己已经不到 `ai.cornered`（默认两成半）
 * 的残血，也要拖对手一起下水」。目标须可见、敌对、活着，且在 `ai.maxChase` 之内。
 * 满足条件时 priority 抬到 120，越过共享顺序抢在别的输出前出手；条件不满足则完全不参与候选。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("finalgambit", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "lethal", true)) return self.health >= target.health;
            return CompanionBehavior.ratio(self) <= CompanionBehavior.ai<number>(capability, "cornered", 0.25);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "lethal", true)) return self.health >= target.health ? 120 : 0;
            return CompanionBehavior.ratio(self) <= CompanionBehavior.ai<number>(capability, "cornered", 0.25) ? 120 : 0;
        }
    });

    addPreferences("finalgambit", {}, [
        field(pathOf("spare"), "留手式", "boolean", {
            help: "开启：只押上当前生命的一半，打完留下 1 点生命、不倒下，代价是伤害也随之减半、冷却更久；关闭：押上全部生命，伤害足额，打完自己陷入濒死。"
        }),
        field(pathOf("ai.lethal"), "只打必杀", "boolean", {
            help: "开启：只有自己当前生命不低于对手时才出手，保证这一换能把对手打空；关闭：放宽为残血（低于聚死阈值）时也愿意拖对手下水。"
        }),
        field(pathOf("ai.cornered"), "残血阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "关闭「只打必杀」时，自己生命低于这个比例才把搏命列进候选；越高越早拼命。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动扑上去自爆，先走近；它是贴身的拼命牌。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为自爆离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
