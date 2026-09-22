/**
 * 火焰拳 / firepunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferUnlit`（默认开）打开时，还没烧起来的目标排得更前（再点一个已经着了的人收益小）；
 *   目标身边还挤着别人时再抬一档——火能蔓延过去。
 * 够不到怎么办：火拳射程短，reach 之内才动手，不够先贴近。
 * 放完之后：让灼伤持续结算，交回共享交战计划去处理减攻窗口。
 */
namespace PokemonSkills {
    function firepunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse("firepunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return firepunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !firepunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 21;
            if (CompanionBehavior.ai<boolean>(capability, "preferUnlit", true) && !CompanionBehavior.status(context, target, "burn")) score += 10;
            const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
            let crowd = 0;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 2.6) crowd++;
            }
            if (crowd > 0) score += Math.min(12, crowd * 6);
            return score;
        }
    });

    addPreferences("firepunch", {}, [
        field(pathOf("blazeUp"), "烈焰式", "boolean", {
            help: "开启：点燃概率 +15%%、灼伤时长 ×1.15、蔓延距离 ×1.25，但拳威 ×0.88、冷却 +5 刻——铺火为主。关闭（点火式）：拳更重、循环更快，但更难点着、火蔓延更近。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。火拳射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.preferUnlit"), "优先点没着火的", "boolean", {
            help: "开启：还没被点着的目标排得更前，避免浪费火种；关闭则所有目标同价。"
        })
    ]);
}
