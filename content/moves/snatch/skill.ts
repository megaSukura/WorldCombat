/** Each waiting instance has its own claim; the earliest eligible window takes one actual incoming benefit. */
namespace PokemonSkills {
    export const snatchId = "snatch";
    export const snatchScene = "world_combat:move_snatch";
    export const snatchTakenText = "world_combat.move.snatch.text.taken";
    export const snatchEmptyText = "world_combat.move.snatch.text.empty";
    interface SnatchWindow {
        instance: number; snatcher: string; target: string; until: number; reach: number;
        move: (id: string) => boolean; native: (data: CombatNativeMobEffectFacts) => boolean;
    }
    const snatchWindows: SnatchWindow[] = [];
    const snatchBenefits: { [ref: string]: number } = Object.create(null);
    function snatchRemove(instance: number): void {
        for (let i = snatchWindows.length - 1; i >= 0; i--) if (snatchWindows[i].instance === instance) snatchWindows.splice(i, 1);
    }
    export function snatchStealable(id: string): boolean {
        if (!skills[id]) return false;
        try {
            const move = CobblemonCombat.moveTemplate(id);
            return String(move.category()) === "status" && !!NativeLoadout.facts(move).flags.snatch;
        } catch (error) { return false; }
    }
    export function snatchOpportunity(world: CombatWorld, actor: CombatActor): boolean {
        if ((snatchBenefits[String(actor.ref())] || -1000) >= world.tick() - 200) return true;
        if (String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move && move.pp() > 0 && snatchStealable(NativeLoadout.selection(world, slot, move, actor).id)) return true;
        }
        return false;
    }
    export function snatchCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        const skill = skills[id], self = action.actor(), body = action.sense().observe(self); if (!skill || !body) return null;
        if (skill.kind === "enemy") return null;
        return { eligibility: "caller", cooldown: p(snatchId, "recharge", action), input: {
            target: skill.kind === "self" || skill.kind === "friend" || skill.kind === "aim" ? self : null,
            point: body.position(), direction: action.direction()
        } };
    }
    function snatchEligible(world: CombatWorld, recipient: CombatActor): SnatchWindow[] {
        return snatchWindows.filter(window => {
            if (window.target !== String(recipient.ref()) || window.until < world.tick()) return false;
            const snatcher = world.actor(window.snatcher), from = snatcher && world.observe(snatcher), to = world.observe(recipient);
            return !!snatcher && !!from && !!to && !world.allied(snatcher, recipient)
                && from.position().minus(to.position()).length() <= window.reach && world.clear(from.position(), to.position());
        });
    }
    WorldCombat.on("world_combat:move_snatch/ended", "world_combat:action_ended", "", event => snatchRemove(JSON.parse(event.data()).instance));
    WorldCombat.on("world_combat:move_snatch/hook", "world_combat:before_commit", "", event => {
        const action = event.action(); if (!action || action.data("world_combat:snatch/taken") !== null || action.data("world_combat:magiccoat/returning") !== null) return;
        const executing = NativeLoadout.executing(action); if (!executing || !snatchStealable(String(executing.id()))) return;
        const eligible = snatchEligible(event.world(), event.actor());
        for (let i = 0; i < eligible.length; i++) if (eligible[i].move(String(executing.id()))) { event.reject("snatched"); return; }
    });
    WorldCombat.on("world_combat:move_snatch/native", "world_combat:mob_effect_incoming", "", event => {
        const data: CombatNativeMobEffectFacts = JSON.parse(event.data()), target = event.target(), world = event.world();
        if (!target || data.category !== "beneficial" || data.tags.indexOf("world_combat:status/identity_only") >= 0
            || data.duration !== -1 && (data.duration < 1 || data.duration > 1728000) || data.amplifier < 0 || data.amplifier > 255
            || world.originData("world_combat:snatch/taken") !== null) return;
        const previous = MobEffects.read(world, target, data.id);
        if (previous && previous.amplifier() >= data.amplifier && (previous.duration() < 0 || data.duration >= 0 && previous.duration() >= data.duration)) return;
        snatchBenefits[String(target.ref())] = world.tick();
        Object.keys(snatchBenefits).forEach(ref => { if (snatchBenefits[ref] < world.tick() - 200) delete snatchBenefits[ref]; });
        const eligible = snatchEligible(world, target);
        for (let i = 0; i < eligible.length; i++) if (eligible[i].native(data)) { event.reject("snatched"); return; }
    });

    define({
        id: snatchId,
        cooldownParameter: "recharge",
        name: "Snatch",
        description: "等待选定对手的下一次增益，夺走可抢的自用招式或它刚获得的一项有益药水效果。",
        uses: ["把对手马上要上的增益抢过来", "截走对手的回复与布置", "在对手开打前先夺走它的准备"],
        kind: "enemy",
        range: 6,
        maxRange: 13,
        style: "snatch",
        defaults: { patient: false, ai: { maxChase: 14, opening: "setup", leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[snatchId], detail: { values: config } };
            return { radius: p(snatchId, "reach", context), geometry: "line", style: "snatch", color: 0x7B4FBF,
                label: config && config.patient === true ? "抢夺·屏息" : "抢夺" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[snatchId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(snatchId, "tempo", context)),
                recover: 0,
                cooldown: Math.round(p(snatchId, "recharge", context)),
                active: 0,
                range: p(snatchId, "reach", context)
            };
        },
        run: function (action, _move, config) {
            const target = action.target(), actorRef = String(action.actor().ref());
            if (!target) { action.reject("invalid-target"); return; }
            const foe = target;
            const targetRef = String(target.ref()), grip = Math.max(1, Math.round(p(snatchId, "grip", action)));
            const scenes = WorldFeedback.actionScenes(snatchScene);
            scenes.show(action, "brace", action.origin(), { moment: "brace", target: targetRef, grip: grip, patient: config && config.patient ? 1 : 0 });
            action.after(Math.max(1, Math.round(p(snatchId, "tempo", action))), current => {
                scenes.stop(current);
                const scope = current.sense(); if (!scope.valid(target) || scope.friendly(target)) { current.reject("invalid-target"); return; }
                const span = Math.max(20, Math.round(p(snatchId, "window", current)));
                const window: SnatchWindow = {
                    instance: current.id(), snatcher: actorRef, target: targetRef, until: scope.tick() + span, reach: p(snatchId, "reach", current),
                    move: id => {
                        const options = snatchCall(current, id), choice = options && NativeLoadout.select(current, [id], options);
                        if (!choice) return false;
                        snatchRemove(current.id()); scenes.stop(current);
                        current.data("world_combat:snatch/taken", JSON.stringify({ move: id, from: targetRef, grip: grip }));
                        try { NativeLoadout.call(current, id, choice.options); }
                        catch (error) { try { current.cancel(); } catch (ended) {} return false; }
                        return true;
                    },
                    native: data => {
                        const before = MobEffects.read(current.sense(), current.actor(), data.id);
                        if (before && (before.amplifier() > data.amplifier || before.amplifier() === data.amplifier
                            && (before.duration() < 0 || data.duration >= 0 && before.duration() >= data.duration))) return false;
                        snatchRemove(current.id()); scenes.stop(current);
                        try { current.commit(Math.round(p(snatchId, "recharge", current))); }
                        catch (error) { try { current.cancel(); } catch (ended) {} return false; }
                        const world = current.world(); world.originData("world_combat:snatch/taken", "{}");
                        const granted = MobEffects.apply(world, current.actor(), data.id, data.duration, data.amplifier);
                        const success = granted !== null && (!before || String(granted.key()) !== String(before.key())) && granted.amplifier() >= data.amplifier;
                        WorldFeedback.emit(world, snatchScene, 1, current.origin(), { moment: success ? "take" : "empty", target: targetRef,
                            path: [targetRef, actorRef], grip: grip, span: 0 }, 30);
                        if (success) WorldFeedback.text(world, current.origin().plus(WorldCombat.point(0, 1.2, 0)), snatchTakenText,
                            [{ key: "effect." + data.id.replace(":", ".") }], 30);
                        current.finish(); return success;
                    }
                };
                snatchWindows.push(window);
                function step(handle: CombatAction): void {
                    if (snatchWindows.indexOf(window) < 0) return;
                    if (!handle.sense().valid(foe) || handle.sense().tick() > window.until) {
                        snatchRemove(handle.id()); scenes.stop(handle); handle.reject("no-snatch"); return;
                    }
                    scenes.show(handle, "reach", handle.origin(), { moment: "reach", target: targetRef, path: [actorRef, targetRef],
                        grip: grip, remaining: window.until - handle.sense().tick(), span: span });
                    handle.after(1, step);
                }
                step(current);
            });
        }
    });
    WorldCombat.on("world_combat:move_snatch/committed", "world_combat:committed", "", event => {
        const action = event.action(); if (!action) return;
        const raw = action.data("world_combat:snatch/taken"); if (!raw) return;
        const taken = JSON.parse(raw), world = event.world(), body = world.observe(event.actor()); if (!body) return;
        world.originData("world_combat:snatch/taken", "{}");
        WorldFeedback.emit(world, snatchScene, 1, body.position(), { moment: "take", target: taken.from, grip: taken.grip,
            path: [taken.from, String(event.actor().ref())], span: 0 }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), snatchTakenText,
            [{ key: "cobblemon.move." + taken.move, fallback: taken.move }], 36);
        world.sound("minecraft:entity.experience_orb.pickup", body.position(), 12, "{}");
    });
}
