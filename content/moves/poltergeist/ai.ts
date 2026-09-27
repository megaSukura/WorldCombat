/**
 * 灵骚 / poltergeist —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，携带持有物（本招起手即失败的条件，空手不参与候选），
 * 且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。蓄力间脱手／换物让上一次操控落空的目标会停顿一段不再被点名。
 * 对谁出手：幽灵系打不动的属性（例如一般系）免疫这一记，AI 不为它隔空召灵；普通 MC 生物没有属性事实，按可打处理。
 * 分数怎么看：持物可用性 + 目标身侧那半步侧甩空间 + 目标是否免疫。灵影从手边荡出再侧绕回撞，身侧无空档时下调，
 *   但墙只是让灵影在真实接触处停下，不是不能出手。任何持有物都同样能被召成灵影，磁性不作为额外收益。
 * 本招射程远、不接触、威力高但 PP 少，排序排在普通攻击之前，专门用来处理带道具的强敌。
 */
namespace CompanionBehavior {
    function poltergeistArmed(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.poltergeistHeldOf(world, actor) !== null;
    }

    /** 幽灵系打不到的属性（例如一般系）；没有属性事实的普通生物不算免疫。 */
    function poltergeistImmune(target: CompanionBehavior.Entity): boolean {
        const types = target.facts && target.facts.types;
        if (!types || !types.length) return false;
        for (let index = 0; index < types.length; index++) if (CobblemonCombat.typeEffectiveness("ghost", types[index]) === 0) return true;
        return false;
    }

    /** 目标身侧那半步侧甩空间：灵影从手边荡出，再侧绕回撞；贴墙时留给它绕行的空档变窄。 */
    CompanionBehavior.registerFact("world_combat:move_poltergeist/room", function (access, actor) {
        const self = access.observe(access.source()), body = access.observe(actor);
        if (!self || !body) return true;
        const delta = body.position().minus(self.position()), flat = CompanionBehavior.point([delta.x(), 0, delta.z()]);
        const forward = flat.length() < 0.01 ? CompanionBehavior.point([1, 0, 0]) : flat.unit();
        const side = CompanionBehavior.point([-forward.z(), 0, forward.x()]);
        const probe = body.position().plus(side.scale(body.width() * 0.5 + 0.9)).plus(CompanionBehavior.point([0, 0.4, 0]));
        return access.freeSpace(probe, 0.7, 0.7) || WorldGeometry.blockHit(access, body.position(), probe) === null;
    });

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
            if (poltergeistImmune(target)) return false;
            if (!poltergeistArmed(context, target)) return false;
            return !poltergeistStalled(context, CompanionBehavior.source(context), target);
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            if (poltergeistImmune(target)) return 0;
            if (!poltergeistArmed(context, target)) return 0;
            // 身侧没有半步空档就下调：灵影会在墙边提前磕停，但仍能出手。
            if (CompanionBehavior.fact<boolean>(context, "world_combat:move_poltergeist/room", target) === false) return 30;
            return 58;
        }
    });

    PokemonSkills.addPreferences("poltergeist", { ai: { maxChase: 12, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "操纵距离", 4, 16, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
