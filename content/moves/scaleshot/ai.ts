/**
 * 鳞射 / scaleshot 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格之内；更远交给共享接近逻辑。
 *   它是中远距离的 2～5 段小撞击，靠发数堆伤害，所以偏好能在射程内开火的距离。
 * 对谁出手：`ai.finish`（默认关）打开时，残血目标多一档分；只有在配置真的开启散鳞式、且 `ai.spread` 打开时，
 *   才按执行同源的 70° 扇面与射程数出这一梭除主目标外还能分到几个通视敌人（受最多目标数与发数截断），每多一个就更愿意射。
 *   `ai.spread` 只改变已有散鳞配置的使用价值，不会让 AI 在没有开启散鳞时凭空宣称使用散鳞。
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

    /**
     * 与执行同源数出散鳞式除主目标外还能分到鳞片的敌人：同一条 70° 扇面、同一射程与通视条件，
     * 再按执行实际会分到份额的 maxTargets 与 shots 限制（refs 以主目标打头，shots 片轮流分配）。
     */
    function scaleshotSpreadTargets(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point);
        const delta = CompanionBehavior.point(target.point).minus(from);
        if (delta.length() < 0.05) return 0;
        const source = { world: world, actor: world.source(), detail: { values: capability.data.config } };
        const reach = typeof capability.data.range === "number" ? capability.data.range : p("scaleshot", "reach", source);
        const maxTargets = Math.max(1, Math.round(p("scaleshot", "maxTargets", source)));
        const shots = Math.max(2, Math.min(5, Math.round(p("scaleshot", "shots", source))));
        const region = WorldGeometry.sector(from, delta, reach, 70, { below: 2, above: 3 });
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let reachable = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const point = CompanionBehavior.point(other.point);
            if (!region.contains(point)) continue;
            if (!world.clear(from, point)) continue;
            reachable++;
        }
        return Math.max(0, Math.min(reachable, maxTargets - 1, shots - 1));
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
            const inRange = distance <= capability.data.range;
            if (inRange) score += 5;
            if (inRange && scaleshotSpray(context, capability) && CompanionBehavior.ai<boolean>(capability, "spread", false)) {
                const extra = scaleshotSpreadTargets(context, capability, target);
                if (extra > 0) score += Math.min(12, extra * 6);
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
            help: "默认关闭。开启（只在散鳞式配置下生效）：按本招实际 70° 扇面与射程，算出这一梭除了主目标外还能分到几个通视的敌人（受最多目标数与发数限制），每多一个就更愿意射；关闭或未开散鳞式则只按普通中程攻击排序。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一梭小撞击收尾；关闭则所有目标同价。"
        })
    ]);
}
