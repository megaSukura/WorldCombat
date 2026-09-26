/**
 * 缠绕 / constrict 的 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。这一招伤害很低，价值在控住目标，所以 AI 只在有意义时用它：
 * `ai.preferRunners`（默认开）让正在快速移动或逃跑的目标排得更前——先缠住跑得快的那个；
 * 已经带着 trapped 身份的目标会被跳过（缠住的人再缠一次没有意义）。
 * 攀缠式把施法者按住去维持连接，所以只在附近确有能接着输出的队友、且自己血线还站得住时才用；
 * 绞缠式没有这个前置。
 * 对谁出手：当前威胁；正在攻击自己的目标略优先（缠住它再脱离）。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近。
 * 断藤后连接消失，AI 回到共享交战计划，不保留任何长锁。
 */
namespace PokemonSkills {
    function constrictValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 附近是否有还能接着输出的队友；攀缠式靠它才有意义。就近距探测一次，读关系用世界入口。 */
    function constrictHasAllies(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.health <= 0 || !other.friendly) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= 10) return true;
        }
        const world = CompanionBehavior.world(context);
        const actors = world.query(CompanionBehavior.point(self.point), 10, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.ref()) === String(self.ref) || !world.friendly(other)) continue;
            const view = world.observe(other);
            if (view !== null && view.health() > 0) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("constrict", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (capability.data && capability.data.config && capability.data.config.latch === true) {
                // 攀缠式按住自己换连接，只在有队友接手且自己不会立刻倒下时使用。
                if (!constrictHasAllies(context)) return false;
                if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.3) return false;
            }
            if (!target) return true;
            if (!constrictValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) { return constrictValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 14;
            if (CompanionBehavior.status(context, target, "trapped")) score -= 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferRunners", true)) {
                const motion = CompanionBehavior.velocity(context, target);
                const pace = motion === null ? 0 : Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]);
                if (pace >= 0.16) score += 18;
                else if (pace >= 0.09) score += 9;
            }
            if (target.attacking === CompanionBehavior.source(context).ref) score += 8;
            return score;
        }
    });

    addPreferences("constrict", {}, [
        field(pathOf("latch"), "攀缠式", "boolean", {
            help: "开启：缠得更久、定得久、再多压一级速度，并在束缚期间维持一根能被拉断或隔墙截断的藤连接，但伤害更低，施法者还要分出肢体按住它、自己也一时无法移动（AI 只在附近有队友接手且自身血线站得住时才会用）。关闭（绞缠式）：一记更重更快的硬绞，束缚与定身更短，没有持续连接。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动伸手，先靠近。这一招是贴身控制，调大只在追击时更容易落空。"
        }),
        field(pathOf("ai.preferRunners"), "先缠跑得快的", "boolean", {
            help: "开启：正在快速移动或逃跑的目标优先——先把它按住；关闭：只按威胁与距离排序。"
        })
    ]);
}
