/**
 * 怨念 / grudge —— 执行组织。
 *
 * 核心念头：把这一手记在心里——谁亲手把你打倒，那份怨念就扑上去，把它送走你的那一招 PP 全部掏空。
 *
 * 两幕 + 收：
 *   起（windup 只在脚边聚起怨念预告，提交前可打断，不花代价）→
 *   立（提交后：挂共享身份 world_combat:status/grudge 的真实 MobEffect，留下机读标记带走画面用的怨念数与半径；
 *       刻骨取向下同时把自己 rooted 在怨念里）。
 *   收（有人亲手把你打倒时）：致命一击在 damage_incoming 阶段被认出并写下待偿标记；damage_applied 确认这一击
 *       真的把使用者打倒（data.after ≤ 0）后，读凶手刚用过的招式（lastMove），把那一手的 PP 清零。
 *       凶手不是宝可梦、或读不到那一手时，怨念只空扑一场（wasted），不会白扣别的资源。
 * 结束：怨念走完自己的时间或被清除时散去（lift）；使用者没被打倒时不会白白发作。
 * 反制：对手在窗口内收住最后一击、用环境或别的来源了结，怨念就收不到那一手；已被怨念缠上时再立会失败。
 */
namespace PokemonSkills {
    function grudgeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }
    const GRUDGE_PENDING = "world_combat_grudge";

    function grudgeMarkView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, grudgeMark);
        return views.length ? views[0] : null;
    }
    function grudgeDropMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, grudgeMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }

    /** 把凶手最后用过的那一手 PP 清零；返回那一手的注册 id，读不到返回 ""。 */
    function grudgeCollect(world: CombatWorld, killer: CombatActor): string {
        if (String(killer.domain()) !== "cobblemon" || !world.valid(killer)) return "";
        const last = NativeEffects.lastMove(world, killer);
        if (last === null) return "";
        const pokemon = CobblemonCombat.pokemon(killer);
        const match = function (move: CombatPokemonMove | null): boolean {
            return move !== null && String(move.id()) === last.id && (!last.key || String(move.key()) === last.key);
        };
        let slot = last.slot;
        if (slot < 0 || slot >= pokemon.moveSlots() || !match(pokemon.move(slot))) {
            slot = -1;
            for (let index = 0; index < pokemon.moveSlots(); index++) if (match(pokemon.move(index))) { slot = index; break; }
        }
        if (slot < 0) return "";
        const move = pokemon.move(slot);
        if (move === null) return "";
        const before = move.pp();
        if (before <= 0) return String(move.id());
        return CobblemonCombat.pp(world, killer, slot, String(move.key()), before, 0) ? String(move.id()) : "";
    }

    WorldCombat.effect(grudgeMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.motes !== "number" || !isFinite(value.motes) || value.motes < 1) throw new Error("Invalid grudge motes");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius < 0) throw new Error("Invalid grudge radius");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid grudge window");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(grudgeMark, "start", function () { });
    WorldCombat.effectHandler(grudgeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: grudgeId,
        cooldownParameter: "recharge",
        name: "怨念",
        description: "当场立下一段怨念：这段时间里谁亲手把你打倒，它刚刚送走你的那一招 PP 会被全部掏空。它不护住你，只让「亲手了结我」在事后付代价；已被怨念缠上时再立会失败。",
        uses: ["惩罚那个一定要亲手补刀的人", "让对手的关键招式再也用不出来", "临死前把对手赖以为生的招废掉"],
        kind: "self",
        range: 0,
        prepare: 9,
        active: 0,
        recover: 7,
        cooldown: 200,
        style: "grudge",
        defaults: { deep: false, ai: { threshold: 0.5, maxChase: 10, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[grudgeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(grudgeId, "tempo", context),
                recover: p(grudgeId, "aftercast", context),
                cooldown: p(grudgeId, "recharge", context),
                active: 0,
                range: 0
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (MobEffects.read(world, self, grudgeEffect) !== null) return "already-watching";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_grudge/mark", grudgeScene, 1, action.origin(),
                JSON.stringify({ moment: "mark", target: String(action.actor().ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 1, geometry: "circle", style: "grudge", color: 0x4B2E83, label: "怨念" }; },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const deep = !!(config && config.deep);
            const ticks = Math.max(80, Math.round(p(grudgeId, "watchTicks", action)));
            const motes = Math.max(6, Math.round(p(grudgeId, "motes", action)));
            const radius = Math.max(0.35, p(grudgeId, "eyeRadius", action));
            MobEffects.apply(world, self, grudgeEffect, ticks, 0);
            grudgeDropMark(world, self);
            world.effect(grudgeMark, self, JSON.stringify({ motes: motes, radius: radius, max: ticks, deep: deep ? 1 : 0 }), ticks);
            if (deep) world.effect("world_combat:rooted", self, "{}", ticks);
            sound(action, "minecraft:entity.vex.charge");
            WorldFeedback.emit(world, grudgeScene, 1, body.position(),
                { moment: "watch", target: String(self.ref()), motes: motes, scale: radius / 0.4, deep: deep ? 1 : 0 }, 32);
            WorldFeedback.text(world, grudgeAbove(body.position()), grudgeMarkText, [Math.round(ticks / 20)], 32);
            done(action);
        }
    });

    // 致命一击的认出：只写待偿标记，不改伤害、不拒绝；真正是否倒下由 damage_applied 用 after 确认。
    WorldCombat.on("world_combat:move_grudge/guard", "world_combat:damage_incoming", "", function (event) {
        const world = event.world(), target = event.target(), source = event.actor();
        if (target === null || source === null || !world.valid(target)) return;
        // The event world's source is the attacker, so friendliness is read from the victim's side.
        if (String(source.key()) === String(target.key()) || world.friendly(target)) return;
        if (MobEffects.read(world, target, grudgeEffect) === null) return;
        const body = world.observe(target);
        if (body === null) return;
        const data = JSON.parse(String(event.data()));
        if (typeof data.amount !== "number" || !isFinite(data.amount) || data.amount < body.health()) return;
        const view = grudgeMarkView(world, target);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        data[GRUDGE_PENDING] = { motes: mark.motes || 10, radius: mark.radius || 0.4 };
        event.data(JSON.stringify(data));
    });

    // 待偿：使用者真的被这一击打倒时，掏空凶手那一手的 PP。
    WorldCombat.on("world_combat:move_grudge/toll", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        const pending = data[GRUDGE_PENDING];
        if (!pending || !(data.after <= 0)) return;
        const world = event.world(), killer = event.actor();
        if (killer === null || !world.valid(killer)) return;
        const body = world.observe(killer);
        if (body === null || body.health() <= 0) return;
        const at = WorldCombat.point(typeof data.x === "number" ? data.x : 0, typeof data.y === "number" ? data.y : 0, typeof data.z === "number" ? data.z : 0);
        const drained = grudgeCollect(world, killer);
        const path: any[] = [[at.x(), at.y(), at.z()], String(killer.ref())];
        if (drained) {
            world.sound("minecraft:block.sculk_shrieker.shriek", body.position(), 16, "{}");
            WorldFeedback.emit(world, grudgeScene, 1, body.position(),
                { moment: "collect", target: String(killer.ref()), motes: pending.motes || 10, path: path }, 44);
            WorldFeedback.text(world, grudgeAbove(body.position()), grudgeDrainText, [], 40);
            return;
        }
        WorldFeedback.emit(world, grudgeScene, 1, body.position(),
            { moment: "wasted", target: String(killer.ref()), motes: pending.motes || 10, path: path }, 34);
        WorldFeedback.text(world, grudgeAbove(body.position()), grudgeWastedText, [], 34);
    });

    // 持续：每 20 刻续一次怨念画面，密度随剩余比例变化。
    WorldCombat.on("world_combat:move_grudge/watch", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== grudgeEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const view = grudgeMarkView(world, actor);
        if (view === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = JSON.parse(String(view.data()));
        const surge = Math.max(0, Math.min(1, view.remaining() / Math.max(1, mark.max || 1)));
        WorldFeedback.keep(world, "world_combat:move_grudge/state/" + String(actor.ref()), grudgeScene, 1, body.position(),
            { moment: "watch", target: String(actor.ref()), motes: mark.motes || 10, surge: surge,
                scale: Math.max(0.6, (mark.radius || 0.4) / 0.4) }, 40);
    });

    // 结束：怨念散去。使用者已经倒下时不播（它随死亡一起消失）。
    WorldCombat.on("world_combat:move_grudge/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== grudgeEffect) return;
        const world = event.world(), actor = event.actor();
        grudgeDropMark(world, actor);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, grudgeScene, 1, body.position(),
            { moment: "lift", target: String(actor.ref()), expired: String(data.cause) === "expired" ? 1 : 0 }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, grudgeAbove(body.position()), grudgeLiftText, [], 28);
    });
}
