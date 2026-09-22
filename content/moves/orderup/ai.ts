/**
 * 上菜 / orderup 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.serve`（默认开）在身边跟着小个子伙伴（「菜」）时抬高优先级——它能把这一记变成一次自身强化；
 * 目标带着反射壁、光墙或极光幕时也抬高一档。关闭则只按威胁与距离排序。放完之后继续常规交战。
 */
namespace PokemonSkills {
    function orderupHasDish(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || !other.friendly || other.health <= 0) continue;
            if ((other.width || 1) > (self.width || 1) * 0.75) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= 3) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("orderup", {
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
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const warded = CompanionBehavior.status(context, target, "reflect")
                || CompanionBehavior.status(context, target, "lightscreen")
                || CompanionBehavior.status(context, target, "auroraveil");
            const dish = CompanionBehavior.ai<boolean>(capability, "serve", true) && orderupHasDish(context);
            return 18 + (dish ? 14 : 0) + (warded ? 8 : 0);
        }
    });

    addPreferences("orderup", {}, [
        field(pathOf("share"), "分餐式", "boolean", {
            help: "开启：自身与身旁最多四名队友各 +1 级增益、碎壁范围 ×1.2，但单发威力 ×0.94、冷却 +8 刻；关闭：独享式，自身增益多一级、单发威力 ×1.06、冷却更短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动上菜，先走近。越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.serve"), "有菜就上", "boolean", {
            help: "开启：身边跟着小个子伙伴时优先上菜，把这一记变成一次自身强化；关闭：只按威胁与距离排序。"
        })
    ]);
}
