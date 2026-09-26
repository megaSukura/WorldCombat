/**
 * 和睦相处 的伙伴 AI 用途：这招自己的一套出手计划——把自己送进人群，再摊手劝住一圈。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、和睦半径内至少站着
 *   ai.minFoes 个还没被劝住的非友方（默认 1，看见一个就愿意摊手）。人不够就交回共享接近逻辑，不空放。
 * 对谁出手：当前威胁；它已经在和睦里时跳过，避免重复。
 * 什么时候最想出手：自己受伤、被追着打或正在护送对象时，这份和睦就是脱身／拉开距离的窗口；
 *   若队友已经在围殴同一个目标，马上接上的攻击会把和睦打碎，此时降低优先，避免白费一手。
 * 够不到怎么办：reach 就是和睦半径，由共享任务把身体带进人群；这招靠近本身就是它的准备。
 * 放完之后：圈里的敌人一起掉攻击并停手，伙伴交回共享顺序，再决定追击还是趁空档脱离。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("playnice", { ai: { maxChase: 11, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "最少人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 与参数公式同源的和睦半径估算，用来判断值不值得走进人群；实际命中仍走招式自己的公式。 */
    function playniceRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        const bow = !!(item.data.config && item.data.config.bow);
        return Math.max(1.6, Math.min(4.5, (width * 1.5 + 1.5) * (bow ? 0.8 : 1.2)));
    }

    function playniceCaught(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    /** 队友已经在打这个目标：和睦刚铺上就会被打破，收益打折。 */
    function playniceSquadAttacking(context: WorldBehavior.Context, threat: Entity): boolean {
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.attacking === threat.ref) return true;
        }
        return false;
    }

    function playniceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        if (status(context, threat, "befriended")) return false;
        if (stage(context, threat, "atk") <= -6) return false;
        return playniceCaught(context, self.point, playniceRadius(context, item)) >= ai<number>(item, "minFoes", 1);
    }

    registerUse("playnice", {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return playniceRadius(context, item); },
        available: function (context, item, _purpose, target) { return !target || playniceWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !playniceWants(context, item, target)) return 0;
            const self = source(context);
            const caught = playniceCaught(context, self.point, playniceRadius(context, item));
            // 撤退／护送时最想把对手劝停；队友正围殴则先让位，免得和睦一铺上就被打碎。
            const retreat = self.hurtAgo < 60 || ratio(self) < 0.55 || context.facts.intent === "protect";
            const squad = playniceSquadAttacking(context, target);
            return Math.max(1, Math.min(92, 58 + caught * 7 + (retreat ? 14 : 0) - (squad ? 20 : 0)));
        }
    });
}
