/**
 * 潜灵奇袭 / phantomforce —— 伙伴 AI 用途。
 *
 * 这招的 AI 围绕「穿过守护」：普通目标它只是一记偏重的幽灵劈击，真正值得出手的是撑了罩的对手。
 *   - 何时考虑：目标看得见、活着、非友方，在 `ai.maxChase` 内（或它就是焦点）；普通属性打不动（幽灵免疫），直接跳过。
 *   - 对谁出手：优先身上带着守护（任何 GuardEffects 池）的目标——现身那一刻能把它整层震碎；其余按普通近战排序。
 *   - 出手前：由共用任务走到 reach；消失一拍期间它打不着也看不出来，落点仍然贴着目标。
 *   - 够不到：由共用任务靠近；驻守且没开 leaveStation 时不硬追。
 *   - 放完之后：目标守护被震碎、这一刀落下，交回共享交战计划。
 *   - 什么时候紧急：自身生命低于 `ai.escapeBelow` 且目标在射程内时 priority 提到 60——消失既是躲点名，
 *     也能贴着目标回来。
 */
namespace CompanionBehavior {
    /** 只读探针：目标身上有几层共享守护（world_combat:guard），回调内缓存。 */
    CompanionBehavior.registerFact("world_combat:move_phantomforce/guards", function (access, actor) {
        if (!access.valid(actor)) return 0;
        return access.effects(actor, "world_combat:guard").length;
    });

    /** 幽灵打不动普通属性：别把这一刀浪费在免疫身上。 */
    function phantomForceNormal(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("normal") >= 0;
    }
    function phantomForceGuards(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_phantomforce/guards", target);
        return typeof value === "number" ? value : 0;
    }

    const phantomForceChase = PokemonSkills.number("ai.maxChase", "潜袭距离", 3, 20, 1);
    phantomForceChase.help = "伙伴在威胁离自己这么远以内时才考虑潜灵奇袭；调小只在近处穿守护，调大愿意从更远处潜过去。";
    const phantomForceBreak = PokemonSkills.flag("ai.breakGuard", "专破守护");
    phantomForceBreak.help = "开启后，目标身上带着守护时大幅提升 priority，优先用这一刀把罩震碎；关闭则按普通幽灵攻击排序。";
    const phantomForceEscape = PokemonSkills.number("ai.escapeBelow", "躲闪血线", 0.15, 0.9, 0.05);
    phantomForceEscape.help = "伙伴生命低于这个比例时把潜灵奇袭当成「消失一拍躲点名」的一招，priority 提前；调高更常在挨打时潜下去。";

    PokemonSkills.addPreferences(PokemonSkills.phantomforceId, { ai: { maxChase: 12, breakGuard: true, escapeBelow: 0.5 } },
        [phantomForceChase, phantomForceBreak, phantomForceEscape]);

    registerUse(PokemonSkills.phantomforceId, {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (target === null) return true;
            if (target.friendly || !target.visible || target.health <= 0) return false;
            if (context.facts.focus !== target.ref && distance(source(context).point, target.point) > ai<number>(item, "maxChase", 12)) return false;
            return !phantomForceNormal(context, target);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.visible && target.health > 0 && !phantomForceNormal(context, target)
                && (context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 12));
        },
        priority: function (context, item, target) {
            if (!target || phantomForceNormal(context, target)) return 0;
            const self = source(context);
            if (ratio(self) < ai<number>(item, "escapeBelow", 0.5) && distance(self.point, target.point) <= item.data.range) return 60;
            if (ai<boolean>(item, "breakGuard", true) && phantomForceGuards(context, target) > 0) return 92;
            return 14;
        }
    });
}
