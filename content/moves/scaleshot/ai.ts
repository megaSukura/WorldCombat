/**
 * 鳞射 / scaleshot 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格之内；更远交给共享接近逻辑。
 *   它是中远距离的 2～5 段小撞击，靠发数堆伤害，所以偏好能在射程内开火的距离。
 * 对谁出手：`ai.finish`（默认关）打开时，残血目标多一档分；只有在配置真的开启散鳞式、且 `ai.spread` 打开时，
 *   目标身旁挤着 2 个以上敌人会把这一梭排到前面——鳞片能分给一群人。`ai.spread` 只改变已有散鳞配置的使用价值，
 *   不会让 AI 在没有开启散鳞时凭空宣称使用散鳞。
 * 够不到怎么办：reach 就是本招射程，不够先走近；连射之间目标全倒下这一梭自然收住、照常脱鳞。
 * 放完之后：这一梭射完（或目标先倒）就脱鳞结算一次提速降防，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function scaleshotWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
    }

    function scaleshotSpray(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const config = capability.data.config;
        return !!(config && config.spray === true);
    }

    CompanionBehavior.registerUse("scaleshot", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return scaleshotWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !scaleshotWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 5;
            if (scaleshotSpray(context, capability) && CompanionBehavior.ai<boolean>(capability, "spread", false)) {
                let crowd = 1;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 2.5) crowd++;
                }
                if (crowd >= 2) score += 12;
            }
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.45) score += 9;
            return score;
        }
    });

    addPreferences("scaleshot", {}, [
        field(pathOf("spray"), "散鳞式", "boolean", {
            help: "开启：鳞片轮流分给身前锥形内至多 3 个敌人、覆盖面广；代价是每片威力 ×0.82、自身防御多降一级、射程 ×0.9、起手 +2 刻、间隔 +1 刻。关闭（聚鳞式）：整梭全部追打一个目标、单发更重、射程更远、出手更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动射鳞，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.spread"), "优先散鳞目标群", "boolean", {
            help: "开启（只在散鳞式配置下生效）：目标身旁挤着两个以上敌人时优先射，鳞片能多分一个；关闭或未开散鳞式则只按普通中程攻击排序。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一梭小撞击收尾；关闭则所有目标同价。"
        })
    ]);
}
