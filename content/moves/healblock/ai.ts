/**
 * 回复封锁 / healblock —— AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；没有攻击可用时用它（`world_combat:control-only`），
 *   或作为一次出手前的前置控制。目标是可见、敌对、还活着、不在封锁中、在 `ai.maxChase`（默认 13）格内、
 *   与施法者通视的活体。
 * 对谁出手：当前威胁。`ai.sustain`（默认开启）下，只在目标生命比例高于一半时优先封它的回血——
 *   把封锁留给还撑得住、可能靠续航拖回来的对手；低于一半时优先级降低（更该直接打）。
 * 候选之间怎么排：目标生命越充足，priority 越高（最高 56）；已经封锁中的目标直接跳过，不重复下手。
 * 够不到怎么办：reach 就是本招射程，共享任务先走到能通视的射程再镇；`ai.leaveStation` 决定驻守时是否愿意离位。
 * 放完之后：目标的回血通道被封一段时间，伙伴交回共享交战顺序；镇环到期或被人清除后才会再考虑。
 */
namespace CompanionBehavior {
    function healBlockRatio(target: Entity): number { return target.health / Math.max(1, target.maximum); }

    registerFact("world_combat:healblock/recent", function (access: CombatWorld, actor: CombatActor) {
        return access.effects(actor, PokemonSkills.healBlockObserved).length > 0;
    });
    registerUse("healblock", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (status(context, target, "healblock")) return false;
            if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
            if (distance(source(context).point, target.point) > ai<number>(item, "maxChase", 13)) return false;
            return world(context).clear(point(source(context).point), point(target.point));
        },
        accepts: function (_context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, item, target) {
            if (!target || status(context, target, "healblock")) return 0;
            if (!ai<boolean>(item, "sustain", true)) return 46;
            return fact<boolean>(context, "world_combat:healblock/recent", target) === true ? 76 : 8;
        }
    });

    const healBlockChase = PokemonSkills.number("ai.maxChase", "出手距离", 3, 18, 1);
    healBlockChase.help = "伙伴只对这么远以内的威胁下回复封锁；调小只在贴身时封，调大愿意提前把远处的回血按住。";
    const healBlockSustain = PokemonSkills.flag("ai.sustain", "只封还撑得住的");
    healBlockSustain.help = "开启：只在目标生命比例高于一半时优先封它的回血，把封锁留给可能靠续航拖回来的对手；关闭：任何敌人一视同仁。";
    const healBlockStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    healBlockStation.help = "开启后，收到「驻守」指令时也会离开原位去封锁；关闭则只在原地够得到时出手。";
    PokemonSkills.addPreferences("healblock", { ai: { maxChase: 13, sustain: true, leaveStation: false } },
        [healBlockChase, healBlockSustain, healBlockStation]);
}
