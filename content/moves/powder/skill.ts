/**
 * 粉尘 / powder —— 出手方式。
 *
 * 核心念头：朝选定的对手抛出一团极细的粉尘，贴上它就不走；之后它每用一次火属性招式，粉尘就当场炸开，
 *   按施法者的特攻给它一记自伤。先埋一颗、等对手自己点火——它是一记陷阱，不是即时的状态投掷。
 *
 * 两幕 + 引爆：
 *   起（windup，提交前）：掌心拢起粉尘，预告这一抛（`action.present`）。
 *   撒（throw → dusted）：提交后粉团沿低弧飞向对手（外观就是粉尘团）；命中处若对手不是草属性，就给它挂上
 *      共享身份 world_combat:status/powdered 的粉尘与自己的机读标记（写明爆炸比例 `blast` 与尘粒数），
 *      粘附 `dustTicks`；草属性直接穿过。
 *   爆（ignite）：此后该对手每次提交火属性招式时，粉尘当场炸开——消掉粉尘与标记、`explode` 出冲击，
 *      并按其最大生命的 `blast` 结算自伤。火招本身照常放完，粉尘只埋一次。
 *
 * 与同族分开：粉系四式（毒粉／麻痹粉／催眠粉等）都是命中即施加状态；只有粉尘是**埋在对手身上、由它自己
 *   使用火招触发的一次性陷阱**——它惩罚的是对手的招法选择，而不是它的当下。
 * 反制：不用火招就不会引爆，粉尘到期自然散去；草属性穿过粉尘；拉开距离让粉团落空。
 */
namespace PokemonSkills {
    const powderScene = "world_combat:move_powder";
    const powderDust = "world_combat:powdered_dust";
    const powderMark = "world_combat:powder_mark";
    const powderDustText = "world_combat.move.powder.text.dust";
    const powderBlastText = "world_combat.move.powder.text.blast";
    const powderMissText = "world_combat.move.powder.text.miss";

    /** 草属性对粉末免疫：它直接穿过这团粉尘。 */
    function powderGrassImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)) === "grass") return true;
        return false;
    }
    function powderMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, powderMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    WorldCombat.effect(powderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["blast", "motes", "radius"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid powder mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    // 机读标记只为携带爆炸比例与画面数值，不自己结算；引爆由 skill.ts 的 committed 反应完成。
    WorldCombat.effectHandler(powderMark, "start", function () { });
    WorldCombat.effectHandler(powderMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 引爆：被撒上粉尘的活体每次提交火属性招式时，粉尘当场炸开（火招照常放完）。
    WorldCombat.on("world_combat:move_powder/ignite", "world_combat:committed", "", function (event) {
        const world = event.world(), actor = event.actor(), action = event.action();
        if (action === null || !world.valid(actor)) return;
        if (MobEffects.read(world, actor, powderDust) === null) return;
        const move = NativeLoadout.executing(action);
        if (move === null || String(move.type()) !== "fire") return;
        const mark = powderMarkOf(world, actor);
        if (mark === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const at = body.position();
        MobEffects.consume(world, actor, powderDust);
        const views = world.effects(actor, powderMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
        const blast = Math.max(0, Math.min(0.5, Number(mark.blast) || 0.2));
        const damage = Math.max(1, body.maxHealth() * blast);
        const power = Math.max(0.5, Math.min(2.4, blast * 8));
        world.explode(at, power, JSON.stringify({ damage: false }));
        world.health(actor, -damage, "world_combat:powder");
        WorldFeedback.emit(world, powderScene, 1, at,
            { moment: "blast", target: String(actor.ref()), damage: Math.round(damage * 10) / 10,
              motes: Math.max(14, Math.round(Number(mark.motes) || 18)), blast: blast,
              scale: Math.max(0.6, Math.min(1.8, (Number(mark.radius) || 0.26) / 0.26)) }, 34);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), powderBlastText, [Math.round(damage * 10) / 10], 32);
        world.sound("minecraft:entity.generic.explode", at, 18, "{}");
        world.sound("cobblemon:impact.fire", at, 14, "{}");
    });

    define({
        id: "powder",
        name: "Powder",
        description: "朝选定的对手抛出一团极细的粉尘：贴上后，它每用一次火属性招式，粉尘就当场炸开，"
            + "对它造成一段按施法者特攻定级的自伤。它是一记埋在对手身上的陷阱，火招照常放完；草属性穿过粉尘。",
        uses: ["在对手依赖火招时先埋一颗", "用它逼对手收起火属性招式", "给火属性主力一次「出手就挨炸」的代价"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 34,
        style: "dust",
        defaults: { volatile: false, ai: { maxChase: 10, leaveStation: true } },
        fields: [flag("volatile", "易爆")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powder"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("powder", "tempo", context)),
                recover: Math.round(p("powder", "aftercast", context)),
                cooldown: Math.round(p("powder", "recharge", context)),
                active: 1,
                range: p("powder", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_powder:gather", powderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", volatile: config && config.volatile === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["powder"], detail: { values: config } };
            return { radius: p("powder", "radius", context), geometry: "circle", style: "dust", color: 0xE8D9A0,
                label: config && config.volatile === true ? "粉尘·易爆" : "粉尘" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const speed = Math.max(0.6, p("powder", "puffSpeed", action));
            const radius = Math.max(0.2, p("powder", "radius", action));
            const ticks = Math.max(140, Math.round(p("powder", "dustTicks", action)));
            const motes = Math.max(10, Math.round(p("powder", "motes", action)));
            const blast = Math.max(0.1, Math.min(0.5, p("powder", "blast", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.26));
            const actorRef = String(self.ref());
            let settled = false;

            function dusted(current: CombatAction, point: CombatPoint, primary: CombatActor | null): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (primary !== null && scope.valid(primary) && !scope.friendly(primary) && !powderGrassImmune(scope, primary)) {
                    MobEffects.apply(scope, primary, powderDust, ticks, 0);
                    const views = scope.effects(primary, powderMark);
                    for (let i = 0; i < views.length; i++) scope.operation(views[i].id(), "world_combat:dispel", "{}");
                    scope.effect(powderMark, primary, JSON.stringify({ blast: blast, motes: motes, radius: radius }), ticks);
                    const body = scope.observe(primary);
                    const at = body === null ? point : body.position();
                    WorldFeedback.emit(scope, powderScene, 1, at,
                        { moment: "dust", target: String(primary.ref()), motes: motes, scale: scale }, 28);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), powderDustText, [Math.round(ticks / 20)], 30);
                } else {
                    WorldFeedback.emit(scope, powderScene, 1, point, { moment: "puff", motes: motes, scale: scale }, 20);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), powderMissText, [], 24);
                }
                sound(current, "cobblemon:move.powder.target");
                done(current);
            }

            sound(action, "cobblemon:move.powder.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 110,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.8, tint: 0xE8D9A0 },
                impact: function (current, hit) { dusted(current, hit.position(), hit.target()); }
            }, function (current) { dusted(current, current.targetPosition(), null); });
            WorldFeedback.emit(world, powderScene, 1, action.origin(),
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                  motes: motes, scale: scale }, 28);
        }
    });
}
