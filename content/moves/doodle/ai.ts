/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace CompanionBehavior {
    registerFact("world_combat:doodle-ability", function (access, actor, _argument) {
        return PokemonSkills.doodleAbility(access, actor);
    });

    function doodleWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 15)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        const access = world(context), actor = access.actor(self.ref), sample = access.actor(target.ref);
        if (!actor || !sample) return false;
        const body = access.observe(actor); if (!body) return false;
        const params = { world: access, actor: actor, skill: PokemonSkills.skills.doodle, detail: { values: item.data.config } };
        const native = domain(context, target) !== "cobblemon";
        const recipients = PokemonSkills.doodleRecipients(access, actor, body.position(),
            PokemonSkills.p("doodle", "canvas", params), Math.round(PokemonSkills.p("doodle", "squad", params)), native, sample);
        if (!recipients.length) return false;
        if (native) {
            const values = PokemonSkills.copiedNativeTrait(access, sample);
            return recipients.every(recipient => Object.keys(values).every(id => {
                const own = access.attributeValue(recipient, id);
                return own !== null && values[id] > own.value() + .0001;
            }));
        }
        const theirs = PokemonSkills.doodleAbility(access, sample);
        const liabilities = ["truant", "slowstart", "defeatist"];
        if (!PokemonSkills.doodleCopyable(theirs) || liabilities.indexOf(theirs) >= 0) return false;
        // 同时被覆盖的每一人都要有可确认的负担可除；未知特性之间的取舍留给玩家点选。
        return recipients.every(recipient => liabilities.indexOf(PokemonSkills.doodleAbility(access, recipient)) >= 0);
    }

    registerUse("doodle", {
        // control sketches from the foe the AI already targets; a friendly sample is a manual choice.
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return doodleWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            if (!doodleWants(context, item, target)) return 0;
            const self = source(context), theirs = fact<string>(context, "world_combat:doodle-ability", target);
            return fact<string>(context, "world_combat:doodle-ability", self) !== theirs ? 45 : 62;
        }
    });

    const doodleChase = PokemonSkills.number("ai.maxChase", "读稿距离", 4, 28, 1);
    doodleChase.help = "威胁进入这个距离内才考虑描绘；越大越愿意隔着一段距离先描，调小只在贴身时抄。";
    const doodleStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    doodleStation.help = "开启后，驻守中的伙伴也会离位去描对手的本质；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("doodle", { ai: { maxChase: 15, leaveStation: false } }, [doodleChase, doodleStation]);

    function doodleCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let index = 0; index < items.length; index++) if (items[index].data.move === "doodle") return items[index];
        return null;
    }
    registry.goal({ id: "world_combat:move_doodle/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = doodleCapability(context);
            if (!item || !doodleWants(context, item, threat)) return [];
            if (recent(context, "control", threat.ref, 80)) return [];
            return [{ id: "world_combat:move_doodle:" + threat.ref, kind: "world_combat:move_doodle", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_doodle/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_doodle") return [];
            const item = doodleCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || !doodleWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_doodle/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_doodle");
    });
}
