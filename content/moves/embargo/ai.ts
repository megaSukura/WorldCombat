/** 伙伴根据真实主副手与原生携带物判断查封价值，避开已有查封的目标。 */
namespace CompanionBehavior {
    registerFact("world_combat:move_embargo/held", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        const held = NativeItems.heldOf(access, actor);
        return held === null ? "" : held.id;
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
