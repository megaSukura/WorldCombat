/**
 * 扫尾拍打 / tailslap —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带扫尾的伙伴把它当**原地整圈扫击**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 7）以内就出手；更远交给共享接近逻辑。
 * 为什么对扎堆出手：这一招打一整圈、能同时扫到好几个，所以 `ai.crowd`（默认开）打开时，目标近旁还站着别的敌人
 *   会让它更愿意起旋；只有一个目标时留给普通近身攻击。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 够不到怎么办：范围交给 `radius`，共享任务负责把身位送进作用范围。
 * 放完之后：整趟转完（或目标先倒）就收势，交回共享交战计划等冷却。
 * 优先级：基础 16；已在范围内 +6；`ai.crowd` 开启且目标近旁 ≥1 个敌人 +10。仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function tailslapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 7);
    }

    /** 目标近旁（3.5 格内）还站着几个别的敌人；整圈扫击据此判断值不值得起旋。 */
    function tailslapCrowd(context: WorldBehavior.Context, target: Entity): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    registerUse("tailslap", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return tailslapWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !tailslapWants(context, item, target)) return 0;
            const range = CompanionBehavior.distance(source(context).point, target.point);
            let score = 16;
            if (range <= item.data.range) score += 6;
            if (ai<boolean>(item, "crowd", true) && tailslapCrowd(context, target) >= 1) score += 10;
            return score;
        }
    });

    PokemonSkills.addPreferences("tailslap", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("smash"), "砸尾式", "boolean", {
            help: "开启（砸尾）：每圈威力 ×1.25、上挑 ×1.4，把伤害集中并挑起来；代价是只扫前向约 200° 一段（张角 ×0.55）、推开 ×0.8、间隔 +1 刻。关闭（旋扫，原生式）：整圈 360°、推开更足，一次照顾四周所有人；代价是每圈略轻。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动起旋，先走近。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启：目标近旁还站着别的敌人时更愿意起旋，因为整圈能一次扫到好几个；关闭则只按普通近身攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为扫尾离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
