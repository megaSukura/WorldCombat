/**
 * 闪光 的伙伴 AI 用途：这招自己的一套出手计划——在人群里炸一下，而不是对单个人点一下。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、它还没被任何「晃眼/糊眼」类状态罩住，
 *   并且身边至少站着 ai.dense 个看得见的敌人时才值得炸光——散射本来就该打在人多的地方。
 * 对谁出手：当前威胁；已经带着共享身份 aim_impaired 的目标跳过，不浪费一次冷却。
 * 够不到怎么办：reach 以闪光半径为准，超出先走近；这是以自身为圆心的招，站得越靠人群越好。
 * 放完之后：一圈敌人的命中一起下降，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("flash", { ai: { maxChase: 8, dense: 2, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 16, 1),
        PokemonSkills.number("ai.dense", "散射最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 闪光半径内看得见的非友方数量；命中判定仍走招式自己的半径与通视检查。 */
    function flashCrowd(context: WorldBehavior.Context, self: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) <= radius) count++;
        }
        return count;
    }

    function flashWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 8)) return false;
        if (status(context, threat, "aim_impaired")) return false;
        return flashCrowd(context, self, item.data.range) >= ai<number>(item, "dense", 2);
    }

    registerUse("flash", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || flashWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !flashWants(context, item, target)) return 0;
            const crowd = flashCrowd(context, source(context), item.data.range);
            return Math.min(95, 55 + (crowd - 1) * 8);
        }
    });
}
