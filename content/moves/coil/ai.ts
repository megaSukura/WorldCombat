namespace PokemonSkills {
    function coilFollowup(context: WorldBehavior.Context): boolean {
        return context.capabilities.some(item => {
            const id = String(item.data && item.data.move || "");
            if (!id || id === "coil" || item.protocols.indexOf("world_combat:attack") < 0) return false;
            const move = CobblemonCombat.moveTemplate(id);
            return String(move.category()) === "physical" && !!NativeLoadout.facts(move).flags.contact;
        });
    }
    CompanionBehavior.registerUse("coil", {
        protocols: ["world_combat:attack"],
        reach: () => 6,
        available: (context, capability, _purpose, target) => {
            if (context.facts.mounted || context.facts.intent === "hold" || context.facts.intent === "stay" || !coilFollowup(context)) return false;
            const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context), actor = world.actor(self.ref);
            if (!actor || !world.observe(actor) || !world.observe(actor)!.grounded() || MobEffects.read(world, actor, "world_combat:coil_brace")) return false;
            if (!target) return true;
            const gap = CompanionBehavior.distance(self.point, target.point);
            return !target.friendly && target.visible && target.health > 0
                && gap >= CompanionBehavior.ai<number>(capability, "minGap", 2)
                && gap <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: (_context, _item, target) => !target.friendly && target.visible && target.health > 0,
        priority: (context, capability, target) => {
            if (!target || !coilFollowup(context)) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            return gap >= CompanionBehavior.ai<number>(capability, "minGap", 2) && gap <= 6 ? 105 : 0;
        }
    });
    addPreferences("coil", {}, [
        field(pathOf("ai.maxChase"), "接战距离", "number", { min: 2, max: 6, step: .5, help: "只在能用短弹步接近的距离准备盘劲。" }),
        field(pathOf("ai.minGap"), "贴身下限", "number", { min: 0, max: 6, step: .5, help: "更近时直接使用近身攻击，不为盘劲停顿。" })
    ]);
}