/**
 * 喷射火焰 / flamethrower 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 13）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.preferClusters`（默认开）打开时，目标身边 3 格内还挤着别的敌人就抬高 priority——按住喷口把
 *   一条走廊一起烧正是它最值的时候；目标还没被烧着时略优先。够不到交给共享接近逻辑。
 * 放完之后：喷窗约 1 秒、站定压火，喷完即回，交回共享交战计划。AI 提交时朝目标方向起喷；持续转向由玩家
 *   按住时逐刻送来的控制点实现，AI 这一侧保持一次朝目标即可。
 */
namespace PokemonSkills {
    function flamethrowerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 13);
    }

    function flamethrowerLine(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("flamethrower", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return flamethrowerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flamethrowerWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (!CompanionBehavior.status(context, target, "burn")) score += 7;
            if (CompanionBehavior.ai<boolean>(capability, "preferClusters", true) && flamethrowerLine(context, target) >= 2) score += 12;
            return score;
        }
    });

    addPreferences("flamethrower", {}, [
        field(pathOf("wide"), "扇面式", "boolean", {
            help: "开启：火焰在身前张开约 30 度、更易点燃，但威力摊薄、火舌更短、冷却更久，用来罩住一片。关闭（集束式）：一条细长火舌，单体更重、射得更远，用来点名。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 20, step: 1,
            help: "超过这个距离就不主动喷火，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.preferClusters"), "成线时优先", "boolean", {
            help: "开启后，目标身边 3 格内还挤着别的敌人时优先喷火，按住喷口把一条走廊一起烧；关闭则只按普通攻击排序。"
        })
    ]);
}
