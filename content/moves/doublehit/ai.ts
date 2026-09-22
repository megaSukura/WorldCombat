/**
 * 二连击 / doublehit —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带二连击的伙伴把它当**范围两扫**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 9）以内就出手；更远交给共享接近逻辑。
 * 为什么对扎堆出手：这一招的弧很宽、能同时扫到好几个，所以 `ai.crowd`（默认开）打开时，目标近旁还站着
 *   别的敌人会让它更愿意出手；只有一个目标时留给普通近身攻击。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两扫各自结算，第一扫把人扫开、第二扫回拍；伙伴交回共享顺序。
 * 优先级：基础 24（在射程内）／6（还要先走近）；`ai.crowd` 开启且目标近旁 ≥1 个敌人时 +10。
 */
namespace CompanionBehavior {
    function doublehitWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 9);
    }

    /** 目标近旁（3.5 格内）还站着几个别的敌人；宽弧据此判断要不要先手。 */
    function doublehitCrowd(context: WorldBehavior.Context, target: Entity): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    registerUse("doublehit", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return doublehitWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !doublehitWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            if (distance > item.data.range) return 6;
            let score = 24;
            if (ai<boolean>(item, "crowd", true) && doublehitCrowd(context, target) >= 1) score += 10;
            return score;
        }
    });

    PokemonSkills.addPreferences("doublehit", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("arc"), "回扫", "boolean", {
            help: "开启（回扫）：尾巴向一侧扫再反向回扫，张角 ×1.1、能同时扫到更多、横向推力 ×1.2，把人推来推去；代价是每扫 ×0.9、间隔略长。关闭（直扫）：两扫同向、张角 ×0.62 更窄更集中、每扫 ×1.15，沿同一个方向一路把人推出去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动甩尾，先走近。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启：目标近旁还站着别的敌人时更愿意甩尾，因为宽弧能一次扫到好几个；关闭则只按普通近身攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为甩尾离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
