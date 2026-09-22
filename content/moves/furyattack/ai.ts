/**
 * 乱击 / furyattack —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带乱击的伙伴把它当**贴身定点突刺**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 7）以内就出手；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.corner`（默认开）打开时，几乎不移动的
 *   目标（被逼住、贴墙、站在原地）排得更前——它退不开，整串会被吃满；正在跑的目标排后，因为顶退会把它推出射程。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：这一串刺完（或目标被顶出射程）就收势，交回共享交战计划等冷却。
 * 优先级：基础 17；已在射程内 +8；`ai.corner` 开启且目标几乎不移动 +10。仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function furyattackWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 7);
    }

    /** 目标当前的水平速度；没有速度事实时按「站住」处理。 */
    function furyattackSpeed(target: Entity): number {
        const velocity = target.velocity;
        if (!velocity || velocity.length < 3) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    registerUse("furyattack", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return furyattackWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !furyattackWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            let score = 17;
            if (distance <= item.data.range) score += 8;
            if (ai<boolean>(item, "corner", true) && furyattackSpeed(target) < 0.02) score += 10;
            return score;
        }
    });

    PokemonSkills.addPreferences("furyattack", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("close"), "追击式", "boolean", {
            help: "开启（追击）：每一刺后向前跟一段，把距离重新压回射程内，整串更容易吃满；代价是每刺 ×0.9、顶退 ×0.35，几乎推不动人。关闭（顶退，原生式）：站定不动、顶退 ×1.2、每刺 ×1.05，一路把目标推出去；代价是它很快被推出射程，这串提前断。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动起刺，先走近。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.corner"), "优先逼住的目标", "boolean", {
            help: "开启：几乎不移动的目标（被逼住、贴墙、原地站定）排得更前，因为整串会被它吃满；正在跑的目标排后。关闭则所有目标同价。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为乱击离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
