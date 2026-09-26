/**
 * 快手还击 / upperhand 的 AI 用途。
 *
 * 什么局面下出手：
 *   一、**读准先制招**——目标最近 `window` 刻内提交过一记先制攻击招式（世界事件 `world_combat:committed` 记下），
 *       够得到就主动踏进按停，priority 最高；
 *   二、**近身抢攻**——普通原生敌人没有公开的先制意图，只要它已近身且正把矛头对着自己（`attacking` 是自己）
 *       或刚完成一次真实攻击（`DamageSemantics.recentAttack`），就架起正面短窗，第一次贴身接触到来即反打。
 * 目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；够不到交给共享接近逻辑。
 * 不在远距、也没有任何攻击迹象时空守——本招的价值在于截住这一手。
 *
 * priority：读到先制招 68；近身有攻击迹象 55；否则 0。
 */
namespace PokemonSkills {
    function upperhandWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 6)) return false;
        const world = CompanionBehavior.world(context);
        const window = p(upperhandId, "window", world);
        if (upperhandFresh(world, target.ref, window)) return true;
        if (CompanionBehavior.distance(self.point, target.point) > p(upperhandId, "reach", world) + 1.2) return false;
        if (target.attacking === self.ref) return true;
        const opponent = world.actor(target.ref);
        return opponent !== null && DamageSemantics.recentAttack(world, opponent, window) !== null;
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
            if (!target || !upperhandWants(context, capability, target)) return 0;
            const world = CompanionBehavior.world(context);
            const window = p(upperhandId, "window", world);
            return upperhandFresh(world, target.ref, window) ? 68 : 55;
        }
    });

    addPreferences(upperhandId, {}, [
        field(pathOf("wide"), "横扫式", "boolean", {
            help: "开启：迎击成功后，掌风扫出身前一小片扇面、被扫到的敌人各挨一记并按停，但单发轻一成二、按停短 6 刻、收招多 3 刻、冷却多 5 刻。关闭：点掌，单发更重、按停更久，一次只还击一个人。"
        }),
        field(pathOf("ai.maxChase"), "迎击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才考虑迎击；本招掌程短，设大也常常够不到。"
        })
    ]);
}
