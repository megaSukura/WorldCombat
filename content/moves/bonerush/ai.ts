/**
 * 骨棒乱打 / bonerush —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带骨棒乱打的伙伴把它当**中距离掷骨夯地**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 11）以内就出手；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.cluster`（默认开）打开时，目标近旁还站着
 *   别的敌人会让它更愿意出手——落点震波能一次覆盖一片；只有一个目标时留给别的近身招。落点震波只沿地面传，
 *   所以贴地的目标加分、飞行/悬空的目标降权，让别的招去处理它。
 * 够不到怎么办：掷距交给 `throwRange`，共享任务负责把身位送进掷距。
 * 放完之后：这一串夯完（或目标先倒）就收势，交回共享交战计划等冷却。
 * 优先级：基础 14；已在掷距内 +4；`ai.cluster` 开启且目标近旁 ≥1 个敌人 +8。仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function bonerushWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 11);
    }

    /** 目标近旁（3.5 格内）还站着几个别的敌人；落点震波据此判断值不值得掷骨。 */
    function bonerushCluster(context: WorldBehavior.Context, target: Entity): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    registerUse("bonerush", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bonerushWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !bonerushWants(context, item, target)) return 0;
            const range = CompanionBehavior.distance(source(context).point, target.point);
            let score = 14;
            if (range <= item.data.range) score += 4;
            if (ai<boolean>(item, "cluster", true) && bonerushCluster(context, target) >= 1) score += 8;
            // 震波沿地面传：贴地目标才吃得到，飞行/悬空的目标降权，让别的招接手。
            score += target.grounded === false ? -8 : 4;
            return score;
        }
    });

    PokemonSkills.addPreferences("bonerush", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("fissure"), "裂地式", "boolean", {
            help: "开启（裂地）：震波半径 ×1.3、裂痕时长 ×1.5，地痕留得更久；代价是每击 ×0.85、击数上限收在 3、骨速 ×0.92。关闭（重夯，原生式）：每击 ×1.15、击数可到 5，堆单点伤害；代价是震波半径 ×0.8、裂痕更短。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动掷骨，先走近。它是中距离招，越大越愿意从更远处起手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.cluster"), "瞄准扎堆", "boolean", {
            help: "开启：目标近旁还站着别的敌人时更愿意掷骨，因为落点震波能一次覆盖一片；关闭则只按普通攻击顺序排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为掷骨离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
