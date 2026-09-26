/**
 * 龙声鼓舞 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、进入 ai.maxChase 内，且实际 cheerRadius 内有至少一个还没被鼓舞（也没有聚气）的友方
 *   ——只有能罩到人时才值得吼；队友越多越优先。
 * 什么时候最想出手：罩得到的未鼓舞友方 ≥2 时 priority 104（整队收益）越过共享交战次序，只有自己需要时 96。
 * 对谁出手：以自身为中心的一整片，不需要选中队友；由共用任务直接施放。
 * 够不到怎么办：吼的范围就是招式实际的 cheerRadius；威胁太远就先不理会，等它靠近。
 * 放完之后：友方身上的士气按各自 mark 兑现；还在身上时不再重复，已聚气的队友始终跳过。
 * 配置：roar（长啸／短吼）改变半径、时长与节奏；ai.maxChase 决定追多远。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("dragoncheer", { ai: { maxChase: 15, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 28, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 实际鼓舞半径：直接求本招参数，与 execute 用的是同一份 cheerRadius，不再另立一个分离的距离。 */
    function dragoncheerRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = context.services.world;
        if (world) {
            try {
                const value = PokemonSkills.p(PokemonSkills.dragonCheerId, "cheerRadius", world);
                if (typeof value === "number" && isFinite(value) && value > 0) return value;
            } catch (error) { }
        }
        const fallback = item.data && typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : 6;
        return Math.max(2, fallback);
    }
    /** 实际半径内还有多少可以鼓舞的友方（含自己，不含已聚气或已有龙声者）。 */
    function dragoncheerOpen(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context), range = dragoncheerRadius(context, item), nearby = context.facts.nearby as Entity[];
        let count = 0;
        if (!status(context, self, "dragoncheer") && !status(context, self, "focusenergy")) count++;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || !other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > range) continue;
            if (status(context, other, "dragoncheer") || status(context, other, "focusenergy")) continue;
            count++;
        }
        return count;
    }
    function dragoncheerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (context.facts.mounted) return false;
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat || threat.health <= 0 || !threat.visible) return false;
        if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 15)) return false;
        return dragoncheerOpen(context, item) > 0;
    }

    registerUse("dragoncheer", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, item, _purpose, _target) { return dragoncheerWants(context, item); },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) {
            if (!dragoncheerWants(context, item)) return 0;
            return dragoncheerOpen(context, item) >= 2 ? 104 : 96;
        }
    });
}
