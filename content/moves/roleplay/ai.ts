/** Target selection follows each supported Pokémon or native-world branch and the configured chase policy. */
namespace CompanionBehavior {
    registerFact("world_combat:roleplay-ability", function (access, actor, _argument) {
        return PokemonSkills.roleplayAbility(access, actor);
    });

    function roleplayWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (status(context, source(context), "roleplay")) return false;
        const self = source(context);
        if (context.facts.focus !== target.ref && distance(self.point, target.point) > ai<number>(item, "maxChase", 15)) return false;
        if (!world(context).clear(point(self.point), point(target.point))) return false;
        if (domain(context, target) !== "cobblemon") {
            if (status(context, self, "roleplay")) return false;
            const access = world(context), a = access.actor(self.ref), b = access.actor(target.ref);
            if (!a || !b) return false;
            const values = PokemonSkills.copiedNativeTrait(access, b);
            return Object.keys(values).some(id => { const own = access.attributeValue(a, id); return own !== null && values[id] > own.value() + 0.0001; });
        }
        const theirs = fact<string>(context, "world_combat:roleplay-ability", target);
        if (theirs === null || !PokemonSkills.roleplayCopyable(theirs)) return false;
        const mine = fact<string>(context, "world_combat:roleplay-ability", self);
        if (mine === null) return false;
        if (typeof mine === "string" && mine === theirs) return false;
        return true;
    }

    registerUse("roleplay", {
        // control copies from a foe; bolster lets the companion demonstrate an ability worth borrowing.
        protocols: ["world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (target === null) return true;
            return roleplayWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (target === null) return 0;
            return roleplayWants(context, item, target) ? 60 : 0;
        }
    });

    const roleplayChase = PokemonSkills.number("ai.maxChase", "识别距离", 4, 28, 1);
    roleplayChase.help = "威胁进入这个距离内才考虑扮演；越大越愿意隔着一段距离先描，调小只在贴身时抄。";
    const roleplayStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    roleplayStation.help = "开启后，驻守中的伙伴也会离位去抄对手的特性；关闭则只在原地够得到时出手。";

    PokemonSkills.addPreferences("roleplay", { ai: { maxChase: 15, leaveStation: false } }, [roleplayChase, roleplayStation]);

    function roleplayCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:control");
        for (let index = 0; index < items.length; index++) if (items[index].data.move === "roleplay") return items[index];
        return null;
    }
    registry.goal({ id: "world_combat:move_roleplay/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = roleplayCapability(context);
            if (!item || !roleplayWants(context, item, threat)) return [];
            if (recent(context, "control", threat.ref, 80)) return [];
            return [{ id: "world_combat:move_roleplay:" + threat.ref, kind: "world_combat:move_roleplay", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_roleplay/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_roleplay") return [];
            const item = roleplayCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !threat || !roleplayWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: threat.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            return castNode(choice.offer.capabilities![0].id, "control",
                function (current) { return entity(current, current.choice!.goal.data.ref); });
        }
    });
    orderGoals("world_combat:move_roleplay/priority", function (context, order) {
        if (!context.senses["world_combat:threat"]) return;
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_roleplay");
    });
}
