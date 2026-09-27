/**
 * 临别礼物 的伙伴 AI 用途：这招自己的一套出手计划——只在真的走投无路、且这份礼物有后续价值时把命交出去。
 *
 * 什么局面有意义（三个条件同时成立才当作紧急行动）：
 *   1) 残血：自己的生命比例掉到 ai.cornered 以下。
 *   2) 有可送的敌：gift 半径内有一个「真正在打」的非友方——是敌对/玩家单位，或正把矛头对准自己或伙伴。
 *      纯路过、不会反击的中立生物不算，避免为它们送命。
 *   3) 队友能兑现：ai.followUp 距离内有一个活着的伙伴（不含自己），好让被夺级的敌人有人接着打。
 *      纯独斗、没人能利用这份削弱时，伙计不盲目送死；把 ai.followUp 调到 0 表示不要求队友。
 * 对谁出手：当前威胁；先把身边最近的威胁罩住（遗念也留在原地）。
 * 够不到怎么办：reach 就是礼物半径，够不到就由共享任务走近目标——凑到身边才交出自己。
 * 放完之后：施法者倒下，遗念留在原地；伙伴运行随该个体退场结束。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("memento", { ai: { cornered: 0.2, followUp: 12, leaveStation: false } }, [
        PokemonSkills.number("ai.cornered", "残血阈值", 0.05, 0.5, 0.05),
        PokemonSkills.number("ai.followUp", "接应距离", 0, 24, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 真正值得用命去削弱的敌人：敌对/玩家单位，或正把矛头对准自己或一个活着伙伴的单位。 */
    function mementoRealThreat(context: WorldBehavior.Context, other: Entity): boolean {
        if (other.hostile || other.player) return true;
        if (!other.attacking) return false;
        const self = source(context);
        if (other.attacking === self.ref) return true;
        return (context.facts.nearby as Entity[]).some(function (ally) {
            return ally.ref === other.attacking && ally.friendly && ally.health > 0;
        });
    }

    /** gift 半径内真正会被礼物罩到、且值得罩的非友方数量。 */
    function mementoCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context);
        let count = 0;
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (!other.visible || other.friendly || other.health <= 0) return;
            if (distance(other.point, self.point) > item.data.range) return;
            if (!mementoRealThreat(context, other)) return;
            count++;
        });
        return count;
    }

    /** 是否有一个活着的伙伴能在 ai.followUp 距离内接住这份削弱；配置 0 表示不要求队友。 */
    function mementoFollowUp(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const range = ai<number>(item, "followUp", 12);
        if (!(range > 0)) return true;
        const self = source(context);
        return (context.facts.nearby as Entity[]).some(function (other) {
            return other.friendly && other.health > 0 && String(other.ref) !== String(self.ref)
                && distance(self.point, other.point) <= range;
        });
    }

    function mementoWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (ratio(self) > ai<number>(item, "cornered", 0.2)) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (status(context, threat, "grieving")) return false;
        if (!mementoRealThreat(context, threat)) return false;
        return mementoCaught(context, item) >= 1 && mementoFollowUp(context, item);
    }

    registerUse("memento", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || mementoWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !mementoWants(context, item, target)) return 0;
            return Math.min(110, 100 + mementoCaught(context, item) * 2);
        }
    });
}
