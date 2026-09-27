/** Wait for actual offensive preparation/start; copying retains its own contact, flight and legal ready boundary. */
namespace PokemonSkills {
    PokemonDamage.metadata.define({ id: "world_combat:move_mefirst/surge", apply: context => {
        if (!context.world) return;
        const data = MoveExecutions.read(context.world, "world_combat:mefirst/surge");
        if (data && data.move === String(context.metadata.move)) context.metadata.power *= data.factor;
    } });
    export function mefirstCopyable(id: string): boolean {
        if (!skills[id] || skills[id].run) return false;
        try {
            const move = CobblemonCombat.moveTemplate(id);
            return String(move.category()) !== "status" && !NativeLoadout.facts(move).flags.failmefirst;
        } catch (_) { return false; }
    }
    export function mefirstCall(action: CombatAction, id: string, target: CombatActor | null): NativeLoadout.CallOptions | null {
        const skill = skills[id]; if (!skill) return null;
        const recipient = skill.kind === "self" || skill.kind === "friend" ? action.actor() : target;
        const input = NativeLoadout.inputFor(action, id, recipient);
        return input ? { eligibility: "caller", input: input } : null;
    }
    define({
        id: mefirstId, cooldownParameter: "recharge", name: "抢先一步",
        description: "守候选定敌人的真实进攻起始。对方仍在准备的已知招式可借来施放，复制准备会收进对方剩余准备内；已注册原生近战或投射物新起手则回应同类短击或飞弹。对方照常出手，双方仍需实际命中。",
        uses: ["抓住对手真实蓄势的一拍", "回应已识别的原生近战或新投射", "以守候时间换一记加重的回手"],
        kind: "enemy", range: 11, maxRange: 18, prepare: 5, active: 0, recover: 5, cooldown: 50,
        maximumTicks: 1200, style: "leap",
        defaults: { patient: false, ai: { maxChase: 12, leaveStation: false } }, fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(mefirstId, "reach", pokemon), geometry: "line", style: "leap", color: 0xFFB347,
                label: read(config, ["patient"]) === true ? "抢先一步·耐心" : "抢先一步" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mefirstId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(mefirstId, "tempo", context)), recover: Math.round(p(mefirstId, "aftercast", context)),
                cooldown: Math.round(p(mefirstId, "recharge", context)), active: 0, range: p(mefirstId, "reach", context) };
        },
        run: function (action) {
            const target = action.target(), initial = action.sense();
            if (!target || !initial.valid(target)) { action.reject("invalid-target"); return; }
            const sparks = Math.max(1, Math.round(p(mefirstId, "sparks", action)));
            const window = Math.max(1, Math.round(p(mefirstId, "vigil", action))), surge = p(mefirstId, "surge", action);
            const cooldown = Math.round(p(mefirstId, "recharge", action)), recovery = Math.round(p(mefirstId, "aftercast", action));
            const waiting = WorldFeedback.actionScenes(mefirstScene);
            const authoredCursor = AttackStarts.cursor();
            let nativeCursor = AttackStarts.native(initial, target, 0).cursor;
            let elapsed = 0;
            function show(current: CombatAction, remaining: number): void {
                waiting.show(current, "read", current.origin(), { moment: "read", sparks, remaining, window,
                    target: String(target!.ref()), path: [String(current.actor().ref()), String(target!.ref())],
                    arc: Math.max(1, Math.round(360 * remaining / window)) });
            }
            function miss(current: CombatAction): void {
                waiting.stop(current);
                current.commit(cooldown);
                WorldFeedback.emit(current.world(), mefirstScene, 1, current.origin(), { moment: "miss", sparks }, 20);
                WorldFeedback.text(current.world(), current.origin(), mefirstMissText, [], 24);
                // A completed, still-eligible vigil pays the ordinary caller transaction even when no supported start appeared.
                current.after(recovery, end => end.finish());
            }
            function step(current: CombatAction): void {
                const world = current.sense(), body = world.valid(target!) ? world.observe(target!) : null;
                if (!body || !body.visible()) { miss(current); return; }
                if (world.closestPoint(target!, current.origin()).minus(current.origin()).length() > current.range()) { miss(current); return; }
                current.stopMovement(); current.face(body.position(), 25, 25); show(current, window - elapsed);
                const pending = AttackStarts.authored(world, target!, authoredCursor);
                for (let i = 0; i < pending.length; i++) {
                    const start = pending[i], id = start.identity;
                    if (!mefirstCopyable(id)) continue;
                    const options = mefirstCall(current, id, target!); if (!options) continue;
                    options.prepareLimit = Math.max(0, Math.floor(start.remaining) - 1);
                    options.cooldown = cooldown; options.recover = recovery;
                    const chosen = NativeLoadout.select(current, [id], options); if (!chosen) continue;
                    current.data("world_combat:mefirst/surge", JSON.stringify({ move: id, factor: surge }));
                    current.data("world_combat:mefirst/start", JSON.stringify({ kind: "authored", instance: start.instance, sequence: start.sequence }));
                    waiting.stop(current);
                    NativeLoadout.call(current, id, chosen.options);
                    return;
                }
                const observed = AttackStarts.native(world, target!, nativeCursor);
                nativeCursor = observed.cursor;
                for (let i = 0; i < observed.records.length; i++) {
                    const start = observed.records[i];
                    if (world.tick() - start.tick > 1) continue;
                    const replay = NativeAttackProjection.fromStart(start, current.range());
                    if (!replay || world.closestPoint(target!, current.origin()).minus(current.origin()).length() > NativeAttackProjection.reach(world, current.actor(), replay)) continue;
                    current.data("world_combat:mefirst/start", JSON.stringify({ kind: "native", id: start.id, sequence: start.sequence }));
                    NativeAttackProjection.prepare(current, replay);
                    waiting.stop(current); current.commit(cooldown);
                    playNativeCopy(current, replay, mefirstId, surge, mefirstScene, recovery,
                        replay.kind === "contact" ? "world_combat.move.mefirst.text.native_contact" : "world_combat.move.mefirst.text.native_projectile");
                    return;
                }
                if (elapsed++ >= window) { miss(current); return; }
                current.after(1, step);
            }
            show(action, window);
            action.after(Math.max(1, Math.round(p(mefirstId, "tempo", action))), current => {
                // Native starts during the initial posture are still fresh only if this is their current beat.
                step(current);
            });
        }
    });
    WorldCombat.on("world_combat:move_mefirst/committed", "world_combat:committed", "", event => {
        const action = event.action();
        if (!action || String(action.content()) !== "world_combat:mefirst") return;
        const raw = action.data("world_combat:mefirst/surge"), executing = NativeLoadout.executing(action);
        if (!raw || !executing) return;
        const surge = JSON.parse(raw), id = String(executing.id());
        if (surge.move !== id || !(Number(surge.factor) > 0)) return;
        MoveExecutions.write(event.world(), "world_combat:mefirst/surge", surge);
        WorldFeedback.emit(event.world(), mefirstScene, 1, action.origin(), { moment: "take", sparks: p(mefirstId, "sparks", action), surge: surge.factor }, 20);
        WorldFeedback.text(event.world(), action.origin().plus(WorldCombat.point(0, 1.15, 0)), mefirstTakeText,
            [{ key: "cobblemon.move." + id, fallback: id }], 30);
        event.world().sound("minecraft:entity.illusioner.mirror_move", action.origin(), 16, "{}");
    });
}
