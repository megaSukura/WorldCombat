/** grudge：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    function grudgeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }
    const GRUDGE_PENDING = "world_combat_grudge";
    // 一次结怨的会话内记录：同一场死亡只结一次。
    const grudgeSettled: { [key: string]: boolean } = Object.create(null);

    /** 普通攻击按伤害类型归成可读的攻击类别。 */
    function grudgeKind(type: string): string {
        const value = String(type || "");
        if (value === "minecraft:mob_attack" || value === "minecraft:mob_attack_no_aggro" || value === "minecraft:player_attack"
            || value === "minecraft:sting" || value === "minecraft:ram" || value === "minecraft:mace_smash") return "melee";
        if (value === "minecraft:arrow" || value === "minecraft:trident" || value === "minecraft:mob_projectile" || value === "minecraft:thrown") return "ranged";
        if (value === "minecraft:magic" || value === "minecraft:indirect_magic" || value === "minecraft:wither_skull"
            || value === "minecraft:dragon_breath" || value === "minecraft:sonic_boom") return "magic";
        return "other";
    }

    function grudgeMarkView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, grudgeMark);
        return views.length ? views[0] : null;
    }
    function grudgeDropMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, grudgeMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }
    /** 只收回本实例记下的那一根 root；别人的定身不动。 */
    function grudgeDropRoot(world: CombatWorld, actor: CombatActor, mark: any): void {
        if (mark && typeof mark.rootId === "number" && mark.rootId > 0) world.operation(mark.rootId, "world_combat:dispel", "{}");
    }
    function grudgeTeardown(world: CombatWorld, actor: CombatActor, mark: any): void {
        grudgeDropMark(world, actor);
        grudgeDropRoot(world, actor, mark);
    }

    /**
     * 掏空凶手为那一手真正付出 PP 的原槽。真人配招那一槽就是 data.move，但借招／替换时 data.move 只是执行的设计，
     * 资源仍记在原始槽上：先按本次事件捕获的 slot 找，再退回按槽的有效 selection 或 move id 匹配。找不到就不动它后来换上的招。
     */
    function grudgeCollect(world: CombatWorld, killer: CombatActor, moveId: string, slot: number): string {
        if (String(killer.domain()) !== "cobblemon" || !world.valid(killer)) return "";
        const pokemon = CobblemonCombat.pokemon(killer);
        function drain(slotIndex: number, move: CombatPokemonMove): string {
            const before = move.pp();
            if (before <= 0) return String(move.id());
            return CobblemonCombat.pp(world, killer, slotIndex, String(move.key()), before, 0) ? String(move.id()) : "";
        }
        if (typeof slot === "number" && slot >= 0 && slot < pokemon.moveSlots()) {
            const move = pokemon.move(slot);
            if (move !== null) return drain(slot, move);
        }
        for (let slotIndex = 0; slotIndex < pokemon.moveSlots(); slotIndex++) {
            const move = pokemon.move(slotIndex);
            if (move === null) continue;
            const design = NativeLoadout.selection(world, slotIndex, move, killer).id;
            if (design !== moveId && String(move.id()) !== moveId) continue;
            return drain(slotIndex, move);
        }
        return "";
    }
    /** 被掏空（或封住）的那一手的可读标签：宝可梦用招名，普通生物用攻击类别。 */
    function grudgeLabel(drained: string, native: boolean, type: string): any {
        if (native) return { key: "world_combat.move.grudge.kind." + grudgeKind(type), fallback: String(type || drained) };
        return { key: "cobblemon.move." + drained, fallback: drained };
    }

    WorldCombat.effect(grudgeMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.motes !== "number" || !isFinite(value.motes) || value.motes < 1) throw new Error("Invalid grudge motes");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius < 0) throw new Error("Invalid grudge radius");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid grudge window");
        if (value.rootId !== undefined && (typeof value.rootId !== "number" || !isFinite(value.rootId) || value.rootId < 0))
            throw new Error("Invalid grudge root");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid grudge carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(grudgeMark, "start", function (effect) {
        // 只有承载身份的载体还在身，标记才成立；刷新成新 revision 或已被驱散时不留无主画面。
        const world = effect.world(), actor = effect.target(), data = JSON.parse(effect.state());
        if (world.observe(actor) === null || !MobEffects.matches(world, actor, data.carrier)) effect.end();
    });
    WorldCombat.effectHandler(grudgeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    const grudgeDebt = "world_combat:grudge_debt", grudgeToll = "world_combat:grudge_toll";
    WorldCombat.effect(grudgeDebt, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(grudgeDebt, "start", () => {});
    WorldCombat.effectHandler(grudgeDebt, "operation:world_combat:dispel", function (effect) { effect.end(); });
    CombatStatus.actions.define({ id: "world_combat:move_grudge/debt", apply: context => {
        if (context.phase !== "damage" || !DamageSemantics.read(context.metadata).attack
            || MobEffects.read(context.world, context.actor, grudgeToll) === null) return;
        const views = context.world.effects(context.actor, grudgeDebt);
        if (views.some(view => JSON.parse(String(view.data())).type === String(context.metadata.damageType))) context.blocked.grudged = true;
    } });
    // 偿债印记与它的禁伤记录同来源：印记被牛奶／清除拿掉时，记录跟着一起收。
    WorldCombat.on("world_combat:move_grudge/forgive", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== grudgeToll) return;
        const world = event.world(), actor = event.actor();
        const views = world.effects(actor, grudgeDebt);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    });

    define({
        freeMovement: function (config) { return !!config.deep; },
        id: grudgeId,
        cooldownParameter: "recharge",
        name: "怨念",
        description: "在自己身上立下怨念。期间被敌人打倒时，清空宝可梦凶手致命招式的PP；普通生物或玩家用来击杀的攻击方式则被封住10秒。",
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
            // 先申请真实载体；被原生拒绝（免疫等）就不立标记、不挂 root、不记账。
            const carrier = MobEffects.apply(world, self, grudgeEffect, ticks, 0);
            if (carrier === null) { done(action); return; }
            grudgeSettled[String(self.key())] = false;
            grudgeDropMark(world, self);
            let rootId = 0;
            if (deep) rootId = world.effect("world_combat:rooted", self, "{}", ticks);
            const bind = deep ? motes : 0;
            const markId = world.effect(grudgeMark, self,
                JSON.stringify({ motes: motes, radius: radius, max: ticks, deep: deep ? 1 : 0, rootId: rootId, carrier: MobEffects.anchor(carrier) }), ticks);
            // 标记被拒：收回刚挂的 root，账本也不留。
            if (markId <= 0) {
                if (rootId > 0) world.operation(rootId, "world_combat:dispel", "{}");
                done(action); return;
            }
            sound(action, "minecraft:entity.vex.charge");
            // 持续画面绑在真正的托管标记上：标记被收走或刷新成新 revision，画面随之结束。
            WorldFeedback.onEffect(world, markId, "state", grudgeScene, 1, body.position(),
                { moment: "watch", target: String(self.ref()), motes: motes, bind: bind, surge: 1, scale: Math.max(0.6, radius / 0.4) });
            WorldFeedback.text(world, grudgeAbove(body.position()), grudgeMarkText, [Math.round(ticks / 20)], 32);
            done(action);
        }
    });

    // 怨念快照：每次符合「非友方、另一个来源」的一击都记下，不预估是否致死，并把本次付 PP 的原槽一起带走。
    WorldCombat.on("world_combat:move_grudge/guard", "world_combat:damage_incoming", "", function (event) {
        const world = event.world(), target = event.target(), source = event.actor();
        if (target === null || source === null || !world.valid(target)) return;
        // The event world's source is the attacker, so friendliness is read from the victim's side.
        if (String(source.key()) === String(target.key()) || world.friendly(target)) return;
        if (MobEffects.read(world, target, grudgeEffect) === null || grudgeSettled[String(target.key())]) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.amount > 0)) return;
        const view = grudgeMarkView(world, target);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        const action = event.action(), invocation = action === null ? null : NativeLoadout.invocation(action);
        data[GRUDGE_PENDING] = { motes: mark.motes || 10, radius: mark.radius || 0.4,
            slot: invocation !== null ? invocation.slot : -1 };
        event.data(JSON.stringify(data));
    });

    // 结怨：最终 after ≤ 0 且是这一击打倒时，按致死回执里真正的那一手／那一种攻击结账。
    WorldCombat.on("world_combat:move_grudge/toll", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        const pending = data[GRUDGE_PENDING];
        if (!pending || !(data.after <= 0)) return;
        const world = event.world(), victim = event.target(), killer = event.actor();
        if (victim === null || killer === null || !world.valid(killer)) return;
        if (String(killer.key()) === String(victim.key()) || grudgeSettled[String(victim.key())]) return;
        grudgeSettled[String(victim.key())] = true;
        const view = grudgeMarkView(world, victim);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        grudgeTeardown(world, victim, mark);
        const carrier = MobEffects.read(world, victim, grudgeEffect);
        if (carrier !== null) world.removeMobEffect(victim, grudgeEffect, carrier.key());
        const body = world.observe(killer);
        if (body === null || body.health() <= 0) return;
        const at = WorldCombat.point(typeof data.x === "number" ? data.x : 0, typeof data.y === "number" ? data.y : 0, typeof data.z === "number" ? data.z : 0);
        const moveId = String(data.move || "");
        let drained = grudgeCollect(world, killer, moveId, pending.slot);
        let native = false;
        if (!drained && String(killer.domain()) !== "cobblemon" && DamageSemantics.read(data).attack) {
            const toll = MobEffects.apply(world, killer, grudgeToll, 200, 0);
            if (toll !== null) {
                world.effect(grudgeDebt, killer, JSON.stringify({ type: String(data.damageType) }), 200);
                drained = String(data.damageType); native = true;
            }
        }
        const path: any[] = [[at.x(), at.y(), at.z()], String(killer.ref())];
        if (drained) {
            world.sound("minecraft:block.sculk_shrieker.shriek", body.position(), 16, "{}");
            WorldFeedback.emit(world, grudgeScene, 1, body.position(),
                { moment: "collect", target: String(killer.ref()), motes: pending.motes || 10, path: path }, 44);
            WorldFeedback.text(world, grudgeAbove(body.position()), grudgeDrainText, [grudgeLabel(drained, native, String(data.damageType))], 40);
            return;
        }
        WorldFeedback.emit(world, grudgeScene, 1, body.position(),
            { moment: "wasted", target: String(killer.ref()), motes: pending.motes || 10, path: path }, 34);
        WorldFeedback.text(world, grudgeAbove(body.position()), grudgeWastedText, [], 34);
    });

    // 持续：每 20 刻更新一次怨念画面，密度随剩余比例变化；刷新后旧标记立即收束。
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
        if (!MobEffects.matches(world, actor, mark.carrier)) { grudgeTeardown(world, actor, mark); return; }
        const surge = Math.max(0, Math.min(1, view.remaining() / Math.max(1, mark.max || 1)));
        WorldFeedback.onEffect(world, view.id(), "state", grudgeScene, 1, body.position(),
            { moment: "watch", target: String(actor.ref()), motes: mark.motes || 10,
                bind: mark.deep ? (mark.motes || 10) : 0, surge: surge,
                scale: Math.max(0.6, (mark.radius || 0.4) / 0.4) });
    });

    // 结束：怨念散去，本招的 root 与标记一起收回。使用者已经倒下时不播（它随死亡一起消失）。
    WorldCombat.on("world_combat:move_grudge/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== grudgeEffect) return;
        const world = event.world(), actor = event.actor();
        const view = grudgeMarkView(world, actor);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        grudgeTeardown(world, actor, mark);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, grudgeScene, 1, body.position(),
            { moment: "lift", target: String(actor.ref()), expired: String(data.cause) === "expired" ? 1 : 0 }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, grudgeAbove(body.position()), grudgeLiftText, [], 28);
    });
}
