/**
 * 灵骚 / poltergeist —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，携带持有物，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 目标空手时不参与候选（招式起手即失败），因此 `accepts` 直接以“持有物存在”为准；蓄力间脱手／换物让上一
 * 次操控落空的目标会停顿一段不再被点名。握着武器／盔甲一类装备的目标更靠前。
 * 本招射程远、不接触、威力高但 PP 少，排序排在普通攻击之前，专门用来处理带道具的强敌。
 * `bind` 属于本招配置（命中后缠住减速、本击略轻）。
 */
namespace CompanionBehavior {
    function poltergeistArmed(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.poltergeistHeldOf(world, actor) !== null;
    }

    /** 目标手上那件装备的快照，用于判断“是不是握着武器／盔甲”。 */
    function poltergeistHeldEntry(context: WorldBehavior.Context, subject: WorldMethods.Subject): CombatEquipment | null {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        if (!actor || !world.valid(actor)) return null;
        var held = PokemonSkills.poltergeistHeldOf(world, actor);
        if (held === null) return null;
        var worn = world.equipment(actor);
        for (var i = 0; i < worn.length; i++)
            if (String(worn[i].provider()) === held.provider && String(worn[i].slot()) === held.slot && worn[i].index() === held.index)
                return worn[i];
        return null;
    }

    function poltergeistStalled(context: WorldBehavior.Context, subject: WorldMethods.Subject, target: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context);
        var actor = world.actor(subject.ref), rival = world.actor(target.ref);
        return !!actor && !!rival && PokemonSkills.poltergeistStalledAt(world, actor, rival);
    }

    registerUse("poltergeist", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 12);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (!poltergeistArmed(context, target)) return false;
            return !poltergeistStalled(context, CompanionBehavior.source(context), target);
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            if (!poltergeistArmed(context, target)) return 0;
            var entry = poltergeistHeldEntry(context, target);
            return entry !== null && NativeItems.magneticEquipment(entry) ? 62 : 58;
        }
    });

    PokemonSkills.addPreferences("poltergeist", { ai: { maxChase: 12, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "操纵距离", 4, 16, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
