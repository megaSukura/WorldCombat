/** encore：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    function encoreAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 被点名那个动作的可读标签：宝可梦原生招用 Cobblemon 译名，本作脚本动作用本作名，读不出就退回 id。 */
    function encoreAllowedArg(loop: any): any {
        const id = String(loop && loop.id || "");
        if (loop && loop.label === "move") return { key: "cobblemon.move." + id, fallback: id };
        const skill = skills[id];
        if (skill) return { key: skill.nameKey || "cobblemon.move." + id, fallback: skill.name || id };
        return { key: "cobblemon.move." + id, fallback: id };
    }

    /** 回声标记：记录被点名的那一个动作身份与画面要用的数。 */
    function encoreLoopView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, encoreLoop);
        return views.length ? views[0] : null;
    }
    function encoreLoopOf(world: CombatWorld, actor: CombatActor): any {
        const view = encoreLoopView(world, actor);
        return view === null ? null : JSON.parse(String(view.data()));
    }
    /** 这个回声是否仍属于此刻的载体；刷新出新载体时，旧载体的事件不能再拆新锁。 */
    function encoreLoopCurrent(world: CombatWorld, actor: CombatActor, loop: any): boolean {
        return !!loop && typeof loop.carrierKey === "string"
            && MobEffects.matches(world, actor, { id: encoreEffect, key: loop.carrierKey });
    }
    /** 收回回声标记；`only` 不再使用资源层，靠本招的准入/提交闸门读回声。 */
    function encoreDropLoop(world: CombatWorld, actor: CombatActor, mode: "current" | "stale"): void {
        const views = world.effects(actor, encoreLoop);
        for (let i = 0; i < views.length; i++) {
            const loop = JSON.parse(String(views[i].data()));
            const current = encoreLoopCurrent(world, actor, loop);
            if (mode === "current" ? !current : current) continue;
            world.operation(views[i].id(), "world_combat:dispel", "{}");
        }
    }
    /** 提前结束：先撤自己的回声，再拿掉身份效果。 */
    function encoreRelease(world: CombatWorld, actor: CombatActor, loop: any): void {
        encoreDropLoop(world, actor, "current");
        const effect = MobEffects.read(world, actor, encoreEffect);
        if (effect !== null) world.removeMobEffect(actor, encoreEffect, effect.key());
    }
    /** 被外力清除或到期：只收回回声；是否播退场由调用处决定。 */
    function encoreTeardown(world: CombatWorld, actor: CombatActor, loop: any): void {
        // 若此刻已挂着更新的载体，这个旧载体的移除事件只收掉旧回声，不拆新锁。
        encoreDropLoop(world, actor, "stale");
    }
    /** 持续回声的固定 key；结束时用它发一条停止回执，画面不会比锁定多留。 */
    function encoreEchoKey(actor: CombatActor): string { return "world_combat:move_encore/echo/" + String(actor.ref()); }
    function encoreStopEcho(world: CombatWorld, actor: CombatActor): void {
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, encoreEchoKey(actor), encoreScene, 1, body.position(),
            { moment: "echo", lifecycle: { reason: "settled", tick: world.tick() } }, 4);
    }
    /** 被顶回时的一眼可见：头顶划下一道否定线，叉掉它想换的那一手／动作。 */
    function encoreShowReject(world: CombatWorld, actor: CombatActor, loop: any): void {
        const body = world.observe(actor);
        if (body === null) return;
        const head = body.position().plus(WorldCombat.point(0, Math.max(0.9, body.height() * 0.8), 0));
        const half = Math.max(0.24, 0.18 + (loop.radius || 0.35) * 0.4);
        const path = [
            [head.x() - half, head.y() + half, head.z()],
            [head.x() + half, head.y() - half, head.z()]
        ];
        WorldFeedback.emit(world, encoreScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), motes: loop.motes || 10, path: path,
                scale: Math.max(0.5, (loop.radius || 0.35) / 0.35) }, 22);
        WorldFeedback.text(world, encoreAbove(body.position()), encoreRejectText, [encoreAllowedArg(loop)], 26);
    }

    /**
     * 所有活体（宝可梦、原版生物、其他模组生物）真正提交动作都会发布 MoveExecutions.committed。
     * 本单元只取它的**动作内容身份** content（`action.content()`）；原生投递没有动作，只留伤害签名，
     * 不在这里把它当成一次起手，也不在伤害层去追。
     */
    export function encoreCommitted(world: CombatWorld, actor: CombatActor): { content: string; tick: number; diversity: number } | null {
        if (!world.valid(actor)) return null;
        const views = world.effects(actor, encoreCommits);
        if (!views.length) return null;
        const value = JSON.parse(String(views[views.length - 1].data()));
        const content = String(value && value.lastAction || "");
        const tick = value && typeof value.actionTick === "number" && isFinite(value.actionTick) ? value.actionTick : -1000;
        const identities = value && Array.isArray(value.identities) ? value.identities : [];
        return { content: content, tick: tick, diversity: Math.max(1, identities.length) };
    }

    WorldCombat.effect(encoreCommits, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.lastAction !== "string") throw new Error("Invalid encore commit identity");
        if (!Array.isArray(value.identities)) throw new Error("Invalid encore commit history");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(encoreCommits, "start", function () { });
    WorldCombat.effectHandler(encoreCommits, "operation:world_combat:dispel", function (effect) { effect.end(); });
    MoveExecutions.committed.define({ id: "world_combat:move_encore/commit", apply: function (commit) {
        const world = commit.world, actor = commit.actor;
        if (!world.valid(actor)) return;
        const content = commit.action !== null && commit.action !== undefined ? String(commit.action.content() || "") : "";
        const identity = content || "native:" + String(commit.metadata && commit.metadata[0] && commit.metadata[0].damageType || "");
        if (!identity) return;
        const views = world.effects(actor, encoreCommits), identities: string[] = [];
        let lastAction = "", actionTick = -1000;
        if (views.length) {
            const previous = JSON.parse(String(views[views.length - 1].data()));
            (previous && previous.identities || []).forEach(function (value: string) { if (identities.indexOf(value) < 0) identities.push(value); });
            lastAction = String(previous && previous.lastAction || "");
            actionTick = previous && typeof previous.actionTick === "number" ? previous.actionTick : -1000;
        }
        if (identities.indexOf(identity) < 0) identities.push(identity);
        while (identities.length > 4) identities.shift();
        if (content) { lastAction = content; actionTick = world.tick(); }
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
        world.effect(encoreCommits, actor, JSON.stringify({ identities: identities, lastAction: lastAction, actionTick: actionTick }), 1200);
    } });

    WorldCombat.effect(encoreLoop, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.allowed !== "string" || !value.allowed) throw new Error("Invalid encore identity");
        if (typeof value.ticks !== "number" || !isFinite(value.ticks) || value.ticks < 1) throw new Error("Invalid encore duration");
        if (typeof value.carrierKey !== "string" || !value.carrierKey) throw new Error("Invalid encore carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(encoreLoop, "start", function () { });
    WorldCombat.effectHandler(encoreLoop, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 当前要提交的动作身份：本作动作读 action.content()，宝可梦原生配招在准入/提交点读同一种内容身份。 */
    function encoreCommitIdentity(context: CombatStatus.ActionPolicy): string {
        const action = context.action;
        if (action !== null && action !== undefined && typeof action.content === "function") {
            const content = String(action.content() || ""); if (content) return content;
        }
        const move = context.move;
        if (move && typeof move.id === "function") { const id = String(move.id() || ""); if (id) return "world_combat:" + id; }
        return "";
    }

    // 封锁：带身份者在起手/提交点只能重复被点名的那一个动作身份，换别的动作被顶回。
    // 不作用在伤害阶段——已经发出的攻击不会被本招自拒；没有提交动作身份的原生攻击不在本招能停的范围内。
    CombatStatus.actions.define({ id: "world_combat:move_encore/lock", apply: function (context) {
        if (context.phase === "damage") return;
        const world = context.world, actor = context.actor;
        if (!world.valid(actor)) return;
        const loop = encoreLoopOf(world, actor);
        if (loop === null || typeof loop.allowed !== "string" || !loop.allowed) return;
        const identity = encoreCommitIdentity(context);
        if (identity && identity !== loop.allowed) {
            context.blocked.encored = true;
            context.detail.encored = { status: "encore", move: String(loop.id || "") };
        }
    } });

    // 被顶回的回执：只把「叉掉」演出来，不在伤害层追加任何惩罚。
    CombatStatus.rejected.define({ id: "world_combat:move_encore/reject", applies: function (context) {
        return String(context.reason) === "encored";
    }, apply: function (context) {
        const world = context.world, actor = context.actor;
        if (!world.valid(actor)) return;
        const loop = encoreLoopOf(world, actor);
        if (loop === null) return;
        encoreShowReject(world, actor, loop);
    } });

    define({
        id: encoreId,
        cooldownParameter: "recharge",
        name: "再来一次",
        description: "点名目标刚提交过的一个动作，让它暂时只能重复这个动作。宝可梦按上一手真实招式，普通生物与模组生物按它真正提交的动作身份；没有提交动作的原生攻击不会被追回。",
        uses: ["把刚做过的布置或强化锁死，逼它一直重复", "打断对手的连招节奏，让它只能做同一件事", "拖住一个刚露出破绽的对手"],
        kind: "enemy",
        range: 4,
        maxRange: 9,
        prepare: 8,
        active: 0,
        recover: 5,
        cooldown: 120,
        style: "encore",
        defaults: { strict: false, ai: { maxAge: 160, maxChase: 12, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[encoreId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(encoreId, "tempo", context),
                recover: p(encoreId, "aftercast", context),
                cooldown: p(encoreId, "recharge", context),
                active: 0,
                range: p(encoreId, "reach", context)
            };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_encore/call", encoreScene, 1, action.origin(),
                JSON.stringify({ moment: "call", target: String(action.actor().ref()) }));
            return prepare;
        },
        indicator: function () {
            return { radius: 4, geometry: "line", style: "encore", color: 0xF2C14E, label: "再来一次" };
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            sound(action, "minecraft:block.note_block.chime");
            const at = world.observe(target) === null ? action.targetPosition() : world.observe(target)!.position();
            const memory = p(encoreId, "memory", action);
            let allowed = "", id = "", label = "action", slot = -1, key = "";
            if (String(target.domain()) === "cobblemon") {
                // 宝可梦走真实原生招式签名：只重复上一手真正提交的招；败招、用尽 PP 或不再记得就不再点名。
                const last = NativeEffects.lastMove(world, target);
                if (last !== null && world.tick() - last.tick <= memory) {
                    const template = CobblemonCombat.moveTemplate(last.id);
                    if (!NativeLoadout.facts(template).flags.failencore) {
                        const pokemon = CobblemonCombat.pokemon(target), s = last.slot;
                        const stored = s >= 0 && s < pokemon.moveSlots() ? pokemon.move(s) : null;
                        if (stored !== null && String(stored.id()) === last.id && stored.pp() > 0) {
                            allowed = "world_combat:" + last.id; id = last.id; label = "move"; slot = s; key = String(last.key || "");
                        }
                    }
                }
            } else {
                // 普通生物与模组生物：按真正提交的动作内容身份（不猜没见过的招）。
                const committed = encoreCommitted(world, target);
                if (committed !== null && committed.content && world.tick() - committed.tick <= memory) {
                    allowed = committed.content; id = allowed.replace(/^world_combat:/, ""); label = "action";
                }
            }
            if (!allowed) {
                WorldFeedback.emit(world, encoreScene, 1, at, { moment: "miss", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, encoreAbove(at), encoreMissText, [], 28);
                done(action);
                return;
            }
            const ticks = Math.max(60, Math.round(p(encoreId, "callTicks", action)));
            const motes = Math.max(6, Math.round(p(encoreId, "motes", action)));
            const radius = Math.max(0.3, p(encoreId, "loopRadius", action));
            // 身份效果落下后才有回声；载体没落成就不制造旁路锁定。
            const carrier = MobEffects.apply(world, target, encoreEffect, ticks, 0);
            if (carrier === null) {
                WorldFeedback.emit(world, encoreScene, 1, at, { moment: "miss", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, encoreAbove(at), encoreMissText, [], 28);
                done(action);
                return;
            }
            // 旧载体留下的回声先收掉；只在它确实不是此刻载体时收，避免拆掉刚刷新出的新载体。
            encoreDropLoop(world, target, "stale");
            world.effect(encoreLoop, target, JSON.stringify({ allowed: allowed, id: id, label: label, slot: slot, key: key,
                ticks: ticks, max: ticks, motes: motes, radius: radius, carrierKey: String(carrier.key()) }), ticks);
            WorldFeedback.emit(world, encoreScene, 1, at,
                { moment: "loop", target: String(target.ref()), motes: motes, scale: radius / 0.35 }, 34);
            WorldFeedback.text(world, encoreAbove(at), encoreLockText, [Math.round(ticks / 20), encoreAllowedArg({ id: id, label: label })], 34);
            done(action);
        }
    });

    // 持续：回声期间每 20 刻续一次音符；被点名的宝可梦招式用尽 PP 或不再记得时提前散开。
    WorldCombat.on("world_combat:move_encore/watch", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== encoreEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const view = encoreLoopView(world, actor);
        if (view === null) return;
        const loop = JSON.parse(String(view.data()));
        if (String(actor.domain()) === "cobblemon" && loop.label === "move") {
            const pokemon = CobblemonCombat.pokemon(actor);
            let found = false;
            for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
                const move = pokemon.move(slot);
                if (move !== null && String(move.id()) === loop.id && move.pp() > 0) { found = true; break; }
            }
            if (!found) {
                const body = world.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(world, encoreScene, 1, body.position(), { moment: "spent", target: String(actor.ref()) }, 26);
                    WorldFeedback.text(world, encoreAbove(body.position()), encoreFadeText, [], 26);
                }
                encoreStopEcho(world, actor);
                encoreRelease(world, actor, loop);
                return;
            }
        }
        if (world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const surge = Math.max(0, Math.min(1, view.remaining() / Math.max(1, loop.max || 1)));
        WorldFeedback.keep(world, encoreEchoKey(actor), encoreScene, 1, body.position(),
            { moment: "echo", target: String(actor.ref()), motes: loop.motes || 10, surge: surge, scale: Math.max(0.5, (loop.radius || 0.35) / 0.35) }, 40);
        // 持续把允许的那一个动作重新点明；环形画面之外也一直读得到限制。
        if (world.tick() % 40 === 0)
            WorldFeedback.text(world, encoreAbove(body.position()), encoreLockText,
                [Math.round(view.remaining() / 20), encoreAllowedArg(loop)], 40);
    });

    // 结束：到期安静散开；被外力清除时只收回回声与身份，不播退场。
    WorldCombat.on("world_combat:move_encore/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== encoreEffect) return;
        const world = event.world(), actor = event.actor();
        const view = encoreLoopView(world, actor);
        if (view === null) return;
        const loop = JSON.parse(String(view.data()));
        encoreTeardown(world, actor, loop);
        if (String(data.cause) !== "expired" || !world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        encoreStopEcho(world, actor);
        WorldFeedback.emit(world, encoreScene, 1, body.position(), { moment: "release", target: String(actor.ref()) }, 24);
    });
}
