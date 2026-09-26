/**
 * 二连劈 / dualchop —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带二连劈的伙伴把它当**贴身的先竖后横双刀**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 9）以内就出手；更远交给共享接近逻辑（本招射程短，先贴近是常态）。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.finishLow`（默认关）打开时残血目标
 *   排得更前；目标周围还挤着别的敌人时，第二刀的宽短横斩能一次照顾多个，排序提前。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两刀各自结算，第一刀只劈刀路第一个目标，第二刀以第一刀落点为圆心横斩其两侧；伙伴交回共享顺序。
 * 优先级：基础 26（在射程内）／6（还要先走近）；目标近旁还有别的敌人 +8；`ai.finishLow` 开启且目标生命
 *   低于四成时 +12。
 */
namespace CompanionBehavior {
    function dualchopWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 9);
    }

    /** 目标近旁（3.5 格内）还站着几个别的敌人；第二刀的宽短横斩据此判断值不值得先手。 */
    function dualchopCrowd(context: WorldBehavior.Context, target: Entity): number {
        const nearby = (context.facts.nearby || []) as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    registerUse("dualchop", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dualchopWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !dualchopWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            if (distance > item.data.range) return 6;
            let score = 26;
            if (dualchopCrowd(context, target) >= 1) score += 8;
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) score += 12;
            return score;
        }
    });

    PokemonSkills.addPreferences("dualchop", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动劈击，先走近；本招射程短，通常要先贴到身前。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这两刀收尾；关闭则所有目标同等对待。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为劈击离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
