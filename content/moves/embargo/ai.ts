/**
 * 查封 / embargo —— AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带查封的伙伴在没有攻击可用时用它（`world_combat:control-only`），
 *   或者作为一次出手前的前置控制。目标是可见、敌对、还活着、不在查封中、在 `ai.maxChase`（默认 12）格内、
 *   与施法者通视的活体。
 * 对谁出手：当前威胁。`ai.denyItems`（默认开启）只对身上带着道具的目标出手——查封正是冲着它们去的；
 *   关闭后对空手目标也照封（封住它「收到道具」这条路）。
 * 候选之间怎么排：目标持物时 priority 58，空手时 24；已经查封中的目标直接跳过，不重复下手。
 * 够不到怎么办：reach 就是本招射程，共享任务先走到能通视的射程再封；`ai.leaveStation` 决定驻守时是否愿意离位。
 * 放完之后：目标的道具通道被按住一段时间，伙伴交回共享交战顺序；印记到期或被人清除后才会再考虑。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_embargo/held", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        if (String(actor.domain()) !== "cobblemon") return "";
        return String(CobblemonCombat.pokemon(actor).heldItem()).replace("cobblemon:", "");
    });

    function embargoHeldOf(context: WorldBehavior.Context, target: Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:move_embargo/held", target) || "";
    }

    registerUse("embargo", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (status(context, target, "embargo")) return false;
            if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
            if (distance(source(context).point, target.point) > ai<number>(item, "maxChase", 12)) return false;
            if (ai<boolean>(item, "denyItems", true) && embargoHeldOf(context, target) === "") return false;
            return world(context).clear(point(source(context).point), point(target.point));
        },
        accepts: function (_context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, _item, target) {
            if (!target || status(context, target, "embargo")) return 0;
            return embargoHeldOf(context, target) !== "" ? 58 : 24;
        }
    });

    const embargoChase = PokemonSkills.number("ai.maxChase", "出手距离", 3, 16, 1);
    embargoChase.help = "伙伴只对这么远以内、且身上带着道具的目标下查封；调小只在贴身时封，调大愿意提前按住远处的持物目标。";
    const embargoDeny = PokemonSkills.flag("ai.denyItems", "只对付持物者");
    embargoDeny.help = "开启：只有目标身上带着道具时才出手，作为专门的封物手段；关闭：空手目标也照封，堵住它接收道具的路。";
    const embargoStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    embargoStation.help = "开启后，收到「驻守」指令时也会离开原位去查封；关闭则只在原地够得到时出手。";
    PokemonSkills.addPreferences("embargo", { ai: { maxChase: 12, denyItems: true, leaveStation: false } },
        [embargoChase, embargoDeny, embargoStation]);
}
