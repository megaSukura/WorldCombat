/**
 * 报复 / revenge 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且与自己的距离在 `ai.maxChase`（默认 4，近身还手）以内才列入候选；
 *   够不到交给共享接近逻辑。它是一记站定还肘，不为回肘去远追射手。
 * 对谁出手：`ai.avenge`（默认开）且施法者最近被某个对手打过时，`selectTarget` 把目标换成那名打人者——
 *   但只有那名打人者仍在近处才换（正好是翻倍的窗口）；否则照原目标走。
 * 排序：刚被当前目标本人打过时 priority 抬到 54；否则按普通近战 15 排序。
 * 放完接什么：交回共享交战计划；它是一记站定还肘，不负责追击。
 */
namespace PokemonSkills {
    function revengeProvoked(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return typeof self.hurtAgo === "number" && self.hurtAgo <= 60
            && typeof self.lastAttacker === "string" && self.lastAttacker === target.ref;
    }

    CompanionBehavior.registerUse(revengeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        selectTarget: function (context, capability, proposed) {
            if (!CompanionBehavior.ai<boolean>(capability, "avenge", true)) return proposed;
            const self = CompanionBehavior.source(context);
            if (typeof self.hurtAgo !== "number" || self.hurtAgo > 60 || typeof self.lastAttacker !== "string") return proposed;
            const attacker = CompanionBehavior.entity(context, self.lastAttacker);
            if (attacker === null || attacker.health <= 0 || attacker.friendly) return proposed;
            // 只在打人者仍近身时换目标：不为回肘远追射手。
            if (CompanionBehavior.distance(self.point, attacker.point) > CompanionBehavior.ai<number>(capability, "maxChase", 4) + 1) return proposed;
            return attacker;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (revengeProvoked(context, target)) return 54;
            return 15;
        }
    });

    addPreferences(revengeId, {}, [
        field(pathOf("endure"), "硬扛", "boolean", {
            help: "开启：记仇窗口多 0.8 秒、顶开 ×1.20，站住等对手先动手；但本击 ×0.92、起手多 2 刻、冷却多 6 刻。关闭：本击 ×1.06，出肘更快。"
        }),
        field(pathOf("ai.maxChase"), "还手距离", "number", {
            min: 2, max: 8, step: 1,
            help: "威胁离自己这么远以内才站定还肘；调大愿意主动靠近刚打过自己的对手，调小只在贴身时还手。"
        }),
        field(pathOf("ai.avenge"), "追打打人者", "boolean", {
            help: "开启后，最近打过自己的对手只要仍在近处就会被选为目标（正是翻倍窗口）；关闭则照当前目标出手。"
        })
    ]);
}
