/**
 * 庆祝 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：身边至少 `ai.minAllies`（默认 2，含自己）个友方，且**队伍短暂安全**——视野内没有
 *   敌对目标进入 `ai.safeRange`（默认 8）以内；贴身交战时不抢占急救技能。自己还没有在庆祝中。
 *   慰劳模式额外要求确有受伤的友方需要补一口；助兴模式只要是安全的休整时机就铺。
 * 对谁出手：自己；庆祝以自身为中心，队友是顺手被感染的。
 * 候选之间怎么排：满足条件时 70 起（人越多越高，最多 +30；慰劳且有人受伤再 +25），越过共享交战次序
 *   先开一场——它便宜，值得在脱离接触时先铺一圈。
 * 放完之后：一圈友方（含自己）带上「庆祝中」；这份标记还在时不再重复开。
 * 配置 vigor（慰劳）：切换「助兴（短暂行进劲，挨打即退）」与「慰劳（按已失生命回复）」两种表达。
 */
namespace PokemonSkills {
    /** 半径内包含自己在内的友方数量。 */
    function celebrateAllies(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), radius = item.data.range, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= radius) count++;
        }
        return count;
    }

    /** 附近（含自己）是否有实际受伤的友方需要慰劳。 */
    function celebrateWounded(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context), radius = item.data.range;
        if (CompanionBehavior.ratio(self) < 0.9) return true;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= radius && CompanionBehavior.ratio(other) < 0.9) return true;
        }
        return false;
    }

    /** 队伍是否短暂安全：视野内没有距离过近的敌对目标。 */
    function celebrateSafe(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context), range = CompanionBehavior.ai<number>(item, "safeRange", 8);
        const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        if (threat && threat.health > 0 && threat.visible && !threat.friendly && CompanionBehavior.distance(self.point, threat.point) < range) return false;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.health > 0 && other.visible && !other.friendly && CompanionBehavior.distance(self.point, other.point) < range) return false;
        }
        return true;
    }

    CompanionBehavior.registerUse(celebrateId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "celebrate")) return false;
            if (celebrateAllies(context, item) < CompanionBehavior.ai<number>(item, "minAllies", 2)) return false;
            if (!celebrateSafe(context, item)) return false;
            const vigor = !!(item.data.config && item.data.config.vigor === true);
            return vigor ? celebrateWounded(context, item) : true;
        },
        accepts: function (context, _item, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, item, target) {
            if (!target || target.ref !== CompanionBehavior.source(context).ref) return 0;
            if (!celebrateSafe(context, item)) return 0;
            let value = 70 + Math.min(30, (celebrateAllies(context, item) - 1) * 8);
            const vigor = !!(item.data.config && item.data.config.vigor === true);
            if (vigor && celebrateWounded(context, item)) value += 25;
            return value;
        }
    });

    addPreferences(celebrateId, { vigor: false, ai: { safeRange: 8, minAllies: 2, leaveStation: false } }, [
        field(pathOf("ai.safeRange"), "安全距离", "number", { min: 2, max: 24, step: 1,
            help: "视野内敌对目标进入这个距离就暂不开庆祝；调小更敢贴身办，调大只在确实脱离接触时铺场。" }),
        field(pathOf("ai.minAllies"), "最少同庆", "number", { min: 1, max: 6, step: 1,
            help: "身边至少这么多友方（含自己）才值得庆祝；调 1 一个人也开，调大只在人多时铺场。" }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去给队友办庆祝。" })
    ]);
}
