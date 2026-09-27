/**
 * 飞弹针的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 12）格之内；更远交给共享接近逻辑。
 *   它单根轻、出手快、带追踪，所以比岩石爆击更愿意从远处先手，也适合贴身缠斗。
 * 对谁出手：`ai.stick`（默认开）打开时按目标**实际钉数与剩余时长**估计这一梭的减速增益——没钉住的最优先，
 *   到 3 针饱和后仍会为刷新时长或补伤害出手，只是价值降低；正在移动的目标也加分，因为钉刺正好限制脚步。
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

    /** 目标当前真实钉数与剩余时长：按实际层数估计再加一梭的减速增益，而不是「有钉就一律贬值」。 */
    function pinmissileQuills(context: WorldBehavior.Context, target: CompanionBehavior.Entity): { pins: number; remaining: number } {
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        if (actor === null) return { pins: 0, remaining: 0 };
        const effect = MobEffects.read(world, actor, pinMissileQuills);
        return effect === null ? { pins: 0, remaining: 0 } : { pins: effect.amplifier() + 1, remaining: effect.duration() };
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
            if (CompanionBehavior.ai<boolean>(capability, "stick", true)) {
                const quills = pinmissileQuills(context, target);
                if (quills.pins <= 0) score += 6;            // 还没钉住：先把减速挂上，收益最高
                else if (quills.pins < 3) score += 4;        // 未到 3 针饱和：再加一根仍会加深减速
                else if (quills.remaining <= 40) score += 3; // 已饱和但快到期：刷新时长
                else score += 1;                             // 已饱和且还早：只为补伤害，仍不贬到 0
            }
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
        field(pathOf("ai.stick"), "按钉数估值", "boolean", {
            help: "开启：按目标实际钉数与剩余时长估计这一梭的减速增益——没钉住的最优先，未到 3 针仍加分，饱和后只为刷新或补伤害小幅加分；关闭则只按普通攻击排序。不会因为目标可能免疫减速就拒绝出手。"
        })
    ]);
}
