/**
 * 以牙还牙 / payback 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.punish`（默认开）打开时，目标刚打过自己、或正朝自己出手的那一刻 priority 抬到 55——
 *   这正是翻倍窗口，值得插在普通攻击前面；空闲时它按普通近战 14 排序。
 * 放完接什么：交回共享交战计划；它是一记迎击，不负责追击。
 */
namespace PokemonSkills {
    function paybackPunishable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (typeof self.hurtAgo === "number" && self.hurtAgo <= 60
            && typeof self.lastAttacker === "string" && self.lastAttacker === target.ref) return true;
        return typeof target.attacking === "string" && target.attacking === self.ref;
    }

    CompanionBehavior.registerUse(paybackId, {
        protocols: ["world_combat:attack"],
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
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "punish", true) && paybackPunishable(context, target)) return 55;
            return 14;
        }
    });

    addPreferences(paybackId, {}, [
        field(pathOf("patient"), "蓄势以待", "boolean", {
            help: "开启：反算窗口多 0.8 秒、郁结系数 40→55，带伤时这一记更重，但起手多 3 刻、冷却多 6 刻。关闭：反应更快、窗口更短，只在对手贴脸出手时翻倍。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "威胁离自己这么远以内才迎上去回击；调大愿意主动靠近被惩罚的对象。"
        }),
        field(pathOf("ai.punish"), "惩罚先手", "boolean", {
            help: "开启后，刚打过自己或正朝自己出手的目标会被优先回击（正是翻倍窗口）；关闭则按普通近战排序。"
        })
    ]);
}
