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

    /** 按致死回执里的招式 id 掏空凶手那一手 PP；找不到那一手就什么都不做，绝不动它后来换上的招。 */
    function grudgeCollect(world: CombatWorld, killer: CombatActor, moveId: string): string {
        if (String(killer.domain()) !== "cobblemon" || !world.valid(killer) || !moveId) return "";
        const pokemon = CobblemonCombat.pokemon(killer);
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null || String(move.id()) !== moveId) continue;
            const before = move.pp();
            if (before <= 0) return String(move.id());
            return CobblemonCombat.pp(world, killer, slot, String(move.key()), before, 0) ? String(move.id()) : "";
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
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(grudgeMark, "start", function () { });
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
            grudgeSettled[String(self.key())] = false;
            const ticks = Math.max(80, Math.round(p(grudgeId, "watchTicks", action)));
            const motes = Math.max(6, Math.round(p(grudgeId, "motes", action)));
            const radius = Math.max(0.35, p(grudgeId, "eyeRadius", action));
            MobEffects.apply(world, self, grudgeEffect, ticks, 0);
            grudgeDropMark(world, self);
            let rootId = 0;
            if (deep) rootId = world.effect("world_combat:rooted", self, "{}", ticks);
            world.effect(grudgeMark, self, JSON.stringify({ motes: motes, radius: radius, max: ticks, deep: deep ? 1 : 0, rootId: rootId }), ticks);
            sound(action, "minecraft:entity.vex.charge");
            WorldFeedback.emit(world, grudgeScene, 1, body.position(),
                { moment: "watch", target: String(self.ref()), motes: motes, scale: radius / 0.4, deep: deep ? 1 : 0 }, 32);
            WorldFeedback.text(world, grudgeAbove(body.position()), grudgeMarkText, [Math.round(ticks / 20)], 32);
            done(action);
        }
    });

    // 怨念快照：每次符合「非友方、另一个来源」的一击都记下，不预估是否致死；真正是否结怨由 after 确认。
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
        data[GRUDGE_PENDING] = { motes: mark.motes || 10, radius: mark.radius || 0.4 };
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
        grudgeDropMark(world, victim);
        grudgeDropRoot(world, victim, mark);
        const carrier = MobEffects.read(world, victim, grudgeEffect);
        if (carrier !== null) world.removeMobEffect(victim, grudgeEffect, carrier.key());
        const body = world.observe(killer);
        if (body === null || body.health() <= 0) return;
        const at = WorldCombat.point(typeof data.x === "number" ? data.x : 0, typeof data.y === "number" ? data.y : 0, typeof data.z === "number" ? data.z : 0);
        const moveId = String(data.move || "");
        let drained = grudgeCollect(world, killer, moveId);
        let native = false;
        if (!drained && String(killer.domain()) !== "cobblemon" && DamageSemantics.read(data).attack) {
            const carrier = MobEffects.apply(world, killer, grudgeToll, 200, 0);
            if (carrier !== null) {
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

    // 结束：怨念散去，本招的 root 与标记一起收回。使用者已经倒下时不播（它随死亡一起消失）。
    WorldCombat.on("world_combat:move_grudge/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== grudgeEffect) return;
        const world = event.world(), actor = event.actor();
        const view = grudgeMarkView(world, actor);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        grudgeDropMark(world, actor);
        grudgeDropRoot(world, actor, mark);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, grudgeScene, 1, body.position(),
            { moment: "lift", target: String(actor.ref()), expired: String(data.cause) === "expired" ? 1 : 0 }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, grudgeAbove(body.position()), grudgeLiftText, [], 28);
    });
}
