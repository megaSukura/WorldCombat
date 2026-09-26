/**
 * 飞弹针的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 12）格之内；更远交给共享接近逻辑。
 *   它单根轻、出手快、带追踪，所以比岩石爆击更愿意从远处先手，也适合贴身缠斗。
 * 对谁出手：`ai.stick`（默认开）打开时，还没被钉住的目标排得更前——先把减速挂上；正在移动的目标也加分，
 *   因为钉刺正好限制脚步。已经钉着针的目标排得稍后，但不会因此被排除。
 * 对 Boss：减速可能被原生免控拒绝，本招不把「能不能挂上减速」当成出手条件——基础针伤照常结算，所以照用。
 * 够不到怎么办：reach 就是本招射程，不够先走近；针带追踪，目标跑动也难甩掉；自由方向也能空发一梭。
 * 放完之后：这一梭射完（或目标先倒）就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function pinmissileWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    /** 目标的当帧移动快慢（格/刻）；没有速度事实时按 0 处理。 */
    function pinmissileMotion(target: CompanionBehavior.Entity): number {
        const value = target.velocity as number[] | undefined;
        if (!value || value.length !== 3) return 0;
        return Math.sqrt(value[0] * value[0] + value[1] * value[1] + value[2] * value[2]);
    }

    CompanionBehavior.registerUse("pinmissile", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return pinmissileWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !pinmissileWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 15;
            if (distance <= capability.data.range) score += 4;
            if (distance <= 6) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "stick", true) && !CompanionBehavior.status(context, target, "quills")) score += 6;
            if (pinmissileMotion(target) > 0.08) score += 4;
            return Math.max(1, score);
        }
    });

    addPreferences("pinmissile", {}, [
        field(pathOf("barbed"), "倒钩针", "boolean", {
            help: "开启：单针威力 ×1.25、钉住时长 ×1.5、散布 ×0.7，适合把目标粘住慢慢磨；代价是针数收在 3 根、针速 ×0.92、间隔 +1 刻、起手 +2 刻、冷却 +4 刻。关闭（速射针）：针数可到 5 根、间隔更密、针速更快，代价是单针威力 ×0.9、钉住更短、散布 ×1.15。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动射针，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.stick"), "优先钉没被粘住的", "boolean", {
            help: "开启：还没被钉住、或正在移动的目标排得更前，把针先给需要限制脚步的对手；关闭则只按普通攻击排序。不会因为目标可能免疫减速就拒绝出手。"
        })
    ]);
}
