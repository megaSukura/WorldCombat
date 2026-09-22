/**
 * 喋喋不休 / chatter 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 11）之内；更远交给共享接近逻辑。
 * 对谁出手：中近距离的一道扇面。`ai.avoidConfused`（默认开）打开时，已经带着混乱身份的目标降优先级——
 *   必乱的一串叫在没乱的人身上最值；关闭时按普通中近程攻击排序，只按距离看。
 * 够不到怎么办：声程交给 `reach`，共享任务把身位收进扇面之后再叫。
 * 放完接什么：交回共享交战计划；被叫到的人带着混乱身份，之后出手与命中由本单元的混乱行为接管。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(chatterId, {
        protocols: ["world_combat:attack", "world_combat:ranged", "world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const confused = CompanionBehavior.status(context, target, "confusion");
            if (confused) return CompanionBehavior.ai<boolean>(capability, "avoidConfused", true) ? 8 : 22;
            return 26;
        }
    });

    addPreferences(chatterId, {}, [
        field(pathOf("shrill"), "尖啸", "boolean", {
            help: "开启：声程 +2 格、混乱 ×1.25，但单声威力 ×0.92、起手多 2 刻、冷却多 4 刻，适合远距压制；关闭：更近更狠的一串，适合贴脸打断。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动叫，先走近；越大越愿意在更远处先手出声。"
        }),
        field(pathOf("ai.avoidConfused"), "留给没乱的", "boolean", {
            help: "开启：已经带着混乱身份的目标降优先级，把必乱的一串留给还清醒的人；关闭：按普通中近程攻击排序。"
        })
    ]);
}
