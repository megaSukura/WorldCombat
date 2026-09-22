/**
 * 精神转移 / psychoshift 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己身上带着一个主异常（否则没东西可推），附近有可见威胁、在 ai.maxChase 以内、有一条通视
 *   直线，对手身上没有异常、也不免疫这种异常——种不上就白推。默认避开种不上的目标。
 * 对谁出手：当前威胁；对手已有异常或免疫该异常时跳过。
 * 候选之间怎么排：灼伤／中毒／剧毒／麻痹这类会持续消耗或限制行动的异常 priority 95，睡眠／冰冻（自己也动不了）
 *   70，其它 45；都不满足则 0。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 * 放完之后：对手接住这份异常、自己干净，交回共享交战计划。
 * 配置 ai.requireTransferable 决定要不要先确认「种得上」；ai.maxChase、ai.leaveStation 决定追多远、驻守是否离位。
 */
namespace CompanionBehavior {
    /** 只读事实：一个战斗者当前的主异常身份（无则空串）。 */
    CompanionBehavior.registerFact("world_combat:psychoshift-major", function (access: CombatWorld, actor: CombatActor): string {
        return CombatStatus.major(access, actor);
    });
    /** 只读事实：目标能否接收这个异常身份（类型／特性免疫，与共享的状态策略同源的手工核对）。 */
    CompanionBehavior.registerFact("world_combat:psychoshift-immune", function (access: CombatWorld, actor: CombatActor, argument: any): number {
        const name = String(argument || "");
        if (!name || String(actor.domain()) !== "cobblemon") return 0;
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(access, actor);
        const inherent: any = { burn: ["fire"], poison: ["poison", "steel"], toxic: ["poison", "steel"], paralysis: ["electric"], frozen: ["ice"], sleep: [] };
        const types = NativeEffects.types(pokemon, state), list: string[] = inherent[name] || [];
        for (let i = 0; i < list.length; i++) if (types.indexOf(list[i]) >= 0) return 1;
        const ability = NativeEffects.ability(pokemon, state);
        if (NativeAbilities.flag(ability, "statusImmune")) return 1;
        if (NativeAbilities.has(ability, "statusImmunities", NativeEffects.nativeName(name))) return 1;
        return 0;
    });

    function psychoshiftMajor(context: WorldBehavior.Context, target: CompanionBehavior.Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:psychoshift-major", target) || "";
    }

    function psychoshiftWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context), name = psychoshiftMajor(context, self);
        if (!name) return false;
        if (CompanionBehavior.status(context, target, name)) return false;
        if (CompanionBehavior.ai<boolean>(item, "requireTransferable", true)
            && CompanionBehavior.fact<number>(context, "world_combat:psychoshift-immune", target, name) === 1) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    registerUse("psychoshift", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return psychoshiftWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null || !psychoshiftWants(context, item, target)) return 0;
            const name = psychoshiftMajor(context, CompanionBehavior.source(context));
            if (name === "burn" || name === "poison" || name === "toxic" || name === "paralysis") return 95;
            if (name === "sleep" || name === "frozen") return 70;
            return 45;
        },
        approach: function (context, _item, target) {
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const here = CompanionBehavior.point(self.point), there = CompanionBehavior.point(target.point);
            if (access.clear(here, there)) return null;
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
            const px = -dz / length, pz = dx / length;
            const options = [[self.point[0] + px * 3, self.point[1], self.point[2] + pz * 3],
                [self.point[0] - px * 3, self.point[1], self.point[2] - pz * 3]];
            for (let i = 0; i < options.length; i++) if (access.clear(CompanionBehavior.point(options[i]), there)) return options[i];
            return null;
        }
    });

    const psychoshiftChase = PokemonSkills.number("ai.maxChase", "转移距离", 3, 24, 1);
    psychoshiftChase.help = "威胁进入这个距离内才考虑转移异常；调大愿意隔着一段距离递过去，调小只在贴身时推。";
    const psychoshiftTransferable = PokemonSkills.flag("ai.requireTransferable", "只推种得上的目标");
    psychoshiftTransferable.help = "开启：对手免疫该异常时不出手，避免白推；关闭：只要对手没有异常就先推过去，免疫留给施放时判定。";
    const psychoshiftStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    psychoshiftStation.help = "开启后，驻守中的伙伴也会离位去转移异常；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("psychoshift", { ai: { maxChase: 12, requireTransferable: true, leaveStation: false } },
        [psychoshiftChase, psychoshiftTransferable, psychoshiftStation]);
}
