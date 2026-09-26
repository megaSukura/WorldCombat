/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace CompanionBehavior {
    registerFact("world_combat:entrainment-ability", function (access, actor, _argument) {
        return PokemonSkills.entrainmentAbility(access, actor);
    });

    /** 两个可读移动速度；任一方读不出就返回 null（不虚构同步）。 */
    function entrainmentSpeeds(context: WorldBehavior.Context, target: Entity): { mine: number; theirs: number } | null {
        const mine = speed(context, source(context)), theirs = speed(context, target);
        return mine === null || theirs === null ? null : { mine: mine, theirs: theirs };
    }

    /** 对普通生物：慢的自己把快的对手拉慢；对宝可梦：递出负担特性或顶掉值得顶的特性。 */
    function entrainmentEnemyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (status(context, target, "entrainment")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (domain(context, target) !== "cobblemon") {
            const speeds = entrainmentSpeeds(context, target);
            return speeds !== null && speeds.theirs > speeds.mine * 1.05;
        }
        const mine = fact<string>(context, "world_combat:entrainment-ability", self);
        const theirs = fact<string>(context, "world_combat:entrainment-ability", target);
        if (!mine || !PokemonSkills.entrainmentShareable(mine) || mine === theirs) return false;
        if (!theirs || !PokemonSkills.entrainmentReceivable(theirs)) return false;
        return PokemonSkills.entrainmentLiabilityAbility(mine) || PokemonSkills.entrainmentWorthOverwriting(theirs);
    }

    /** 对伙伴：只把自己的强特性传出去，或把慢伙伴的步速拉到自己这一档；不反向拖动。 */
    function entrainmentFriendWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (target.health <= 0 || !target.friendly || !target.visible || target.ref === source(context).ref) return false;
        if (status(context, target, "entrainment")) return false;
        const self = source(context);
        if (distance(self.point, target.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (domain(context, target) !== "cobblemon") {
            const speeds = entrainmentSpeeds(context, target);
            return speeds !== null && speeds.mine > speeds.theirs * 1.05;
        }
        const mine = fact<string>(context, "world_combat:entrainment-ability", self);
        const theirs = fact<string>(context, "world_combat:entrainment-ability", target);
        if (!mine || !theirs || mine === theirs) return false;
        if (!PokemonSkills.entrainmentShareable(mine) || !PokemonSkills.entrainmentReceivable(theirs)) return false;
        return PokemonSkills.entrainmentWorthOverwriting(mine);
    }

    function entrainmentWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        return target.friendly ? entrainmentFriendWants(context, item, target) : entrainmentEnemyWants(context, item, target);
    }

    registerUse("entrainment", {
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return entrainmentWants(context, item, target);
        },
        accepts: function (context, item, target) { return target.health > 0 && target.visible && entrainmentWants(context, item, target); },
        priority: function (context, item, target) {
            if (target === null || !entrainmentWants(context, item, target)) return 0;
            if (target.friendly) return 60;
            const mine = fact<string>(context, "world_combat:entrainment-ability", source(context));
            return mine && PokemonSkills.entrainmentLiabilityAbility(mine) ? 64 : 30;
        }
    });

    const entrainmentChase = PokemonSkills.number("ai.maxChase", "追击距离", 4, 28, 1);
    entrainmentChase.help = "对象进入这个距离内才考虑找伙伴；越大越愿意隔着一段距离先踩，调小只在贴身时用。";
    const entrainmentStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    entrainmentStation.help = "开启后，驻守中的伙伴也会离位去改对手特性或同步伙伴；关闭则只在原地够得到时出手。";
    const entrainmentSnap = PokemonSkills.flag("snap", "紧拍");
    entrainmentSnap.help = "开启＝紧拍：步速拉得更近（同步比例 ×1.3）、维持 ×0.7、冷却 +12 刻，逼对手立刻跟拍；关闭＝缓拍：拉得松些（×0.75）、维持 ×1.3、冷却 -8 刻，压得更久但贴得没那么死。贴近程度与持续时间互相取舍。";

    PokemonSkills.addPreferences("entrainment", { snap: false, ai: { maxChase: 13, leaveStation: false } },
        [entrainmentSnap, entrainmentChase, entrainmentStation]);
}
