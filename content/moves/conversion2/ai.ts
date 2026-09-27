/** 伙伴读的是目标最近真正发生过的进攻，而不是物种配招的静态印象；两条分支各自按实际收益排序。 */
namespace PokemonSkills {
    /** 与执行同源的读取窗口（刻）：只采信最近这么久内的真实进攻。 */
    function conversion2Window(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        return Math.max(40, Math.round(p("conversion2", "memory", {
            world: world, actor: world.source(), skill: skills["conversion2"], detail: { values: capability.data.config }
        })));
    }
    /** 只读、决策内缓存：目标最近的读解结果（真实元素/原生伤害类型/类别/来源），读不到返回 null。 */
    CompanionBehavior.registerFact("world_combat:conversion2-read", function (access: CombatWorld, actor: CombatActor, argument: any) {
        const window = typeof argument === "number" && isFinite(argument) ? argument : 240;
        return conversion2Observe(access, actor, window);
    });

    /** 该元素打在自己当前全属性上的总乘数（相乘，双系一弱一抗会得到中性而不是弱）。 */
    function conversion2Product(context: WorldBehavior.Context, element: string): number {
        const facts = CompanionBehavior.pokemonFacts(context, CompanionBehavior.source(context));
        if (!facts || !facts.types.length) return 1;
        let product = 1;
        for (let index = 0; index < facts.types.length; index++) product *= CobblemonCombat.typeEffectiveness(element, facts.types[index]);
        return product;
    }

    CompanionBehavior.registerUse("conversion2", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point))) return false;
            return true;
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const observed = CompanionBehavior.fact<conversion2Observed>(context, "world_combat:conversion2-read", target,
                conversion2Window(context, capability));
            if (!observed) return 8;
            if (observed.element && conversion2Types.indexOf(observed.element) >= 0) {
                // 宝可梦这一支：总乘数越高（越被打得痛）越值得重织；已经是抗性时不急，中性（双系一弱一抗）既不急也不判弱。
                const product = conversion2Product(context, observed.element);
                if (product >= 4) return 72;
                if (product >= 2) return 60;
                if (product <= 0.5) return 16;
                return 42;
            }
            // 普通生物这一支：真实原生伤害类型总能减伤；正在出手的来源风险更高。
            const risk = !!target.attacking && target.attacking !== context.facts.self.ref;
            return (risk || (typeof target.hurtAgo === "number" && target.hurtAgo <= 60) ? 46 : 40);
        }
    });

    addPreferences("conversion2", {}, [
        field(pathOf("wide"), "重织取向", "boolean", {
            help: "开启：宝可梦在能扛住那一手的属性里挑整体受击面最好的（少露弱点），普通生物改按 25% 减伤并同时罩住常见物理伤害；关闭：宝可梦换成对那一手乘数最低的属性，普通生物单型 50% 减伤，专治这一手。"
        }),
        field(pathOf("ai.maxChase"), "读解距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动读解，先走近；越大越愿意隔着一段距离先改属性。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为读解离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
