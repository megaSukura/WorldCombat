/** 目标选择跟随每个受支持的宝可梦或原生世界分支，以及配置的追击策略。 */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标上一手在窗口内且可被描摹；返回招式 id 或 ""。参数为记忆窗口刻数。 */
    CompanionBehavior.registerFact("world_combat:sketch-last", function (access, actor, argument) {
        return sketchRead(access, actor, typeof argument === "number" ? argument : 1200);
    });
    /** 只读、决策内缓存：施法者是否已经拥有某一手（参数为招式 id）。 */
    CompanionBehavior.registerFact("world_combat:sketch-knows", function (access, actor, id) {
        return String(actor.domain()) === "cobblemon" && sketchKnows(access, CobblemonCombat.pokemon(actor), String(id));
    });

    CompanionBehavior.registerUse("sketch", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            // 永久改槽必须由玩家授权：对某目标下达了明确指令（focus），或在个体设置里开启「允许自主永久学习」。
            // 两者皆无（默认）时 AI 绝不自行落笔，玩家亲自描摹不受影响。
            const authorized = !!context.facts.focus && String(context.facts.focus) === target.ref
                || CompanionBehavior.ai<boolean>(capability, "permanent", false);
            if (!authorized) return false;
            // 目标或同伴都可能是示范者；只在真读到缺少且够用的可复制招式时才推荐。
            if (target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            const access = CompanionBehavior.world(context);
            if (!access.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            const caster = access.actor(self.ref);
            const demonstrator = access.actor(target.ref);
            if (!caster || !demonstrator) return false;
            const window = sketchWindow(access, caster);
            const id = CompanionBehavior.fact<string>(context, "world_combat:sketch-last", target, window);
            if (!id) return false;
            if (CompanionBehavior.fact<boolean>(context, "world_combat:sketch-knows", self, id)) return false;
            // minPower 只作候选建议：它不在这里拦截，交给 priority 排序。
            return true;
        },
        accepts: function (_context, _capability, target) {
            return target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const access = CompanionBehavior.world(context);
            const caster = access.actor(self.ref);
            const demonstrator = access.actor(target.ref);
            if (!caster || !demonstrator) return 0;
            const id = CompanionBehavior.fact<string>(context, "world_combat:sketch-last", target, sketchWindow(access, caster));
            if (!id) return 12;
            const info = CobblemonCombat.moveTemplate(id);
            if (String(info.category()) === "status") return 45;
            const floor = CompanionBehavior.ai<number>(capability, "minPower", 50);
            return info.power() >= floor + 30 ? 70 : info.power() >= floor ? 54 : 36;
        }
    });

    addPreferences("sketch", { ai: { minPower: 50, maxChase: 8, leaveStation: false, permanent: false } }, [
        field(pathOf("ai.permanent"), "允许自主永久学习", "boolean", {
            help: "开启后，伙伴会在遇到值得描摹的招时自行落笔、永久改写招式格；关闭（默认）时绝不自主永久改槽，只有玩家亲自描摹才学习。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位为描摹出手；关闭则只在原地够得到时出手。"
        }),
        field(pathOf("ai.minPower"), "描摹威力门槛", "number", {
            min: 0, max: 150, step: 5,
            help: "伤害类招式威力不低于这个值的候选排得更前（状态类招式不受限）。写生只有一次机会，调高更愿意等真正的好招。它只影响排序，不阻止对玩家指定目标的描摹。"
        }),
        field(pathOf("ai.maxChase"), "描摹距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动落笔，先走近；越大越愿意从远处先描一手。"
        })
    ]);
}
