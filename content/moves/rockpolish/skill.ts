/** Polish the body: a temporary speed contribution and native sliding, with unchanged terrain. */
namespace PokemonSkills {
    const rockPolishScene = "world_combat:move_rockpolish", rockPolishShine = "world_combat:rock_polish_shine";
    const rockPolishText = "world_combat.move.rockpolish.text.shined", rockPolishFadeText = "world_combat.move.rockpolish.text.dulled";
    const rockPolishReferenceRadius = 1.2;
    MobEffects.fixedAttributes("world_combat:polished_motion", rockPolishShine, (world, actor) => {
        const values = String(actor.domain()) === "cobblemon" ? config(world, actor, "rockpolish") : skills.rockpolish.defaults;
        return [{ id: "world_combat:ground_slipperiness", amount: p("rockpolish", "slipperiness", { world, actor, detail: { values } }), operation: "add_value" }];
    }, effect => {
        const world = effect.world(), body = world.observe(effect.target());
        if (body) world.present("shine", rockPolishScene, 1, body.position(),
            JSON.stringify({ moment: "shine", target: String(effect.target().ref()) }));
    });

    define({
        id: "rockpolish",
        cooldownParameter: "wait",
        name: "岩石打磨",
        description: "打磨身体，暂时提高速度并获得顺滑的停步惯性；效果结束后收回本次提升，地面保持原样。",
        uses: ["开战前站定磨一轮，把速度拉满", "用可见的光面窗口逼对手拖时间", "连续快跑，松步后短距离滑行"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 14,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "polish",
        stationary: true,
        defaults: { grit: 0, ai: { maxChase: 15, minGap: 4 } },
        fields: [
            field(pathOf("grit"), "磨料", "choice", {
                options: [
                    { value: 0, label: "粗磨" },
                    { value: 1, label: "精磨" }
                ],
                help: "粗磨起手更快、冷却更短；精磨准备更久，但光面更持久、滑行更明显。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("rockpolish", "patchRadius", pokemon), geometry: "area", style: "polish", color: 0xE8B87A,
                label: config && Number(config.grit) === 1 ? "岩石打磨 · 精磨" : "岩石打磨 · 粗磨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["rockpolish"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("rockpolish", "tempo", context)),
                recover: Math.round(p("rockpolish", "aftercast", context)),
                cooldown: Math.round(p("rockpolish", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_rockpolish:grind", rockPolishScene, 1, action.origin(),
                JSON.stringify({ moment: "grind", fine: config && Number(config.grit) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const fine = !!(config && Number(config.grit) === 1);
            const gift = Math.max(2, Math.min(3, Math.round(p("rockpolish", "gift", action))));
            const shine = Math.max(90, Math.round(p("rockpolish", "shine", action)));
            const patchRadius = Math.max(0.9, p("rockpolish", "patchRadius", action));
            const sparks = Math.max(12, Math.round(p("rockpolish", "sparks", action)));
            const dust = Math.max(10, Math.round(p("rockpolish", "dust", action)));
            const scale = patchRadius / rockPolishReferenceRadius;
            const previous = MobEffects.read(world, actor, rockPolishShine);
            const before = NativeEffects.effectiveStage(world, actor, "spe");
            const carrier = MobEffects.apply(world, actor, rockPolishShine, shine, 0);
            if (!carrier) { done(action); return; }
            NativeEffects.boostWindow(world, actor, { spe: gift }, carrier.duration(), "world_combat:move_rockpolish", carrier, previous);
            const levels = NativeEffects.effectiveStage(world, actor, "spe") - before;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, rockPolishScene, 1, feet,
                { moment: "flash", actor: String(actor.ref()), gift: levels, shine: shine, patchRadius: patchRadius,
                    sparks: sparks, dust: dust, scale: scale, fine: fine ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(2, levels / 2 + (fine ? 0.6 : 0))) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), rockPolishText, [levels > 0 ? "+" + levels : String(levels)], 32);
            world.sound("minecraft:block.grindstone.use", body.position(), 16, "{}");
            done(action);
        }
    });

    // Carrier removal releases its speed and physical modifiers; this handler only supplies the final cue.
    WorldCombat.on("world_combat:move_rockpolish/dull", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rockPolishShine) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, rockPolishScene, 1, body.position(), { moment: "dull", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), rockPolishFadeText, [], 24);
    });
}
