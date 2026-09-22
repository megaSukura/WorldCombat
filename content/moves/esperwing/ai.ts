/**
 * 气场之翼 / esperwing 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 6）格以内；身上还有气翼余韵时不出手，
 *   等余韵走完（余韵本身就是提速窗口，重复振翅浪费 PP）。
 * 对谁出手：`ai.boostFirst`（默认开）打开时，自己还没提速、又有威胁在近处，就把这一记当「攻击 + 垫速」
 *   一起打出去，优先级抬高；关掉后只按普通近战排序。
 * 放完之后：速度等级已写进公共能力阶梯，余韵期间不再重复振翅，把 PP 留给别的事。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(esperwingId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability, purpose) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "esperwing")) return false;
            if (CompanionBehavior.recent(context, "move", esperwingId, 200)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(self.point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range + 0.8) return 0;
            const boosting = CompanionBehavior.ai<boolean>(capability, "boostFirst", true);
            return boosting ? 88 : 26;
        }
    });

    const esperwingChase = number("ai.maxChase", "出手距离", 2, 12, 1);
    esperwingChase.help = "超过这个距离不主动振翅，先走近；越大越愿意从稍远处扫出去并顺手提速。";
    const esperwingFirst = flag("ai.boostFirst", "先手垫速");
    esperwingFirst.help = "开启：自己还没提速时把这一记当攻击加垫速来用，优先级抬到共享交战之前；关闭：只当普通近战排序。";

    addPreferences(esperwingId, { flap: false, ai: { maxChase: 6, boostFirst: true } },
        [esperwingChase, esperwingFirst]);
}
