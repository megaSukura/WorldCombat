/**
 * 森林诅咒 / forestscurse 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）、视线畅通的宝可梦威胁，它是单属性且不是草属性——
 *   只有这种目标才装得下追加的草属性。双属性（装不下第三条）或已有草属性的目标跳过。
 * 什么时候最想出手：目标是水／地面时 priority 抬到 76——追加草就是四倍弱点；水、地面或岩石时 68，
 *   草属性直接打开它的弱点；其余单属性目标 58。
 * 对谁出手：当前威胁；已经带着 forestscurse 身份的目标跳过，不重复种。
 * 够不到怎么办：reach 就是种咒距离，由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：草属性挂在目标身上、属性层随即生效；诅咒还在时不重复种。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    const forestscurseRooted = PokemonSkills.flag("rooted", "深根");
    forestscurseRooted.help = "开启＝深根：诅咒时长 ×1.7、苔圈 ×1.35、苔痕 ×1.8，但起手 +3 刻、冷却 +20 刻；关闭＝浅咒：起手快、冷却 −10 刻，只留一小块苔、维持更短。持续与出手频率互相取舍。";
    const forestscurseChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 18, 1);
    forestscurseChase.help = "伙伴只在威胁离自己这么远以内时才考虑种诅咒；调小只在贴身时用，调大愿意先追过去。";
    const forestscurseStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    forestscurseStation.help = "开启后，收到「驻守」指令时也会离开原位去种诅咒。";

    PokemonSkills.addPreferences("forestscurse", { rooted: false, ai: { maxChase: 11, leaveStation: false } },
        [forestscurseRooted, forestscurseChase, forestscurseStation]);

    /** 单属性、非草的宝可梦才种得上；事实缺失（非宝可梦）与双属性一律跳过。 */
    function forestscurseEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = combatStats(context, target);
        if (!facts || !Array.isArray(facts.types)) return false;
        return facts.types.length > 0 && facts.types.length < 3 && facts.types.indexOf("grass") < 0;
    }

    function forestscurseWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "forestscurse")) return false;
        if (!forestscurseEligible(context, threat)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("forestscurse", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || forestscurseWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !forestscurseWants(context, item, target)) return 0;
            const facts = pokemonFacts(context, target);
            if (!facts || !Array.isArray(facts.types)) return 0;
            if (facts.types.indexOf("water") >= 0 && facts.types.indexOf("ground") >= 0) return 76;
            if (facts.types.indexOf("water") >= 0 || facts.types.indexOf("ground") >= 0 || facts.types.indexOf("rock") >= 0) return 68;
            return 58;
        }
    });
}
