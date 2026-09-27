/**
 * 秘密之力 / secretpower —— AI 用途。
 *
 * 出手局面：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 10）格内时贴身借力出手；
 * 焦点目标不受距离限制。开启 `ai.opening` 后，只在目标已经带着「本次命中场所会施加的那一种」
 * 异常时退让（而不是只要有任何异常就不打），避免白白放弃一记有伤害价值的借力。
 * 场所按目标当前脚下取样；给目标补上尚未持有的场所异常时略微优先。够不到交给共享接近逻辑。
 */
namespace CompanionBehavior {
    function secretpowerPlain(item: WorldBehavior.Capability): boolean {
        var config: any = item.data.config;
        return !!(config && config.plain === true);
    }

    /** 目标脚下会抽出的状态：直击形态固定麻痹，其余按真实脚点取样；与命中、预告共用同一函数。 */
    function secretpowerPredicted(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): string {
        if (secretpowerPlain(item))
            return "paralysis";
        var world = CompanionBehavior.world(context);
        var actor = world.actor(target.ref), body = actor === null ? null : world.observe(actor);
        var foot = body !== null ? PokemonSkills.secretpowerFoot(body)
            : WorldCombat.point(target.point[0], target.point[1] - (target.height || 1.4) / 2, target.point[2]);
        return PokemonSkills.secretpowerStatus(PokemonSkills.secretpowerSite(world, foot));
    }

    registerUse("secretpower", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!target || target.friendly || !target.visible || !target.health || target.health <= 0)
                return false;
            if (!ai(item, "opening", false))
                return true;
            var predicted = secretpowerPredicted(context, item, target);
            return !(predicted && status(context, target, predicted));
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            if (target.friendly || !target.visible || target.health <= 0)
                return false;
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref)
                return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 10);
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target)
                return 0;
            // opening 打开时才因「目标已带该异常」退让；关闭时保留这一记有效直接伤害的正常优先级。
            var predicted = secretpowerPredicted(context, item, target);
            if (ai(item, "opening", false) && predicted && status(context, target, predicted))
                return 0;
            var world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            // 可达判断：中间隔墙时直线借力够不到，只留低分，让位给可绕行的目标。
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point)))
                return predicted === "burn" || predicted === "sleep" ? 4 : 2;
            return predicted === "burn" || predicted === "sleep" ? 20 : 10;
        }
    });
    PokemonSkills.addPreferences("secretpower", { ai: { maxChase: 10, leaveStation: false, opening: false } },
        [PokemonSkills.number("ai.maxChase", "追击距离", 2, 32, 1), PokemonSkills.flag("ai.leaveStation", "驻守时离位"),
            PokemonSkills.flag("ai.opening", "只打没有该异常的目标")]);
}
