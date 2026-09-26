/**
 * 上菜 / orderup 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.serve`（默认开）在身边跟着小个子伙伴（「菜」）时抬高优先级——它能把这一记变成一次自身强化；
 * 对应的能力还没顶满时更优先，顶满后只保留小幅加成。关闭则只按威胁与距离排序。独自一人也照样出招，
 * 只是少了增益。放完之后继续常规交战。
 */
namespace PokemonSkills {
    function orderupDishState(context: WorldBehavior.Context): { present: boolean; open: boolean } {
        const self = CompanionBehavior.source(context);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let present = false;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || !other.friendly || other.health <= 0) continue;
            if ((other.width || 1) > (self.width || 1) * 0.75) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= 3) { present = true; break; }
        }
        if (!present) return { present: false, open: false };
        const stats = CompanionBehavior.stages(context, self);
        const open = (stats.atk || 0) < 6 || (stats.def || 0) < 6 || (stats.spe || 0) < 6;
        return { present: true, open: open };
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
            const dish = CompanionBehavior.ai<boolean>(capability, "serve", true) ? orderupDishState(context) : { present: false, open: false };
            return 18 + (dish.present ? (dish.open ? 16 : 4) : 0);
        }
    });

    addPreferences("orderup", {}, [
        field(pathOf("share"), "分餐式", "boolean", {
            help: "开启：自身与身旁最多四名队友各 +1 级增益，但单发威力 ×0.94、冷却 +8 刻；关闭：独享式，自身增益多一级、单发威力 ×1.06、冷却更短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动上菜，先走近。越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.serve"), "有菜就上", "boolean", {
            help: "开启：身边跟着小个子伙伴时优先上菜，把这一记变成一次自身强化；对应能力快顶满时优先级降低。关闭：只按威胁与距离排序。"
        })
    ]);
}
