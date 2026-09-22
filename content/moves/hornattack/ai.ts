/**
 * 角撞 / hornattack 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 6）格内；角程短，够不到先让共享接近逻辑送进来。
 * 对谁出手：贴地的目标排得更前——顶撞本来就是地面动作，飞在空中的目标不好锁角；`ai.finish` 收残血。
 * 出手位置：越贴近越好（1.6 格内给分），好让角线稳稳咬住并把对方推出去。
 * 放完之后：目标被推离原位、护甲未动；交回共享计划决定继续贴身还是等冷却。
 */
namespace PokemonSkills {
    function hornattackValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse("hornattack", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!hornattackValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) { return hornattackValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 16;
            if (target.grounded !== false) score += 5;
            if (distance <= 1.6) score += 3;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 10;
            return score;
        }
    });

    addPreferences("hornattack", {}, [
        flag("drive", "推土式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.finish", "优先收残血")
    ]);
}
