/**
 * 水之波动 / waterpulse 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 对谁出手：`ai.cluster`（默认开）打开时，目标身边挤着别的敌人就优先——一圈水波能多扫几个；
 *   `ai.fresh`（默认开）打开时，已经带着共享混乱身份的目标排后（耳鸣重挂价值低）。
 * 够不到怎么办：reach 就是本招射程，不够先走近。
 * 放完之后：命中留下的耳鸣交回共享交战计划；只要水波还在荡，画面会继续告诉玩家还剩几圈。
 */
namespace PokemonSkills {
    function waterpulseWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 18);
    }

    CompanionBehavior.registerUse("waterpulse", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return waterpulseWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !waterpulseWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 20 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref || other.ref === self.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 3.2) { score += 10; break; }
                }
            }
            if (CompanionBehavior.ai<boolean>(capability, "fresh", true) && CompanionBehavior.status(context, target, "confusion")) score -= 6;
            return score;
        }
    });

    addPreferences("waterpulse", {}, [
        field(pathOf("resonant"), "共振式", "boolean", {
            help: "开启：水波摊得更开、混乱更久更易触发，但单发威力略减、水波更慢、射程 −2、冷却 +6 刻，适合罩住一片。关闭（点振式）：更紧更快更重的一发，代价是范围与耳鸣都收窄。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 26, step: 1,
            help: "超过这个距离就不主动掷水珠，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.cluster"), "瞄准扎堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时优先出手，荡开的水环能多扫几个；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.fresh"), "先打没耳鸣的", "boolean", {
            help: "开启：已经带着共享混乱身份的目标排后，把这一发留给还清醒的对手；关闭则所有目标同价。"
        })
    ]);
}
