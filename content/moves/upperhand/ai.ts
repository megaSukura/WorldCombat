/**
 * 快手还击 / upperhand 的 AI 用途。
 *
 * 什么局面下出手：只在**读到目标刚提交了一记先制攻击招式**时才提议（窗口由本招的 `window` 参数给出）；
 * 目标可见、敌对、存活且在 `ai.maxChase`（默认 6）格内。够不到交给共享接近逻辑。
 * 读不到先制招就根本不进入候选——这招的全部价值在于打断那一手，而不是当普通掌击。
 *
 * priority：读到就 65（压过普通攻击，抢在对手那一招打出伤害之前按停）；否则 0。
 */
namespace PokemonSkills {
    function upperhandWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 6)) return false;
        const world = CompanionBehavior.world(context);
        return upperhandFresh(world, target.ref, p(upperhandId, "window", world));
    }

    CompanionBehavior.registerUse(upperhandId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return upperhandWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            return target && upperhandWants(context, capability, target) ? 65 : 0;
        }
    });

    addPreferences(upperhandId, {}, [
        field(pathOf("wide"), "横扫式", "boolean", {
            help: "开启：掌风扫出身前一小片扇面、一次按停多个正在出先制招的敌人，但单发轻一成二、按停短 6 刻、收招多 3 刻、冷却多 5 刻。关闭：点掌，单发更重、按停更久。"
        }),
        field(pathOf("ai.maxChase"), "还击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才迎上去按停；本招掌程短，设大也常常够不到。"
        })
    ]);
}
