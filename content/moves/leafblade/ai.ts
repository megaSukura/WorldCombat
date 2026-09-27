/**
 * 叶刃 / leafblade 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在自己 `ai.maxChase`（默认 4）格以内；更远交给共享接近逻辑。
 *   到了刃长（`capability.data.range`）之内才挥——叶刃是站定一笔横斜切的单体接触斩，位置即代价。它只结算
 *   刀锋首个碰到的敌人，所以选的是「站到能切到主敌的位」而不是「挤进人堆连旁伤」；`ai.finishLow`（默认开）
 *   在对手血量偏低时抬优先级，一刀收掉或至少压出错口。它不依赖瞬间自动贴到目标中心。
 * 放完之后：主目标已被切开，交回共享顺序决定是继续贴身还是走位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(leafbladeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            const reach = Number(capability.data.range) || 0;
            // 够不着就先交给共享接近逻辑，不隔空排序。
            if (reach <= 0 || distance > reach) return 0;
            const ratio = CompanionBehavior.ratio(target);
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && ratio <= 0.4) return 42;
            // 刃程的靠外一段最容易被这一笔扫到；贴得太近就落在刀根之下。
            return distance >= reach * 0.55 ? 32 : 24;
        }
    });

    addPreferences(leafbladeId, {}, [
        field(pathOf("twohand"), "双手式", "boolean", {
            help: "开启：刃锋威力 ×1.2、挥斩张角 ×1.1，但起手 +3 刻、收招 +2 刻、冷却 +6 刻，适合一击定胜负。关闭（单手式，默认）：起手更快、冷却少 4 刻，但威力 ×0.95、张角略窄，适合贴身连挥。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 10, step: 1,
            help: "超过这个距离就不主动出手，先贴近；叶刃必须自己站到刃长之内，数值比远程招小。"
        }),
        field(pathOf("ai.finishLow"), "收残血", "boolean", {
            help: "开启：对手血量低于四成时优先挥出这一记快斩，尝试收掉或压低；关闭：不看血量，按普通近战重击排序。"
        })
    ]);
}
