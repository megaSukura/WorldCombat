/**
 * 欺诈 / foulplay 的 AI 用途。
 *
 * 什么局面下出手：一条能伸到 `reach` 的暗影，对手可见、敌对、活着且在 `ai.maxChase` 之内即可；
 *   够不到交给共享接近逻辑走近再伸。它是自由瞄准的接触招，AI 只负责为攻击用途推荐一个敌人；
 *   实际打到谁仍由暗影的真实首碰决定。
 * 对谁出手：这一招吃实际抓到者的物攻。AI 会把候选目标此刻的有效物攻（`PokemonDamage.combatants.read`）
 *   与**自己**的有效物攻、以及配置的 `ai.strongAt` 阈值一起比较：目标明显比自己壮（达到阈值）就把欺诈
 *   排到别的招前面，超过一档更优先——它乐意替弱小的队友去咬那些壮汉；普通目标压到 14 让位给别的招。
 * 放完接什么：交回共享交战计划；纠缠式把目标拖近后正好交给别的近身招。
 */
namespace PokemonSkills {
    /** 一个现场目标此刻的有效物攻；读不到（离场／未加载／非宝可梦）记 0。 */
    function foulplayAttack(context: WorldBehavior.Context, ref: string): number {
        const world = CompanionBehavior.world(context), actor = world.actor(ref);
        if (actor === null || !world.valid(actor)) return 0;
        const facts = PokemonDamage.combatants.read(world, actor);
        return facts.stats.atk === undefined ? 0 : facts.stats.atk;
    }

    CompanionBehavior.registerUse(foulplayId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const attack = foulplayAttack(context, target.ref);
            const self = foulplayAttack(context, CompanionBehavior.source(context).ref);
            const threshold = Math.max(CompanionBehavior.ai<number>(capability, "strongAt", 100), self);
            if (attack >= threshold + 30) return 46;
            if (attack >= threshold) return 34;
            return 14;
        }
    });

    addPreferences(foulplayId, {}, [
        field(pathOf("cling"), "纠缠", "boolean", {
            help: "开启：命中后把目标朝自己拖近并让它踉跄一段（减速），但本击 ×0.88、冷却多 3 刻。关闭：命中当刻反拧松手，本击 ×1.06。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动伸暗影，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.strongAt"), "算作强敌的物攻", "number", {
            min: 40, max: 180, step: 5,
            help: "目标有效物攻达到这个值、或已不低于自己时，就把欺诈排到别的招前面（超过一档更优先）。调低会让你对更多目标先借力气。"
        })
    ]);
}
