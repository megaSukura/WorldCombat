/**
 * 魔法火焰 / mysticalfire —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且落在 `ai.maxChase`（默认 12）格内；这是中远程的一发。
 * 对谁出手：`ai.cutSpecial`（默认开）打开时，优先对特攻高的活体出手——火团命中会点燃并缠住，把它的特攻一层层抽走；
 *   已经缠着缠火的目标降档，避免重复投放；目标正在远离自己时也降档（追上去缠的回报变低）。
 *   关闭则按普通远程攻击排序。
 * 够不到怎么办：交给共享接近逻辑走近到 `reach` 内再吐火；`approachTarget` 让伙伴朝目标靠近。
 * 放完接什么：交回共享交战计划；缠火由托管效果自己维持，伙伴可在缠住后继续其它动作。
 */
namespace PokemonSkills {
    function mysticalfireFleeing(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const vel = CompanionBehavior.velocity(context, target);
        if (!vel) return false;
        const self = CompanionBehavior.source(context).point;
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1;
        return (vel[0] * dx + vel[2] * dz) / length > 0.08;
    }

    /** 完整缠焰要在挣脱距离内：比 leash 更远的命中也只吃到首击。 */
    function mysticalfireLeash(context: WorldBehavior.Context): number {
        return Math.max(4, p("mysticalfire", "leash", CompanionBehavior.world(context)));
    }

    CompanionBehavior.registerUse("mysticalfire", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            const reached = gap <= capability.data.range;
            // 射程内是一发；完整缠焰还要在挣脱距离内，超出就只吃首击。
            let score = reached ? 22 : 0;
            if (reached && gap > mysticalfireLeash(context)) score -= 10;
            if (!CompanionBehavior.ai<boolean>(capability, "cutSpecial", true)) return score;
            const facts = CompanionBehavior.pokemonFacts(context, target);
            const special = facts && typeof facts.specialAttack === "number" ? facts.specialAttack : 0;
            score += Math.min(10, special / 12);
            if (CompanionBehavior.status(context, target, "mysticalfire")) score -= 12;
            if (mysticalfireFleeing(context, target)) score -= 8;
            return score;
        }
    });

    addPreferences("mysticalfire", {}, [
        field(pathOf("linger"), "黏焰式", "boolean", {
            help: "开启：火团更慢更短、起手与冷却更长，但缠身时长 ×1.4、每跳更疼、点燃概率 +0.35，适合缠住一个慢慢磨。关闭：火团更快更远、起手与冷却更短，但缠身与点燃都少。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不吐火，先走近；越大越愿意从远处先手。"
        }),
        field(pathOf("ai.cutSpecial"), "盯高特攻目标", "boolean", {
            help: "开启：对能读到特攻的宝可梦优先挑特攻高的出手；普通生物读不到特攻时按普通远程规则排序。完整缠焰要保持在挣脱距离内，更远的命中也只吃首击，因此过远的目标会降档；已缠火或正在远离的目标同样降档。关闭：一律当普通远程攻击排序。"
        })
    ]);
}
