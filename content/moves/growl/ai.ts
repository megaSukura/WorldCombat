/**
 * 叫声 的伙伴 AI 用途：这招自己的一套出手计划——把自己送进能听见的范围，再一声叫软一圈。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、叫声半径内至少站着
 *   ai.minFoes 个还能被叫软的非友方（默认 1，有一个就愿意叫）。声音不看视线，被掩体挡住的敌人也算听得见；
 *   这是原地荡开的一声，不需要走到位，驻守时也能叫。
 * 对谁出手：当前威胁；只看它还能不能真的掉攻击（攻击等级没到 -6），不用泛化的 charmed 身份挡下别处来的分神。
 * 够不到怎么办：reach 就是叫声半径，由共享任务把身体带进人群；这招靠近本身就是它的准备。
 * 放完之后：圈里还能掉攻击的敌人一起变轻，伙伴交回共享顺序，再决定追击还是趁对方错拍拉开。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("growl", { ai: { maxChase: 10, minFoes: 1 } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "最少人数", 1, 5, 1)
    ]);

    /** 与参数公式同源的叫声半径估算；实际命中仍走招式自己的 soundRadius。 */
    function growlRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        const howl = !!(item.data.config && item.data.config.howl);
        return Math.max(2.5, Math.min(7, (3.5 + width * 1.2) * (howl ? 1.5 : 1)));
    }

    /** 这个非友方还能不能真的被叫声压低攻击：攻击等级没到下限，才值得把这一声算在它头上。 */
    function growlBenefits(context: WorldBehavior.Context, other: Entity): boolean {
        return stage(context, other, "atk") > -6;
    }

    /** 以自身为心的叫声半径内、听得见且仍能掉攻击的非友方数量；声音不看视线。 */
    function growlHeard(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            if (distance(other.point, centre) > radius) continue;
            if (!growlBenefits(context, other)) continue;
            count++;
        }
        return count;
    }

    function growlWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (!growlBenefits(context, threat)) return false;
        return growlHeard(context, self.point, growlRadius(context, item)) >= ai<number>(item, "minFoes", 1);
    }

    registerUse("growl", {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return growlRadius(context, item); },
        available: function (context, item, _purpose, target) { return !target || growlWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !growlWants(context, item, target)) return 0;
            return Math.min(90, 55 + growlHeard(context, source(context).point, growlRadius(context, item)) * 6);
        }
    });
}
