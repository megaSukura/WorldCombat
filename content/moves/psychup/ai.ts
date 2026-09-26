/** psychup：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    /** 只读、决策内缓存：一个战斗者当前的能力阶梯 JSON。 */
    registerFact("world_combat:psychup-stages", function (access, actor, _argument) {
        return JSON.stringify(PokemonSkills.psychupStages(access, actor));
    });

    registerFact("world_combat:psychup-native", function (access, actor) {
        return JSON.stringify(MobEffects.native(access, actor, "beneficial").map(effect => ({ id: String(effect.id()), amplifier: effect.amplifier() })));
    });

    /** Actual net gain of aligning to `target`: stages moved and potion effects gained, minus stages lost. */
    interface PsychupAssessment { changed: number; gain: number; loss: number; net: number; }

    function psychupAssess(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): PsychupAssessment | null {
        const self = source(context);
        const rawTarget = fact<string>(context, "world_combat:psychup-stages", target);
        const rawSelf = fact<string>(context, "world_combat:psychup-stages", self);
        if (rawTarget === null || rawSelf === null) return null;
        const targetStages: { [stat: string]: number } = JSON.parse(rawTarget);
        const selfStages: { [stat: string]: number } = JSON.parse(rawSelf);
        const selective = !!(item.data.config && item.data.config.selective);
        let changed = 0, gain = 0, loss = 0;
        for (let index = 0; index < PokemonSkills.psychupStats.length; index++) {
            const stat = PokemonSkills.psychupStats[index];
            const delta = (targetStages[stat] || 0) - (selfStages[stat] || 0);
            if (delta === 0) continue;
            changed++;
            if (delta > 0) gain += delta; else loss += -delta;
        }
        const targetEffects: { id: string; amplifier: number }[] = JSON.parse(fact<string>(context, "world_combat:psychup-native", target) || "[]");
        const ownEffects: { id: string; amplifier: number }[] = JSON.parse(fact<string>(context, "world_combat:psychup-native", self) || "[]");
        targetEffects.forEach(effect => {
            if (!ownEffects.some(own => own.id === effect.id && own.amplifier >= effect.amplifier)) { changed++; gain++; }
        });
        return { changed: changed, gain: gain, loss: loss, net: selective ? gain : gain - loss };
    }

    function psychupWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): PsychupAssessment | null {
        if (context.facts.mounted) return null;
        if (target.health <= 0 || !target.visible) return null;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return null;
        const self = source(context);
        if (status(context, self, "psychup")) return null;
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 14)) return null;
        if (!world(context).clear(point(self.point), point(target.point))) return null;
        const assessment = psychupAssess(context, item, target);
        // Enemies and companions both qualify; the choice is the real net gain, not merely being different.
        return assessment && assessment.changed > 0 && assessment.net > 0 ? assessment : null;
    }

    registerUse("psychup", {
        // control drives the enemy read; bolster lets a partner demonstrate so the caster can borrow its edge.
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return psychupWants(context, item, target) !== null;
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            const assessment = psychupWants(context, item, target);
            return assessment === null ? 0 : assessment.net >= 2 ? 70 : 45;
        }
    });

    const psychupChase = PokemonSkills.number("ai.maxChase", "读取距离", 4, 28, 1);
    psychupChase.help = "威胁进入这个距离内才考虑自我暗示；越大越愿意隔着一段距离先读，调小只在贴身时对齐。";
    const psychupStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    psychupStation.help = "开启后，驻守中的伙伴也会离位去读对手的架势；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("psychup", { ai: { maxChase: 14, leaveStation: false } }, [psychupChase, psychupStation]);

    function psychupCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let index = 0; index < items.length; index++) if (items[index].data.move === "psychup") return items[index];
        return null;
    }
    registry.goal({ id: "world_combat:move_psychup/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = psychupCapability(context);
            if (!item || psychupWants(context, item, threat) === null) return [];
            if (recent(context, "control", threat.ref, 80)) return [];
            return [{ id: "world_combat:move_psychup:" + threat.ref, kind: "world_combat:move_psychup", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_psychup/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_psychup") return [];
            const item = psychupCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || psychupWants(context, item, threat) === null) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_psychup/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_psychup");
    });
}
