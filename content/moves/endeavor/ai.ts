/**
 * 蛮干 / endeavor 的 AI 用途。
 *
 * 什么局面下出手：只有当自己落后得够多、这一记真能拉平时才有意义——`ai.minGap`（默认一成二）要求
 * 「对手生命 − 自己生命」至少占对手最大生命的这个比例，否则出手只是扑一记空响（伤害为零）。
 * 目标须可见、敌对、活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 当这一记足以打空对手（生命差 ≥ 对手当前生命）时 priority 抬到 100，越过共享顺序先收；
 * 自己已经不到一半时抬到 45，其余按普通近身候选排。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("endeavor", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return false;
            const gap = target.health - self.health;
            const minimum = CompanionBehavior.ai<number>(capability, "minGap", 0.12) * Math.max(1, target.maximum);
            return gap >= minimum;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const gap = target.health - self.health;
            if (gap <= 0) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && gap >= target.health) return 100;
            return CompanionBehavior.ratio(self) < 0.5 ? 45 : 20;
        }
    });

    addPreferences("endeavor", {}, [
        field(pathOf("vault"), "越身式", "boolean", {
            help: "开启：扑得更远，撞实后从对手身侧穿过去换位，但几乎不顶开对手；关闭：扑得近，把对手顶开，收招与冷却更短。"
        }),
        field(pathOf("ai.minGap"), "最小生命差", "number", {
            min: 0, max: 0.5, step: 0.02,
            help: "只有当「对手生命 − 自己生命」达到对手最大生命的这个比例才主动扑上去；越大越只在落后明显时出手，避免扑出零伤害的空响。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：这一记足以打空对手时优先抢收；关闭：只按普通近身候选排序。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑身，先走近；越大追击越执着。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为扑身离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
