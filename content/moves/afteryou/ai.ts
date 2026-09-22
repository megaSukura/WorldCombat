/**
 * 您先请 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有一个看得见的威胁，且身边有正在交战的伙伴（共享伙伴感官已按「队友正在出手或刚受伤」
 *   挑人）；伙伴离自己不超过 ai.maxChase，且身上还没有同一份加速——这份先手让一次就够。
 * 对谁出手：需要先手的伙伴；由共用服务走近到 reach 内再搭引线。
 * 放完之后：伙伴获得一段加速窗口，第一拍出手时会浮出「紧接着行动」；自己背着一段迟滞，窗口内不重复让。
 * 配置：ai.maxChase 限制愿意跑去帮多远；ai.leaveStation 决定驻守时是否离位；lead（催促／托付）由共用配置读取。
 */
namespace PokemonSkills {
    const afteryouChase = number("ai.maxChase", "让手距离", 3, 20, 1);
    afteryouChase.help = "伙伴离自己这个距离以内才考虑让手；调小只在贴身时让，调大愿意主动靠过去。";
    const afteryouLeave = flag("ai.leaveStation", "驻守时允许离位");
    afteryouLeave.help = "开启后，收到驻守命令时也会为让手离开原位。";

    addPreferences(afteryouId, { lead: 1, ai: { maxChase: 10, leaveStation: false } }, [afteryouChase, afteryouLeave]);

    CompanionBehavior.registerUse(afteryouId, {
        protocols: ["world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
            if (target === null) return true;
            const self = CompanionBehavior.source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.status(context, target, afteryouStatus)) return false;
            return CompanionBehavior.distance(self.point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, _item, target) {
            const self = CompanionBehavior.source(context);
            return target.friendly && target.health > 0 && target.visible && String(target.ref) !== String(self.ref)
                && !CompanionBehavior.status(context, target, afteryouStatus);
        },
        priority: function (_context, _item, target) {
            if (target === null) return 0;
            return target.attacking || target.hurtAgo < 60 ? 42 : 22;
        }
    });
}
