/**
 * 抢先一步 / mefirst —— 注册、夺招增幅与动作（自管节奏）。
 *
 * 借对手的下一拍必须在提交之前交接（NativeLoadout.call），所以本招自己驱动动作：
 *   起：脚下压出一圈抢先的光痕（action.present 预告），目光锁住对手。
 *   守：记下目标此刻的最近一次出手，在 vigil 窗口里逐刻等它下一次真正提交；出现可抢的伤害招时，
 *       把夺招增幅写进 action.data，经 NativeLoadout.call 把那一手先打出去。
 *   落：借来的招式提交时，committed 监听把增幅挂到施法者身上、补上浮字与音效；伤害发生在提交之后，来得及生效。
 *   抢空：窗口走完对手仍没出招，就退回不结账（与挥指一致，失败不扣 PP）。
 *
 * 与鹦鹉学舌分开：鹦鹉学舌折的是已经落下的那一手；抢先一步夺的是守候窗口里对手刚要出的下一拍，并加重。
 * 与模仿分开：模仿把那一手永久织进自己的招式格；抢先一步只用这一下，用完就散。
 */
namespace PokemonSkills {
    // 夺招增幅的机读载体：记下被夺的那一手与倍率；伤害元数据按它乘威力。
    WorldCombat.effect(mefirstSurgeEffect, 1, 200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.move !== "string" || !value.move) throw new Error("Invalid me-first move");
        if (typeof value.factor !== "number" || !isFinite(value.factor) || value.factor < 1) throw new Error("Invalid me-first factor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mefirstSurgeEffect, "start", function () { });
    WorldCombat.effectHandler(mefirstSurgeEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    PokemonDamage.metadata.define({ id: "world_combat:move_mefirst/surge", apply: function (context) {
        if (!context.world || !context.actor) return;
        const views = context.world.effects(context.actor, mefirstSurgeEffect);
        if (!views.length) return;
        const data = JSON.parse(String(views[0].data()));
        if (String(data.move) !== String(context.metadata.move)) return;
        const factor = Number(data.factor);
        if (isFinite(factor) && factor > 0) context.metadata.power *= factor;
    } });

    /** 可被抢的出手：已实装、非变化招、不带 failmefirst 旗标。 */
    export function mefirstCopyable(id: string): boolean {
        if (!skills[id]) return false;
        try {
            const move = CobblemonCombat.moveTemplate(id);
            if (String(move.category()) === "status") return false;
            return !NativeLoadout.facts(move).flags.failmefirst;
        } catch (error) { return false; }
    }

    /** 把夺来的一手瞄准目标本人；自用招仍作用于自己。 */
    export function mefirstCall(action: CombatAction, id: string, target: CombatActor | null): NativeLoadout.CallOptions | null {
        const skill = skills[id];
        if (!skill) return null;
        if (skill.kind === "self") return { eligibility: "caller", input: {} };
        const world = action.sense();
        if (skill.kind === "friend") {
            const self = action.actor(), body = world.observe(self);
            return body ? { eligibility: "caller", input: { target: self, point: body.position() } } : null;
        }
        if (target === null || !world.valid(target)) return null;
        const body = world.observe(target);
        if (body === null) return null;
        const point = body.position();
        let direction = point.minus(action.origin());
        if (direction.length() < 0.01) direction = action.direction();
        return { eligibility: "caller", input: { target: skill.kind === "enemy" ? target : null, point: point, direction: direction } };
    }

    define({
        id: mefirstId,
        name: "抢先一步",
        description: "压下身体守候一名对手的下一拍：它一出手，就抢先使出同款伤害招并加重；守候期内它没再出招就落空。",
        uses: ["把对手刚酝酿的强攻抢来先打", "压住要蓄力一击的敌人", "在对手的连击间隙夺走主动"],
        kind: "enemy",
        range: 11,
        maxRange: 17,
        prepare: 5,
        active: 0,
        recover: 5,
        cooldown: 50,
        style: "leap",
        defaults: { patient: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            return { radius: p(mefirstId, "reach", pokemon), geometry: "line", style: "leap", color: 0xFFB347,
                label: read(config, ["patient"]) === true ? "抢先一步·耐心" : "抢先一步" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[mefirstId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p(mefirstId, "tempo", context),
                recover: p(mefirstId, "aftercast", context),
                cooldown: p(mefirstId, "recharge", context),
                active: 0,
                range: p(mefirstId, "reach", context)
            };
        },
        run: function (action, _move, _config) {
            const sparks = Math.max(1, Math.round(p(mefirstId, "sparks", action)));
            const window = Math.max(1, Math.round(p(mefirstId, "vigil", action)));
            const surge = p(mefirstId, "surge", action);
            const target = action.target();
            action.present("world_combat:move_mefirst:read", mefirstScene, 1, action.origin(),
                JSON.stringify({ moment: "read", sparks: sparks, target: target === null ? "" : String(target.ref()) }));

            function miss(handle: CombatAction, targetRef: string): void {
                handle.present("world_combat:move_mefirst:miss", mefirstScene, 1, handle.origin(),
                    JSON.stringify({ moment: "miss", sparks: sparks, target: targetRef }));
                handle.reject("no-beat");
            }

            // 起念的一刻就把“对手上一拍”记下：守候期间它再出手，无论多早都能被夺。
            const opening = action.sense();
            const seen = target !== null && opening.valid(target) ? NativeEffects.lastMove(opening, target) : null;
            const openingTick = seen === null ? -1000 : seen.tick;
            action.after(Math.max(1, Math.round(p(mefirstId, "tempo", action))), function (current) {
                if (target === null || !current.sense().valid(target)) { miss(current, ""); return; }
                const start = current.sense().tick();
                let baseline = openingTick;

                const snap = Math.max(1, Math.round(p(mefirstId, "snap", current)));
                function step(handle: CombatAction, elapsed: number): void {
                    const scope = handle.sense();
                    if (!scope.valid(target!)) { miss(handle, String(target!.ref())); return; }
                    const last = NativeEffects.lastMove(scope, target!);
                    // 抢的是「刚落下」或「守候期间新出现」的那一拍：同拍窗口内刚出手的也能追上，不必非等下一拍。
                    const fresh = last !== null && (last.tick > baseline || last.tick >= 0 && scope.tick() - last.tick <= snap);
                    if (fresh) {
                        if (last!.tick > baseline) baseline = last!.tick;
                        const id = String(last!.id);
                        if (mefirstCopyable(id)) {
                            const options = mefirstCall(handle, id, target!);
                            if (options !== null) {
                                handle.data("world_combat:mefirst/surge", JSON.stringify({ move: id, factor: surge }));
                                handle.present("world_combat:move_mefirst:take", mefirstScene, 1, handle.origin(),
                                    JSON.stringify({ moment: "take", sparks: sparks, surge: surge, target: String(target!.ref()),
                                        path: [String(handle.actor().ref()), String(target!.ref())] }));
                                NativeLoadout.call(handle, id, { input: options.input, eligibility: "caller", cooldown: p(mefirstId, "recharge", handle) });
                                return;
                            }
                        }
                    }
                    if (elapsed >= window || scope.tick() - start >= window) { miss(handle, String(target!.ref())); return; }
                    handle.after(1, function (next) { step(next, elapsed + 1); });
                }
                step(current, 0);
            });
        }
    });

    // 夺来的那一手提交的那一刻：挂上增幅、补上浮字与音效。
    WorldCombat.on("world_combat:move_mefirst/committed", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || String(action.content()) !== "world_combat:mefirst") return;
        const world = event.world(), actor = event.actor(), executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const id = String(executing.id());
        const raw = action.data("world_combat:mefirst/surge");
        if (raw !== null) {
            const surge = JSON.parse(raw);
            if (surge.move === id && Number(surge.factor) > 0) world.effect(mefirstSurgeEffect, actor, JSON.stringify(surge), 90);
        }
        WorldFeedback.emit(world, mefirstScene, 1, body.position(),
            { moment: "take", sparks: Math.max(1, Math.round(p(mefirstId, "sparks", action))), surge: p(mefirstId, "surge", action) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), mefirstTakeText,
            [{ key: "cobblemon.move." + id, fallback: id }], 34);
        world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 16, "{}");
    });
}
