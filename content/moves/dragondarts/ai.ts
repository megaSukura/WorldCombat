/**
 * 龙箭 / dragondarts 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上。目标可见、敌对、存活，在 `ai.maxChase`（默认 13）以内就出手；
 *   更远交给共享接近逻辑。
 * 为什么对扎堆出手：只有分头式下两支箭才能各追一只，所以 `ai.crowd`（默认开）打开时，需要目标之外真有一处
 *   够得着、可见、通视的第二只活敌才会加分；单纯和目标挨得近不算有效第二路。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.finishLow`（默认关）打开时残血目标排得更前。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 第二支怎么定：第一支追 AI 推荐的这只；第二支在发射那一刻才决定——分头式（默认）若本次候选范围内
 *   还有另一只可见通视的活敌就改派给它，否则原对象还活着就继续追它，都没有就沿最后朝向射空；不会无限重定向。
 * 放完之后：两箭各自结算，伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    function dragondartsWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 13);
    }

    /** 分头式下，目标之外是否真有一处够得着、可见、通视的第二只活敌；符合才是有效的第二路。 */
    function dragondartsSecond(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        const self = source(context), range = item.data.range, nearby = context.facts.nearby as Entity[];
        const access = world(context);
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > range) continue;
            const at = access.actor(other.ref);
            if (!at) continue;
            const facts = access.observe(at);
            if (facts === null || !facts.visible()) continue;
            if (!access.clear(point(self.point), facts.position())) continue;
            return true;
        }
        return false;
    }

    registerUse("dragondarts", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dragondartsWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !dragondartsWants(context, item, target)) return 0;
            if (distance(source(context).point, target.point) > item.data.range) return 0;
            const split = !!(item.data.config && item.data.config.volley === true);
            let score = 22;
            if (ai<boolean>(item, "crowd", true) && split && dragondartsSecond(context, item, target)) score += 10;
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) score += 12;
            return score;
        }
    });

    PokemonSkills.addPreferences("dragondarts", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("volley"), "分头式", "boolean", {
            help: "开启（分头式）：有两只敌人时两支龙箭各追一只、每支 ×1，覆盖两个目标。关闭（集火式）：两箭都追选定目标、每支 ×1.2，把伤害压在一只身上。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动出箭，先走近；越大越愿意从远处先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用两箭收尾；关闭则所有目标同价。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启：只有分头式下、且目标之外真有一处够得着又通视的第二只敌人时才更愿意出箭；关闭则只按普通远程攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为出箭离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
