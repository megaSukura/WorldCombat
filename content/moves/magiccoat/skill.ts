/** One owned preparation window catches one reproducible move or one sourced native harmful effect. */
namespace PokemonSkills {
    export const magiccoatId = "magiccoat";
    export const magiccoatScene = "world_combat:move_magiccoat";
    export const magiccoatReflectText = "world_combat.move.magiccoat.text.reflect";
    interface CoatWindow {
        instance: number; until: number; reach: number;
        move: (id: string, source: CombatActor) => boolean;
        native: (data: CombatNativeMobEffectFacts, source: CombatActor) => boolean;
    }
    const magiccoatWindows: { [caster: string]: CoatWindow } = Object.create(null);
    const magiccoatThreats: { [source: string]: number } = Object.create(null);
    const magiccoatReturning: { [recipientAndEffect: string]: boolean } = Object.create(null);
    export function magiccoatReflectable(id: string): boolean {
        if (!skills[id]) return false;
        try {
            const move = CobblemonCombat.moveTemplate(id);
            return String(move.category()) === "status" && !!NativeLoadout.facts(move).flags.reflectable;
        } catch (error) { return false; }
    }
    export function magiccoatThreat(world: CombatWorld, actor: CombatActor): boolean {
        if ((magiccoatThreats[String(actor.ref())] || -1000) >= world.tick() - 200) return true;
        if (String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let i = 0; i < pokemon.moveSlots(); i++) {
            const move = pokemon.move(i);
            if (move && move.pp() > 0 && magiccoatReflectable(NativeLoadout.selection(world, i, move, actor).id)) return true;
        }
        return false;
    }
    export function magiccoatCall(action: CombatAction, id: string, from: string): NativeLoadout.CallOptions | null {
        const skill = skills[id], world = action.sense(), attacker = world.actor(from);
        if (!skill || !attacker || !world.valid(attacker)) return null;
        const body = world.observe(attacker); if (!body) return null;
        const point = body.position(), direction = point.minus(action.origin());
        return { eligibility: "caller", cooldown: p(magiccoatId, "recharge", action),
            input: { target: skill.kind === "enemy" || skill.kind === "friend" || skill.kind === "aim" ? attacker : null,
                point: point, direction: direction.length() < .01 ? action.direction() : direction } };
    }
    function magiccoatConnected(world: CombatWorld, target: CombatActor, source: CombatActor, film: CoatWindow): boolean {
        const from = world.observe(source), to = world.observe(target);
        return world.tick() <= film.until && String(target.key()) !== String(source.key()) && !world.friendly(target)
            && from !== null && to !== null && from.position().minus(to.position()).length() <= film.reach
            && world.clear(from.position(), to.position());
    }
    WorldCombat.on("world_combat:move_magiccoat/ended", "world_combat:action_ended", "", event => {
        const data = JSON.parse(event.data()), ref = String(event.actor().ref()), film = magiccoatWindows[ref];
        if (film && film.instance === data.instance) delete magiccoatWindows[ref];
    });
    WorldCombat.on("world_combat:move_magiccoat/film", "world_combat:before_commit", "", event => {
        const action = event.action(), target = action && action.target();
        if (!action || !target || action.data("world_combat:magiccoat/returning") !== null) return;
        const film = magiccoatWindows[String(target.ref())], world = event.world();
        if (!film || !magiccoatConnected(world, target, event.actor(), film)) return;
        const executing = NativeLoadout.executing(action), id = executing && String(executing.id());
        if (!id || !magiccoatReflectable(id)) return;
        if (film.move(id, event.actor())) event.reject("magiccoat");
    });
    WorldCombat.on("world_combat:move_magiccoat/native", "world_combat:mob_effect_incoming", "", event => {
        const data: CombatNativeMobEffectFacts = JSON.parse(event.data()), target = event.target(), world = event.world();
        if (!target || data.category !== "harmful" || !data.sourceActor || data.tags.indexOf("world_combat:status/identity_only") >= 0
            || data.duration !== -1 && (data.duration < 1 || data.duration > 1728000) || data.amplifier < 0 || data.amplifier > 255) return;
        if (world.originData("world_combat:magiccoat/returning") !== null) return;
        const source = world.actor(data.sourceActor); if (!source) return;
        magiccoatThreats[data.sourceActor] = world.tick();
        Object.keys(magiccoatThreats).forEach(ref => { if (magiccoatThreats[ref] < world.tick() - 200) delete magiccoatThreats[ref]; });
        const film = magiccoatWindows[String(target.ref())];
        if (!film || magiccoatReturning[String(target.ref()) + "/" + data.id] || !magiccoatConnected(world, target, source, film)) return;
        if (film.native(data, source)) event.reject("magiccoat");
    });

