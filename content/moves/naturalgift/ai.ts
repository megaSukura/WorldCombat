/**
 * 自然之恩 / naturalgift —— AI 用途。
 *
 * 出手局面：带着一颗表里的树果、目标是可见敌对的活体、且在 `ai.maxChase`（默认 6）格内时，作为近身攻击出手；
 * 空手或携带的不是树果时这招没有力量，直接不参与候选。焦点目标不受距离限制，由共享接近逻辑先走近。
 * 排序（珍惜果实）：默认排位较低；树果属性克制目标时抬到前列；被目标抗性削弱时降权；目标生命低于
 * `ai.finish`（默认 0.5）再抬到最前，留着用这颗果收尾；属性免疫（倍率 0）则不出手。
 * 实际可达路线也算进消耗决策：撞墙／被地形挡住的一步会白白花掉这颗果，先降权让给别的选择。
 * 配置：多远考虑出手、收尾生命线、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    /** 现场读取施法者手里的树果恩赐；有可用的树果才值得出手，属性决定排序。 */
    function naturalgiftHeldGift(context: WorldBehavior.Context): PokemonSkills.NaturalgiftGift | null {
        var access = CompanionBehavior.world(context);
        var actor = access.actor(CompanionBehavior.source(context).ref);
        if (!actor) return null;
        var held = PokemonSkills.naturalgiftHeld(access, actor);
        return held ? held.gift : null;
    }

    /** 树果属性对目标已知属性的相性倍率；目标类型未知（其他模组的普通生物）返回 -1，按普通近身对待。 */
    function naturalgiftCoverage(context: WorldBehavior.Context, target: WorldMethods.Subject, type: string): number {
        var world = CompanionBehavior.world(context), foe = world.actor(target.ref);
        if (foe === null || !world.valid(foe)) return -1;
        var types = PokemonDamage.combatants.read(world, foe).types;
        if (!types || !types.length) return -1;
        var factor = 1;
        for (var index = 0; index < types.length; index++) factor *= CobblemonCombat.typeEffectiveness(type, types[index]);
        return factor;
    }

    /** 这一步能否真的走到对手身上：视线／路径被地形挡住时不值得花掉这颗果。 */
    function naturalgiftRouteClear(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    registerUse("naturalgift", {
        protocols: ["world_combat:attack"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!naturalgiftHeldGift(context)) return false;
            if (!target) return true;
            var goal: any = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref) return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 6);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var gift = naturalgiftHeldGift(context);
            if (!gift) return 0;
            var factor = naturalgiftCoverage(context, target, gift.type);
            if (factor === 0) return 0;
            // factor < 0 表示目标类型未知（其他模组的普通生物）：按普通近身中性对待，不当成抗性。
            var value = factor > 1 ? 40 : factor > 0 && factor < 1 ? 6 : 14;
            if (ratio(target) <= ai<number>(item, "finish", 0.5)) value = Math.max(value, 48);
            // 路线被挡：撞墙／撞地形的一步会白白花掉这颗果，先降权。
            if (!naturalgiftRouteClear(context, target)) value = Math.min(value, 6);
            return value;
        }
    });

    PokemonSkills.addPreferences("naturalgift", { ai: { maxChase: 6, finish: 0.5, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 16, 1),
        PokemonSkills.number("ai.finish", "收尾生命线", 0.2, 1, 0.05),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
