/**
 * 祸不单行 / hex 的 AI 用途。
 *
 * 什么局面下出手：远程诅咒，对手可见、敌对、活着且在 `ai.maxChase`（默认 11）之内即可；够不到交给共享接近逻辑。
 * 对谁出手：这一招吃目标的异常，所以只要目标带着任意主异常（灼伤／麻痹／中毒／剧毒／冰冻／睡眠），
 *   priority 抬到 52 ——它乐于先让别的招或队友把异常点上，再用诅咒成片收；没有异常时压到 15。
 *   目标身边还挤着别的敌人时再抬一档（聚群）：固定结界更容易一次罩住多人。AI 只是把敌人推荐给共享交战计划，
 *   落点由起手锁定的瞄点决定——预判对手将停留的位置，而不是追着它必中。
 * 放完接什么：交回共享交战计划；结界已落在地上，接下来交给别的招。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(hexId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
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
            // 聚群：目标身边还挤着别的敌人时，固定结界更可能一次罩住多人。
            const nearby = (context.facts.nearby || []) as WorldMethods.Subject[];
            let crowd = 0;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= capability.data.range * 0.5) crowd++;
            }
            if (CompanionBehavior.ai<boolean>(capability, "blighted", true) && hexBlighted(context, target)) return crowd > 0 ? 60 : 52;
            return crowd > 0 ? 24 : 15;
        }
    });

    /** 目标此刻是否带着任意主异常；读共享身份，别的单元施加的也算。 */
    function hexBlighted(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.status(context, target, "burn") || CompanionBehavior.status(context, target, "paralysis")
            || CompanionBehavior.status(context, target, "poison") || CompanionBehavior.status(context, target, "frozen")
            || CompanionBehavior.status(context, target, "sleep");
    }

    addPreferences(hexId, {}, [
        field(pathOf("chain"), "连环", "boolean", {
            help: "开启：结界半径 ×1.35、能圈住更多人，但单发 ×0.85、冷却多 3 刻。关闭：圈更紧、单发 ×1.08。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动布咒，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.blighted"), "对带异常者优先", "boolean", {
            help: "开启：带异常的目标获得额外优先级；关闭：保持普通低优先级，不按目标异常加权。"
        })
    ]);
}
