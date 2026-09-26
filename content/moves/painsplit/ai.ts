/**
 * 分担痛楚 / painsplit —— AI 用途。
 *
 * 估值只认「实际能拿回多少治疗」：攻击分支要求对手当前生命比自己高，且自己有足够的生命空位去接住这份治疗；
 * 救助分支（`ai.rescue` 开启）要求自己比受伤的伙伴更高，愿意自损把伙伴补起来。两边都按双方较大的最大生命折算，
 * 低于 `ai.margin`（默认 0.1）就不出手——自己健康（没有空位）时，即使对手血更多也不主动用，避免白抽一截却补不回。
 * 差得越多、能接住的治疗越多，排序越靠前。攻击用途仍只推荐敌人；救助用途通过共享的「伤者」感知找到受伤的友方。
 * 对谁出手：攻击是非友方、活着、可见的目标；救助是明确开启后、受伤且被本招实际能补到的友方，不接受自己。
 */
namespace PokemonSkills {
    /**
     * 这一招实际能给「自己（攻击）或伙伴（救助）」带回多少生命，按双方较大的最大生命折算。
     * 小于等于 0 表示这次平衡不划算（对方不比自己高、或自己/伙伴没有生命空位可补）。
     */
    function painsplitGain(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        var self = CompanionBehavior.source(context);
        var reference = Math.max(1, Math.max(self.maximum || 0, target.maximum || 0));
        if (target.friendly) {
            if ((self.health || 0) <= (target.health || 0)) return 0;
            return Math.min((self.health - target.health) / 2, Math.max(0, (target.maximum || 0) - target.health)) / reference;
        }
        if ((target.health || 0) <= (self.health || 0)) return 0;
        return Math.min((target.health - self.health) / 2, Math.max(0, (self.maximum || 0) - self.health)) / reference;
    }

    CompanionBehavior.registerUse("painsplit", {
        protocols: ["world_combat:attack", "world_combat:heal"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || String(target.ref) === String(CompanionBehavior.source(context).ref)) return false;
            if (target.friendly && !CompanionBehavior.ai<boolean>(item, "rescue", false)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(item, "maxChase", 10)) return false;
            return painsplitGain(context, target) >= CompanionBehavior.ai<number>(item, "margin", 0.1);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            if (target.health <= 0 || !target.visible) return false;
            if (String(target.ref) === String(CompanionBehavior.source(context).ref)) return false;
            return !target.friendly || CompanionBehavior.ai<boolean>(item, "rescue", false);
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var gain = painsplitGain(context, target);
            if (gain < CompanionBehavior.ai<number>(item, "margin", 0.1)) return 0;
            return Math.max(1, Math.min(100, Math.round(30 + gain * 70)));
        }
    });

    addPreferences("painsplit", { helpFriends: true, ai: { maxChase: 10, margin: 0.1, leaveStation: false, rescue: false } }, [
        number("ai.maxChase", "牵线距离", 3, 16, 1),
        number("ai.margin", "拉平下限", 0, 0.5, 0.05),
        flag("ai.leaveStation", "驻守时允许离位"),
        flag("ai.rescue", "向伙伴分担")
    ]);
}
