/**
 * 精神转移 / psychoshift 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己身上带着一个主异常、且它确实是共享 transferMajor 受理的默认主异常载体（否则推不动），
 *   附近有可见威胁、在 ai.maxChase 以内、有一条通视直线，对手身上没有异常、也不免疫这种异常——种不上就白推。
 *   默认避开种不上的目标。
 * 对谁出手：当前威胁；对手已有异常或免疫该异常时跳过。
 * 候选之间怎么排：灼伤／中毒／剧毒／麻痹这类会持续消耗或限制行动的异常 priority 95，其它 45；睡眠／冰冻会让
 *   自己无法行动、本来就走不完起手，不作为优先项。
 * 够不到怎么办：reach 就是本招射程（由特攻与体型决定）；共享任务先走近，approach 在无通视时侧移找角度。
 *   驻守（hold／stay）且 ai.leaveStation 关闭时只禁止离位去追：目标已在射程内仍可原地转移，够不到才放弃。
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
        if (!name) return 0;
        const definition = CombatStatus.defaultCarrier(name); if (!definition) return 1;
        return CombatStatus.allowed(access, actor, name, 1, definition.amplifier, { effect: definition.effect }).allowed ? 0 : 1;
    });
    /** 只读事实：自己身上这份载体能被共享 transferMajor 原子转手（默认主异常载体、未被 identity_only 借壳）。 */
    CompanionBehavior.registerFact("world_combat:psychoshift-transferable", function (access: CombatWorld, actor: CombatActor, argument: any): number {
        const name = CombatStatus.normalize(String(argument || ""));
        if (!name) return 0;
        const definition = CombatStatus.majors[name]; if (!definition) return 0;
        const source = CombatStatus.representative(access, actor, name, true);
        if (!source) return 0;
        return String(source.id()) === String(definition.effect) && !source.tagged(CombatStatus.identityOnly) ? 1 : 0;
    });

    function psychoshiftMajor(context: WorldBehavior.Context, target: CompanionBehavior.Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:psychoshift-major", target) || "";
    }

    function psychoshiftWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        const self = CompanionBehavior.source(context), name = psychoshiftMajor(context, self);
        if (!name) return false;
        // 只有默认主异常载体才转得动；同标签的模组自定义载体不在共享 transferMajor 的受理范围。
        if (CompanionBehavior.fact<number>(context, "world_combat:psychoshift-transferable", self, name) !== 1) return false;
        if (psychoshiftMajor(context, target)) return false;
        if (CompanionBehavior.ai<boolean>(item, "requireTransferable", true)
            && CompanionBehavior.fact<number>(context, "world_combat:psychoshift-immune", target, name === "poison" && item.data.config && item.data.config.deep === true ? "toxic" : name) === 1) return false;
        const distance = CompanionBehavior.distance(self.point, target.point);
        // 驻守只限制离位：目标已在射程内就在原地转，够不到才放弃。
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)
            && distance > item.data.range) return false;
        if (context.facts.focus !== target.ref && distance > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
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
            // 睡眠／冰冻会让自己无法行动，本来就走不完起手，不作为优先项。
            if (name === "burn" || name === "poison" || name === "toxic" || name === "paralysis") return 95;
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
