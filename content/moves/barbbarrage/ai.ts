/**
 * 毒千针 / barbbarrage 的 AI 用途。
 *
 * 什么局面下出手：物理远程齐射，对手可见、敌对、活着且在 `ai.maxChase` 之内即可。
 * 对谁出手：目标已中毒／剧毒时 priority 抬得最高——贴准它这一轮整轮翻倍、还把毒坐实；
 *   目标身边 3 格内还挤着别的敌人时再加一档，宽面扫射能顺带把毒撒到更多身上；不额外经营地面。
 * 够不到就交给共享接近逻辑。
 */
namespace PokemonSkills {
    /** 目标 3 格内还挤着几个别的敌人；用于判断宽面扫射是否划算。 */
    function barbbarrageCrowdCount(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("barbbarrage", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const poisoned = CompanionBehavior.status(context, target, "poison") || CompanionBehavior.status(context, target, "toxic");
            const crowd = barbbarrageCrowdCount(context, target);
            let score = 22;
            if (poisoned) score += 18;
            if (crowd >= 2) score += 6;
            return score;
        }
    });

    addPreferences("barbbarrage", {}, [
        field(pathOf("hail"), "倾泻", "boolean", {
            help: "开启：针数 ×1.4、中毒概率 ×1.15，但整轮威力 ×0.85，收招与冷却各多 2／3 刻。关闭：针少而重，单体更痛。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动齐射，先走近。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
