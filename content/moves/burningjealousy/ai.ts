/**
 * 妒火 / burningjealousy —— 伙伴 AI 用途。
 *
 * 这招的 AI 围绕「惩罚刚变强的对手」：
 *   - 何时考虑：目标看得见、活着、非友方，在 `ai.maxChase` 内（或它就是焦点）。
 *   - 对谁出手：优先此刻带着正面能力等级的目标——这一击对它们更重、还会点燃；已经点燃的不再重复烧，
 *     按普通火招排序。火属性目标不吃灼伤，优先级降到普通水平。
 *   - 出手前：由共用任务走到 reach；扇面朝目标方向张开，尽量把目标框进张角里。
 *   - 放完之后：被点燃的目标持续掉血，交回共享交战计划。
 *   - 什么时候紧急：目标正面等级合计达到 `ai.minStages` 时 priority 抬到 80 以上，抢在它把强化用出来之前先烧。
 */
namespace CompanionBehavior {
    /** 只读探针：目标当前正面能力等级合计，回调内缓存。 */
    CompanionBehavior.registerFact("world_combat:move_burningjealousy/stages", function (access, actor) {
        return PokemonSkills.burningJealousyBoost(access, actor);
    });

    function burningJealousyStages(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_burningjealousy/stages", target);
        return typeof value === "number" ? value : 0;
    }
    function burningJealousyFire(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("fire") >= 0;
    }

    const burningJealousyChase = PokemonSkills.number("ai.maxChase", "喷火距离", 3, 20, 1);
    burningJealousyChase.help = "伙伴在威胁离自己这么远以内时才考虑喷妒火；调大愿意从更远处先烧一轮。";
    const burningJealousyMin = PokemonSkills.number("ai.minStages", "惩罚门槛", 1, 6, 1);
    burningJealousyMin.help = "目标的正面等级合计达到这么多时才把妒火抬到高于普通交战；调 1 见一丝强化就抢烧，调大只在它攒大了才优先。";
    const burningJealousyLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    burningJealousyLeave.help = "开启后，驻守中的伙伴会离开原位喷出一片妒火。";

    PokemonSkills.addPreferences(PokemonSkills.burningjealousyId, { ai: { maxChase: 10, minStages: 1, leaveStation: false } },
        [burningJealousyChase, burningJealousyMin, burningJealousyLeave]);

    registerUse(PokemonSkills.burningjealousyId, {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (target === null) return true;
            if (target.friendly || !target.visible || target.health <= 0) return false;
            return context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.visible && target.health > 0
                && (context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 10));
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            const stages = burningJealousyStages(context, target);
            if (stages < ai<number>(item, "minStages", 1)) return 12;
            if (burningJealousyFire(context, target)) return 18;
            return Math.min(96, 80 + stages * 4);
        }
    });
}
