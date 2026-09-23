/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace CompanionBehavior {
    registerFact("world_combat:entrainment-ability", function (access, actor, _argument) {
        return PokemonSkills.entrainmentAbility(access, actor);
    });

    function entrainmentWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 13)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (domain(context, target) !== "cobblemon") {
            if (status(context, target, "entrainment")) return false;
            return target.speed > self.speed;
        }
        if (!pokemonFacts(context, self) || !pokemonFacts(context, target)) return false;
        const mine = fact<string>(context, "world_combat:entrainment-ability", self);
        const theirs = fact<string>(context, "world_combat:entrainment-ability", target);
        if (!mine || !PokemonSkills.entrainmentShareable(mine) || mine === theirs) return false;
        if (!theirs || !PokemonSkills.entrainmentReceivable(theirs)) return false;
        return PokemonSkills.entrainmentLiabilityAbility(mine) || PokemonSkills.entrainmentWorthOverwriting(theirs);
    }

    registerUse("entrainment", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return entrainmentWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            if (!entrainmentWants(context, item, target)) return 0;
            const mine = fact<string>(context, "world_combat:entrainment-ability", source(context));
            return mine && PokemonSkills.entrainmentLiabilityAbility(mine) ? 64 : 30;
        }
    });

    const entrainmentChase = PokemonSkills.number("ai.maxChase", "追击距离", 4, 28, 1);
    entrainmentChase.help = "威胁进入这个距离内才考虑找伙伴；越大越愿意隔着一段距离先踩，调小只在贴身时用。";
    const entrainmentStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    entrainmentStation.help = "开启后，驻守中的伙伴也会离位去改对手特性；关闭则只在原地够得到时出手。";
    const entrainmentWhole = PokemonSkills.flag("whole", "全场节拍");
    entrainmentWhole.help = "开启＝全场节拍：波及半径 ×1.6、维持 ×0.65、冷却 +16 刻，一次改掉围上来的整圈敌人；关闭＝贴身节拍：波及半径 ×0.7、维持 ×1.4、冷却 -10 刻，只盯一个对手、压得更久。覆盖范围与持续时长互相取舍。";

    PokemonSkills.addPreferences("entrainment", { whole: false, ai: { maxChase: 13, leaveStation: false } },
        [entrainmentWhole, entrainmentChase, entrainmentStation]);
}
