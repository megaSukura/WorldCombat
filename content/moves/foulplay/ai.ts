/**
 * 欺诈 / foulplay 的 AI 用途。
 *
 * 什么局面下出手：一条能伸到 `reach` 的暗影，对手可见、敌对、活着且在 `ai.maxChase` 之内即可；
 *   够不到交给共享接近逻辑走近再伸。它是自由瞄准的接触招，AI 只负责为攻击用途推荐一个敌人；
 *   实际打到谁仍由暗影的真实首碰决定。
 * 对谁出手：这一招吃实际抓到者的物攻。AI 把候选目标此刻的有效攻击与**自己**在同一种读法下比较
 *   （双方都是宝可梦时用原生物攻；任一为普通 MC/Mod 生物时改用原版 `attack_damage` 属性，避免两种量纲直接对撞）：
 *   目标明显比自己壮就把欺诈排到别的招前面，超过一档更优先——它乐意替弱小的队友去咬那些壮汉；普通目标压到 14。
 *   配置的 `ai.strongAt` 只在它与施法者同一量级时作为绝对门槛，调低会对更多目标先借力。
 * 放完接什么：交回共享交战计划；纠缠式把目标拖近后正好交给别的近身招。
 */
namespace PokemonSkills {
    /** 一个现场目标此刻的伤害事实；读不到（离场／未加载）记 null。 */
    function foulplayFacts(context: WorldBehavior.Context, ref: string): CombatantStats.Facts | null {
        const world = CompanionBehavior.world(context), actor = world.actor(ref);
        if (actor === null || !world.valid(actor)) return null;
        return PokemonDamage.combatants.read(world, actor);
    }

    /** 普通 MC/Mod 生物用的原版攻击属性；这是与宝可梦物攻分开的另一种量纲。 */
    function foulplayAttribute(context: WorldBehavior.Context, ref: string): number {
        const world = CompanionBehavior.world(context), actor = world.actor(ref);
        if (actor === null || !world.valid(actor)) return 0;
        const attribute = world.attributeValue(actor, "minecraft:generic.attack_damage");
        return attribute === null ? 0 : attribute.value();
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
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const mine = foulplayFacts(context, self.ref), theirs = foulplayFacts(context, target.ref);
            if (mine === null || theirs === null) return 14;
            // 同单位比较：双方都是宝可梦时用原生物攻；任一为普通 MC/Mod 生物时改用原版攻击属性。
            const pokemonPair = mine.level !== undefined && theirs.level !== undefined;
            const selfAttack = pokemonPair ? (mine.stats.atk || 0) : foulplayAttribute(context, self.ref);
            const attack = pokemonPair ? (theirs.stats.atk || 0) : foulplayAttribute(context, target.ref);
            const configured = Math.max(1, CompanionBehavior.ai<number>(capability, "strongAt", 100));
            // 配置值只在它与施法者同一量级时当绝对门槛；否则以施法者自身为参照（普通生物也适用）。
            const reference = selfAttack > 0 ? Math.min(configured, selfAttack) : configured;
            if (attack >= reference + 30) return 46;
            if (attack >= reference) return 34;
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
            help: "同种读法下，目标有效攻击达到这个值、或已不低于自己时，就把欺诈排到别的招前面（超过一档更优先）。调低会让你对更多目标先借力气；面对普通 MC/Mod 生物时按原版攻击属性比较，不受这个宝可梦档位值限制。"
        })
    ]);
}
