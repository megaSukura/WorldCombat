namespace PokemonSkills {
    const coilScene = "world_combat:move_coil", coilBrace = "world_combat:coil_brace";
    const coilHold = "world_combat:move_coil/hold";
    interface CoilHold { budget: number; carrier: MobEffects.Anchor; factor: number; }
    WorldCombat.effect(coilHold, 1, 80, "actor", json => json, EffectProtocols.unchanged);
    function coilWatch(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), value: CoilHold = JSON.parse(effect.state());
        const budget = DamageBudgets.read(world, { actor, id: value.budget });
        if (!budget || budget.remaining === 0 || !MobEffects.matches(world, actor, value.carrier)) { effect.end(); return; }
        const body = world.observe(actor);
        if (!body) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "coil:armed", coilScene, 1, body.position(),
            { moment: "armed", actor: String(actor.ref()), factor: value.factor });
        effect.schedule("watch", "watch", 1, "{}");
    }
    WorldCombat.effectHandler(coilHold, "start", coilWatch);
    WorldCombat.effectHandler(coilHold, "watch", coilWatch);
    WorldCombat.effectHandler(coilHold, "operation:world_combat:dispel", effect => effect.end());

    function coilContact(world: CombatWorld, source: CombatActor, target: CombatActor, data: any): boolean {
        if (String(source.ref()) === String(target.ref()) || !world.valid(source) || !world.valid(target)
            || !DamageSemantics.directOffense(data) || data.category !== "physical" || data.contact !== true || data.directProjectile) return false;
        const a = world.observe(source), b = world.observe(target), origin = data.sourcePosition;
        if (!a || !b || !Array.isArray(origin) || origin.length !== 3) return false;
        const amin = a.boundsMin(), amax = a.boundsMax(), bmin = b.boundsMin(), bmax = b.boundsMax();
        const dx = Math.max(0, amin.x() - bmax.x(), bmin.x() - amax.x());
        const dy = Math.max(0, amin.y() - bmax.y(), bmin.y() - amax.y());
        const dz = Math.max(0, amin.z() - bmax.z(), bmin.z() - amax.z());
        if (dx * dx + dy * dy + dz * dz > .55 * .55) return false;
        const at = WorldCombat.point(origin[0], origin[1], origin[2]);
        if (world.closestPoint(source, at).minus(at).length() > .55) return false;
        const contact = world.closestPoint(target, a.position());
        return WorldGeometry.blockHit(world, a.position(), contact) === null;
    }
    DamageBudgets.modifiers.define({ id: "world_combat:coil/strike", apply: context => {
        if (!(context.data.amount > 0) || !coilContact(context.world, context.source, context.target, context.data)) return;
        const marks = context.world.effects(context.source, coilHold);
        for (const mark of marks) {
            const value: CoilHold = JSON.parse(mark.data());
            if (!MobEffects.matches(context.world, context.source, value.carrier)) continue;
            const claims = DamageBudgets.reserve(context, [{ actor: context.source, id: value.budget }]);
            if (!claims) continue;
            context.data.amount *= value.factor;
            context.data.coilFactor = value.factor;
            return;
        }
    } });
    WorldCombat.on("world_combat:coil/spend", "world_combat:damage_settled", DamageBudgets.settledHook, event => {
        const world = event.world(), actor = event.actor(), data = JSON.parse(event.data());
        for (const result of DamageBudgets.results(data)) {
            if (!result.committed || !result.payload || result.payload.move !== "coil" || !world.valid(actor)
                || result.actor !== String(actor.ref())) continue;
            const carrier: MobEffects.Anchor = result.payload.carrier;
            world.removeMobEffect(actor, carrier.id, carrier.key);
            world.effects(actor, coilHold).forEach(view => {
                if (JSON.parse(view.data()).budget === result.id) world.operation(view.id(), "world_combat:dispel", "{}");
            });
            const body = world.observe(actor);
            if (body) WorldFeedback.emit(world, coilScene, 1, body.position(),
                { moment: "spend", actor: String(actor.ref()), start: world.tick(), duration: 9 }, 9);
        }
    });
    WorldCombat.on("world_combat:coil/clear", "world_combat:mob_effect_removed", "", event => {
        const data = JSON.parse(event.data()), world = event.world(), actor = event.actor();
        if (String(data.id) !== coilBrace || !world.valid(actor)) return;
        world.effects(actor, coilHold).forEach(view => {
            const value: CoilHold = JSON.parse(view.data());
            if (!MobEffects.matches(world, actor, value.carrier)) world.operation(view.id(), "world_combat:dispel", "{}");
        });
    });

    define({
        id: "coil", cooldownParameter: "wait", name: "盘蜷",
        description: "短暂盘紧后沿瞄准方向弹步，遇到身体、墙或断崖就停。随后携带一份盘劲：下一次真正贴身的物理接触命中得到加成；四秒内未用即散。",
        uses: ["弹步接近后接一次近身攻击", "盘紧牺牲步距换更重的一击", "把盘劲留给真正打中的一次接触"],
        kind: "aim", range: 6, maxRange: 6, prepare: 9, active: 1, recover: 6, cooldown: 95,
        style: "coil", stationary: true, defaults: { tight: false, ai: { maxChase: 6, minGap: 2 } },
        fields: [flag("tight", "盘紧")],
        indicator: (config, pokemon) => ({ radius: pokemon ? p("coil", "stride", pokemon) : 3,
            geometry: "line", style: "coil", color: 0x8A6FD8, label: config && config.tight ? "盘蜷 · 短重步" : "盘蜷 · 弹步" }),
        resolve: (pokemon, config, world, actor, attributes) => {
            const context: NumberContext = { pokemon, skill: skills["coil"], detail: { values: config }, world, actor, attributes };
            return { prepare: p("coil", "tempo", context), recover: p("coil", "aftercast", context),
                cooldown: p("coil", "wait", context), active: 1, range: 6 };
        },
        ready: action => {
            const world = action.sense(), body = world.observe(action.actor());
            if (!body || !body.grounded()) return "needs-ground";
            return MobEffects.read(world, action.actor(), coilBrace) ? "already-coiled" : "";
        },
        windup: (action, config, prepare) => {
            action.present(coilScene + "/prepare", coilScene, 1, action.origin(), JSON.stringify({
                moment: "prepare", actor: String(action.actor().ref()), start: action.sense().tick(), duration: prepare, tight: !!(config && config.tight) }));
            return prepare;
        },
        execute: (action, _move, _config, done) => {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (!body) { done(action); return; }
            const direction = WorldGeometry.flatUnit(aim(action), action.direction()), distance = p("coil", "stride", action);
            const factor = p("coil", "spring", action), scenes = WorldFeedback.actionScenes(coilScene);
            const origin = body.position(), path = [LivingActions.coordinates(origin)];
            let spent = 0, finished = false;
            action.releaseTarget();
            function finish(current: CombatAction): void {
                if (finished) return;
                finished = true;
                const scope = current.world(), here = scope.observe(actor);
                if (here) {
                    WorldFeedback.emit(scope, coilScene, 1, here.position(), { moment: "trail", path,
                        start: scope.tick(), duration: 8 }, 8);
                    const carrier = MobEffects.apply(scope, actor, coilBrace, 80, 0);
                    if (carrier) {
                        const anchor = MobEffects.anchor(carrier);
                        const budget = DamageBudgets.open(scope, actor, 80, { anchor, payload: { move: "coil", carrier: anchor, factor } });
                        if (budget) {
                            scope.effect(coilHold, actor, JSON.stringify({ budget: budget.id, carrier: anchor, factor }), 80);
                            WorldFeedback.text(scope, here.position(), "world_combat.move.coil.text.braced", [factor], 24);
                        } else scope.removeMobEffect(actor, coilBrace, carrier.key());
                    }
                }
                scenes.finish(current, done);
            }
            function step(current: CombatAction): void {
                LivingActions.posture(current, { stationary: true });
                const scope = current.world(), here = scope.observe(actor);
                if (!here) { finish(current); return; }
                const delta = direction.scale(Math.min(.55, distance - spent));
                if (delta.length() < .01) { finish(current); return; }
                const nextFeet = WorldCombat.point(here.position().x(), here.boundsMin().y(), here.position().z()).plus(delta);
                if (WorldGeometry.blockHit(scope, nextFeet.plus(WorldCombat.point(0, .15, 0)), nextFeet.minus(WorldCombat.point(0, .55, 0))) === null) {
                    finish(current); return;
                }
                const sweep = sweepStep(current, delta, 0);
                spent += sweep.moved;
                path.push(LivingActions.coordinates(current.origin()));
                scenes.show(current, "spring", current.origin(), { moment: "spring", actor: String(actor.ref()), path });
                current.face(current.origin().plus(direction), 180, 90);
                if (sweep.hit.blocked() || sweep.hit.hitEntity() || sweep.moved < .01 || spent >= distance - .01) finish(current);
                else current.after(1, step);
            }
            sound(action, "cobblemon:move.minimize.actor");
            step(action);
        }
    });
}
