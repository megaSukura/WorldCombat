/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace CompanionBehavior {
    registerFact("world_combat:simplebeam-ability", function (access, actor, _argument) {
        return PokemonSkills.simplebeamAbility(access, actor);
    });

    const simplebeamWave = PokemonSkills.flag("wave", "念波扩散");
    simplebeamWave.help = "开启＝念波扩散：光束在目标处炸开，把附近一圈可改写的宝可梦一起改简单，但每层维持 ×0.6、冷却 +18 刻；关闭＝单束：只打一个目标、维持 ×1.35、冷却 −8 刻。覆盖与持续互相取舍。";
    const simplebeamChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 20, 1);
    simplebeamChase.help = "伙伴只在威胁离自己这么远以内时才考虑发念波；调小只在贴身时用，调大愿意先追过去。";
    const simplebeamStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    simplebeamStation.help = "开启后，收到「驻守」指令时也会离开原位去发念波。";

    PokemonSkills.addPreferences("simplebeam", { wave: false, ai: { maxChase: 13, leaveStation: false } },
        [simplebeamWave, simplebeamChase, simplebeamStation]);

    var simplebeamTrouble = ["wonderguard", "multiscale", "magicguard", "levitate", "flashfire", "waterabsorb",
        "voltabsorb", "sapsipper", "sturdy", "disguise", "thickfat", "filter", "regenerator", "immunity",
        "hydration", "overcoat", "intimidate", "prankster", "dazzling", "queenlymajesty", "armortail"];

    function simplebeamWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "simplebeam")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (domain(context, threat) !== "cobblemon") return world(context).clear(point(self.point), point(threat.point));
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        const ability = fact<string>(context, "world_combat:simplebeam-ability", threat);
        return ability !== null && PokemonSkills.simplebeamReceivable(ability);
    }

    registerUse("simplebeam", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || simplebeamWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !simplebeamWants(context, item, target)) return 0;
            const ability = fact<string>(context, "world_combat:simplebeam-ability", target);
            return ability !== null && simplebeamTrouble.indexOf(ability) >= 0 ? 76 : 60;
        }
    });
}
