/** 伙伴根据真实主副手与原生携带物判断查封价值，避开已有查封的目标。 */
namespace CompanionBehavior {
    registerFact("world_combat:move_embargo/held", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        const held = NativeItems.heldOf(access, actor);
        return held === null ? "" : held.id;
    });
    /**
     * 这件道具是否真的会被查封影响：走 item_use 门禁的饮食（food 组件）、饮用（potion 组件）、
     * 格挡（盾牌）与蓄弓（弓、弩、三叉戟、奶桶）算数；只拿来砍人的普通剑、斧与盔甲不算，
     * 它们的主用途不经过物品使用入口，封它只会白白占一个出手。
     */
    registerFact("world_combat:move_embargo/sealable", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        const held = NativeItems.heldOf(access, actor);
        if (held === null || !held.id) return false;
        const item = access.item(held.id);
        if (item !== null && (item.hasComponent("minecraft:food") || item.hasComponent("minecraft:potion_contents"))) return true;
        return /(^|:)(bow|crossbow|trident|shield|milk_bucket)$/.test(String(held.id));
    });

    function embargoHeldOf(context: WorldBehavior.Context, target: Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:move_embargo/held", target) || "";
    }
    function embargoSealableOf(context: WorldBehavior.Context, target: Entity): boolean {
        return CompanionBehavior.fact<boolean>(context, "world_combat:move_embargo/sealable", target) === true;
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
            if (embargoHeldOf(context, target) === "") return 24;
            // 能真正被封住的饮食／饮用／格挡／蓄弓才值得优先；只拿普通剑的目标降到低位。
            return embargoSealableOf(context, target) ? 58 : 24;
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
