/**
 * 蛛网 的伙伴 AI 用途：这招自己的一套出手计划——把目标一层层裹住，缠到动不了。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase（默认 10）格以内、目标还没被缠到上限。
 *   正在逃跑的目标加分（`ai.catchRunners` 默认开）：它正要离开，一层丝先黏住脚步。
 *   已经缠过一层但还没到上限的目标也值得再补一层（`ai.layerUp` 默认开）——层数越高越难走。
 *   目标身上着火时不出手（`ai.avoidBurning` 默认开）：火会立刻把刚吐上去的丝烧开，白白浪费一次。
 * 对谁出手：当前威胁；已经被缠满层数的跳过。
 * 够不到怎么办：reach 就是吐丝距离，超出先走近；黏丝有飞行时间，掩体挡住时交回共享接近逻辑。
 * 放完之后：目标被裹住、层数越高越走不动，伙伴交回共享顺序继续补层或换目标。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("spiderweb", { ai: { maxChase: 10, layerUp: true, catchRunners: true, avoidBurning: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.layerUp", "补缠已缠目标"),
        PokemonSkills.flag("ai.catchRunners", "优先逃跑目标"),
        PokemonSkills.flag("ai.avoidBurning", "目标着火时不出手"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function spiderwebWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const wrapped = status(context, threat, "trapped");
        if (wrapped && !ai<boolean>(item, "layerUp", true)) return false;
        if (ai<boolean>(item, "avoidBurning", true) && status(context, threat, "burn")) return false;
        return context.facts.focus === threat.ref || distance(self.point, threat.point) <= ai<number>(item, "maxChase", 10);
    }

    registerUse("spiderweb", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || spiderwebWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !spiderwebWants(context, item, target)) return 0;
            if (status(context, target, "trapped")) return 34;
            let value = 44;
            if (ai<boolean>(item, "catchRunners", true) && fleeing(context, target)) value += 18;
            if (context.facts.focus === target.ref) value += 8;
            return Math.min(88, value);
        }
    });
}
