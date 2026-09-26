/** 镜面属性的伙伴 AI：在当前威胁面前挑一个能真正提升自身防御的来源，不只会照眼前的攻击者。 */
namespace CompanionBehavior {
    registerFact("world_combat:reflecttype-types", function (access, actor, _argument) {
        return PokemonSkills.reflecttypeRead(access, actor);
    });
    registerFact("world_combat:reflecttype-defence", function (access, actor, argument) {
        const pair = !!argument;
        return CombatCopies.read(access, actor, pair ? CombatCopies.defence : [CombatCopies.defence[0]]);
    });

    /** 威胁当前属性；读不出（非宝可梦或没有属性）就返回 null，不据此宣称更优。 */
    function reflecttypeThreatTypes(context: WorldBehavior.Context): string[] | null {
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat || threat.health <= 0 || domain(context, threat) !== "cobblemon") return null;
        const types = fact<string[]>(context, "world_combat:reflecttype-types", threat);
        return types && types.length ? types : null;
    }

    /** 一组防御属性面对威胁属性时的综合承伤倍率；越低说明这一面越硬。 */
    function reflecttypeIncoming(threatTypes: string[], defenceTypes: string[]): number {
        let factor = 1;
        for (let i = 0; i < threatTypes.length; i++)
            for (let j = 0; j < defenceTypes.length; j++) factor *= CobblemonCombat.typeEffectiveness(threatTypes[i], defenceTypes[j]);
        return factor;
    }

    /** 照住这个来源能把承伤倍率降多少；非宝可梦来源按可读防御事实的净提升算。不支持的来源返回 0。 */
    function reflecttypeImprovement(context: WorldBehavior.Context, item: WorldBehavior.Capability, candidate: Entity, threatTypes: string[] | null): number {
        const self = source(context), pair = !!(item.data.config && item.data.config.pair);
        if (domain(context, candidate) === "cobblemon") {
            if (threatTypes === null) return 0;
            const offered = fact<string[]>(context, "world_combat:reflecttype-types", candidate);
            const mine = fact<string[]>(context, "world_combat:reflecttype-types", self);
            if (!offered || !offered.length || !mine || !mine.length) return 0;
            const chosen = PokemonSkills.reflecttypeChoose(offered, pair);
            if (!chosen.length || chosen.slice().sort().join(",") === mine.slice().sort().join(",")) return 0;
            return reflecttypeIncoming(threatTypes, mine) - reflecttypeIncoming(threatTypes, chosen);
        }
        const own = fact<CombatCopies.Values>(context, "world_combat:reflecttype-defence", self, pair);
        const theirs = fact<CombatCopies.Values>(context, "world_combat:reflecttype-defence", candidate, pair);
        if (!own || !theirs) return 0;
        let gain = 0;
        Object.keys(theirs).forEach(function (id) {
            const current = own[id];
            if (typeof current === "number" && theirs[id] > current + 0.0001) gain += theirs[id] - current;
        });
        return gain;
    }

    function reflecttypeSourceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, candidate: Entity): boolean {
        if (candidate.health <= 0 || !candidate.visible || candidate.ref === source(context).ref) return false;
        const self = source(context);
        if (candidate.ref !== context.facts.focus && distance(self.point, candidate.point) > ai<number>(item, "maxChase", 12)) return false;
        if (!world(context).clear(point(self.point), point(candidate.point))) return false;
        const threatTypes = reflecttypeThreatTypes(context);
        return reflecttypeImprovement(context, item, candidate, threatTypes) > 0.01;
    }

    /** 这个个体可用的镜面属性能力；用于自定义目标方法。 */
    function reflecttypeCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = WorldBehavior.capabilities(context, "world_combat:mirror-source");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "reflecttype") return items[i];
        return null;
    }

    /** 在附近所有可见对象里挑一个承伤降低最多、同样近的来源；没有就返回 null。 */
    function reflecttypeBestSource(context: WorldBehavior.Context): Entity | null {
        const item = reflecttypeCapability(context);
        if (!item) return null;
        const threatTypes = reflecttypeThreatTypes(context);
        const self = source(context);
        let best: Entity | null = null, bestScore = 0.01;
        (context.facts.nearby as Entity[]).forEach(function (candidate) {
            if (candidate.health <= 0 || !candidate.visible || candidate.ref === self.ref) return;
            if (distance(self.point, candidate.point) > ai<number>(item, "maxChase", 12)) return;
            if (!world(context).clear(point(self.point), point(candidate.point))) return;
            const score = reflecttypeImprovement(context, item, candidate, threatTypes);
            if (score > bestScore || score === bestScore && best !== null && distance(self.point, candidate.point) < distance(self.point, best.point)) {
                best = candidate; bestScore = score;
            }
        });
        return best;
    }

    registerUse("reflecttype", {
        protocols: ["world_combat:mirror-source"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return false;
            return reflecttypeSourceWants(context, item, target);
        },
        accepts: function (context, item, target) { return reflecttypeSourceWants(context, item, target); },
        priority: function (context, item, target) {
            if (target === null || !reflecttypeSourceWants(context, item, target)) return 0;
            return 50;
        }
    });

    registry.goal({ id: "world_combat:move_reflecttype/goal", propose: function (context) {
        const best = reflecttypeBestSource(context);
        return best === null ? [] : [{ id: "world_combat:move_reflecttype:" + best.ref, kind: "world_combat:move_reflecttype", data: { ref: best.ref } }];
    } });
    registry.method({ id: "world_combat:move_reflecttype/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_reflecttype") return [];
            const item = reflecttypeCapability(context), candidate = entity(context, String(goal.data.ref));
            if (!item || !candidate || !reflecttypeSourceWants(context, item, candidate)) return [];
            return [{ id: item.id, data: { ref: String(goal.data.ref) }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0], ref = String(choice.goal.data.ref);
            return castNode(item.id, "mirror", function (current) { return entity(current, ref); });
        }
    });
    orderGoals("world_combat:move_reflecttype/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_reflecttype");
    });

    const reflecttypeChase = PokemonSkills.number("ai.maxChase", "寻找距离", 3, 26, 1);
    reflecttypeChase.help = "在自身周围这个距离内寻找值得照的对象；越大越愿意走来走去借更硬的一面，调小只在贴身范围内找。";
    const reflecttypeStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    reflecttypeStation.help = "开启后，驻守中的伙伴也会离位去照一个更好的来源；关闭则只在原地够得到的对象里挑。";
    const reflecttypePair = PokemonSkills.flag("pair", "镜像全部属性");
    reflecttypePair.help = "开启＝镜像全部：连副属性一起抄，维持 ×1.25、冷却 +14 刻；关闭＝只取主属：更便宜、冷却少 8 刻，能避开副属性带来的额外弱点。";

    PokemonSkills.addPreferences("reflecttype", { pair: false, ai: { maxChase: 12, leaveStation: false } },
        [reflecttypePair, reflecttypeChase, reflecttypeStation]);
}
