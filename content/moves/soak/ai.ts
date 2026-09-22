/**
 * 浸水 / soak 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、够得着（ai.maxChase 内）、视线畅通的宝可梦威胁，而且它不是纯水属性——
 *   只有这种目标才浇得进去。没有属性的生物（原版生物、玩家）没有可换的属性，跳过。
 * 什么时候最想出手：目标带地面属性时 priority 抬到 78——浇成水就摘掉它的电免疫，是队友电招的口子；
 *   带火或岩石时 70，浇成水直接打开雷／草的弱点、同时封掉它自己的火／地本系；其余单／双属性目标 58。
 * 对谁出手：当前威胁；已经带着 soak 身份、或者没有属性的目标跳过，避免浪费 20 发 PP。
 * 够不到怎么办：reach 就是浇淋距离，由共享接近逻辑把身体带进范围；视线被挡或距离不够时不急。
 * 放完之后：水属性挂在目标身上、属性层随即生效；水还在时不重复浇。
 * 配置：ai.maxChase 限制考虑距离；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    const soakFlood = PokemonSkills.flag("flood", "漫流");
    soakFlood.help = "开启＝漫流：一次浇透目标与身边一圈人、铺出更广的湿泥，但每只维持更短、起手与冷却更久；关闭＝细浇：只盯一个目标，维持更久、出手更快更便宜。覆盖与持续互相取舍。";
    const soakChase = PokemonSkills.number("ai.maxChase", "考虑距离", 2, 18, 1);
    soakChase.help = "伙伴只在威胁离自己这么远以内时才考虑浇它；调小只在贴身时用，调大愿意先追过去。";
    const soakStation = PokemonSkills.flag("ai.leaveStation", "驻守时离位");
    soakStation.help = "开启后，收到「驻守」指令时也会离开原位去浇目标。";

    PokemonSkills.addPreferences("soak", { flood: false, ai: { maxChase: 11, leaveStation: false } },
        [soakFlood, soakChase, soakStation]);

    /** 有属性可换、且不是纯水的宝可梦才浇得进去；事实缺失（非宝可梦）一律跳过。 */
    function soakEligible(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        if (!facts || !Array.isArray(facts.types) || facts.types.length === 0) return false;
        return facts.types.join(",") !== "water";
    }

    function soakWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "soak")) return false;
        if (!soakEligible(context, threat)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 11)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("soak", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || soakWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !soakWants(context, item, target)) return 0;
            const facts = pokemonFacts(context, target);
            if (!facts || !Array.isArray(facts.types)) return 0;
            if (facts.types.indexOf("ground") >= 0) return 78;
            if (facts.types.indexOf("fire") >= 0 || facts.types.indexOf("rock") >= 0) return 70;
            return 58;
        }
    });
}
