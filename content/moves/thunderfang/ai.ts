/**
 * 雷电牙 / thunderfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 9）格内；更远交给共享接近逻辑。
 * 对谁出手：本族最快的一口，最适合截住正在跑动的近身进攻者——对速度快的目标抬一档；
 *   已经麻痹的目标、以及合法可读到的电属性天生抗麻者，把这口的控制价值调低（伤害与畏缩照常），
 *   过载式本来就是把预算花在控制上，遇到这两种目标更不该重复投入。
 * 够不到怎么办：牙很短，reach 之内才动手，不够先贴近。
 * 放完之后：麻痹交给共享交战计划，继续按主伤输出。
 */
namespace PokemonSkills {
    function thunderfangWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    /** 这一口还能带来多少控制收益：已麻不再叠加，电属性天生不麻；非宝可梦缺少类型事实时不加不减。 */
    function thunderfangControl(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        if (CompanionBehavior.status(context, target, "paralysis")) return -10;
        const facts = CompanionBehavior.pokemonFacts(context, target);
        if (facts && facts.types && facts.types.indexOf("electric") >= 0) return -12;
        return 0;
    }

    CompanionBehavior.registerUse("thunderfang", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return thunderfangWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !thunderfangWants(context, capability, target)) return 0;
            let score = 21;
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.0025) score += 6;
            const control = thunderfangControl(context, target);
            score += control;
            // 过载式把预算压在控制上，目标已麻或抗麻时再降一档，避免重复花同一份控制收益。
            if (control < 0 && capability.data.config && capability.data.config.overload === true) score -= 6;
            return score;
        }
    });

    addPreferences("thunderfang", {}, [
        field(pathOf("overload"), "过载式", "boolean", {
            help: "开启：麻痹几率 +12%%、麻痹时长 ×1.2，但咬合威力 ×0.88、冷却 +4 刻，控场为主。关闭（点穴式）：咬得更重、循环更快，但麻得更短。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。雷电牙射程很短，设大也常常够不到。"
        })
    ]);
}