    define({
        id: magiccoatId,
        cooldownParameter: "recharge",
        name: "Magic Coat",
        description: "撑起一次反射光膜：合法复现朝自己释放的可反射变化招，或挡下有真实来源的原生坏状态，并按原等级与时长送回来源。接一手即收膜，来源免疫时只挡下；空膜收起不结账。",
        uses: ["把铺到自己身上的毒、麻痹、寄生原样还回去", "在对手下状态前先一步撑膜", "让只会用状态招的敌人反受其害"],
        kind: "self",
        range: 7,
        maxRange: 15,
        style: "coat",
        defaults: { sweep: false, ai: { maxChase: 14, opening: "anytime", leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[magiccoatId], detail: { values: config } };
            return { radius: p(magiccoatId, "coatReach", context), geometry: "line", style: "coat", color: 0x8FE8FF,
                label: config && config.sweep === true ? "魔法反射·广膜" : "魔法反射" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magiccoatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(magiccoatId, "tempo", context)),
                recover: 0,
                cooldown: Math.round(p(magiccoatId, "recharge", context)),
                active: 0,
                range: p(magiccoatId, "coatReach", context)
            };
        },
        run: function (action, _move, config) {
            const casterRef = String(action.actor().ref()), facets = Math.max(1, Math.round(p(magiccoatId, "facets", action)));
            const scenes = WorldFeedback.actionScenes(magiccoatScene);
            scenes.show(action, "raise", action.origin(), { moment: "raise", facets: facets, sweep: config && config.sweep ? 1 : 0 });
            action.after(Math.max(1, Math.round(p(magiccoatId, "tempo", action))), function (current) {
                scenes.stop(current, "raise");
                const window = Math.max(20, Math.round(p(magiccoatId, "window", current)));
                const film: CoatWindow = {
                    instance: current.id(), until: current.sense().tick() + window, reach: p(magiccoatId, "coatReach", current),
                    move: (id, attacker) => {
                        const options = magiccoatCall(current, id, String(attacker.ref()));
                        const choice = options && NativeLoadout.select(current, [id], options);
                        if (!choice) return false;
                        delete magiccoatWindows[casterRef]; scenes.stop(current);
                        current.data("world_combat:magiccoat/returning", JSON.stringify({ from: String(attacker.ref()), move: id, facets: facets }));
                        try { NativeLoadout.call(current, id, choice.options); }
                        catch (error) { try { current.cancel(); } catch (ended) {} return false; }
                        return true;
                    },
                    native: (data, attacker) => {
                        delete magiccoatWindows[casterRef]; scenes.stop(current);
                        try { current.commit(Math.round(p(magiccoatId, "recharge", current))); }
                        catch (error) { try { current.cancel(); } catch (ended) {} return false; }
                        const scope = current.world(), key = String(attacker.ref()) + "/" + data.id;
                        scope.originData("world_combat:magiccoat/returning", "{}");
                        const before = MobEffects.read(scope, attacker, data.id);
                        let applied: CombatMobEffect | null = null;
                        magiccoatReturning[key] = true;
                        try { applied = MobEffects.apply(scope, attacker, data.id, data.duration, data.amplifier); }
                        finally { delete magiccoatReturning[key]; }
                        const changed = applied !== null && (!before || String(applied.key()) !== String(before.key()));
                        WorldFeedback.emit(scope, magiccoatScene, 1, current.origin(), { moment: "reflect", target: String(attacker.ref()),
                            path: [casterRef, String(attacker.ref())], facets: facets, accepted: changed ? 1 : 0, span: 0 }, 30);
                        WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.25, 0)),
                            changed ? magiccoatReflectText : "world_combat.move.magiccoat.text.block", [{ key: "effect." + data.id.replace(":", ".") }], 30);
                        scope.sound("minecraft:entity.illusioner.mirror_move", current.origin(), 12, "{}");
                        current.finish(); return true;
                    }
                };
                magiccoatWindows[casterRef] = film;
                function step(handle: CombatAction): void {
                    if (magiccoatWindows[casterRef] !== film) return;
                    const left = film.until - handle.sense().tick();
                    if (left <= 0) { delete magiccoatWindows[casterRef]; scenes.stop(handle); handle.reject("no-reflect"); return; }
                    scenes.show(handle, "film", handle.origin(), { moment: "film", facets: facets, remaining: left, span: window });
                    handle.after(1, step);
                }
                step(current);
            });
        }
    });
    WorldCombat.on("world_combat:move_magiccoat/committed", "world_combat:committed", "", event => {
        const action = event.action(); if (!action) return;
        const raw = action.data("world_combat:magiccoat/returning"); if (!raw) return;
        const data = JSON.parse(raw), world = event.world(), body = world.observe(event.actor()); if (!body) return;
        world.originData("world_combat:magiccoat/returning", "{}");
        WorldFeedback.emit(world, magiccoatScene, 1, body.position(), { moment: "reflect", target: data.from,
            path: [String(event.actor().ref()), data.from], facets: data.facets, span: 0 }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), magiccoatReflectText,
            [{ key: "cobblemon.move." + data.move, fallback: data.move }], 36);
        world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 12, "{}");
    });
}
