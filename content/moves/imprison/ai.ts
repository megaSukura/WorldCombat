/** imprison：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_imprison/moves", function (access, actor, _argument) {
        return imprisonKnown(access, actor).join(",");
    });
    function imprisonWords(value: string | null): string[] {
        return value === null || value === "" ? [] : String(value).split(",");
    }
    /** 本次配置选定的单一封锁类别。 */
    function imprisonAiCategory(item: WorldBehavior.Capability): string {
        const config = item.data.config;
        return config && config.category === "ranged" ? "ranged" : "contact";
    }
    function imprisonAiKind(category: string): string {
        return category === "ranged" ? "native:ranged" : "native:contact";
    }
    /** 本次决策读出的真实领域半径：特攻、体型与封锁取向都会改变它；AI 只在真正罩得住的范围内数目标。 */
    function imprisonRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const cached = context.scratch.imprisonRadius;
        if (typeof cached === "number") return cached;
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        const value = actor ? p(imprisonId, "imprisonRadius",
            { world: world, actor: actor, skill: skills[imprisonId], detail: { values: item.data.config || {} } }) : 0;
        const radius = isFinite(value) && value > 0 ? value : 6;
        context.scratch.imprisonRadius = radius;
        return radius;
    }
    /** 这名敌人是否真的带着所选类别的直接进攻方式：宝可梦按当前招式表，普通生物按最近一次真实攻击。 */
    function imprisonEnemyMatches(context: WorldBehavior.Context, item: WorldBehavior.Capability, other: CompanionBehavior.Entity): boolean {
        const kind = imprisonAiKind(imprisonAiCategory(item));
        return imprisonWords(CompanionBehavior.fact<string>(context, "world_combat:move_imprison/moves", other)).indexOf(kind) >= 0;
    }
    /** 施法者是否还有另一类别的直接进攻可用：自方代价才不会把自己的输出全锁死，AI 才愿意开圈。 */
    function imprisonSelfSwitch(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const other = imprisonAiKind(imprisonAiCategory(item) === "ranged" ? "contact" : "ranged");
        return imprisonWords(CompanionBehavior.fact<string>(context, "world_combat:move_imprison/moves", CompanionBehavior.source(context))).indexOf(other) >= 0;
    }
    /** 落在真实领域半径内、可见、且带着所选类别攻击方式的敌对个体数量。没有近期记录不算收益，也不当作永久免疫。 */
    function imprisonOverlaps(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const radius = imprisonRadius(context, item);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 14);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            const gap = CompanionBehavior.distance(self.point, other.point);
            if (gap > radius || gap > limit) continue;
            if (imprisonEnemyMatches(context, item, other)) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(imprisonId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
            if (CompanionBehavior.status(context, CompanionBehavior.source(context), imprisonStatus)) return false;
            if (!imprisonSelfSwitch(context, item)) return false;
            return imprisonOverlaps(context, item) > 0;
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(CompanionBehavior.source(context).ref); },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, item, _target) {
            return context.senses["world_combat:threat"] && imprisonOverlaps(context, item) > 0 ? 80 : 0;
        }
    });

    addPreferences(imprisonId, { scope: 1, category: "contact", ai: { maxChase: 14, leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 4, 26, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
