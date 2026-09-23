/**
 * 诅咒 / Curse —— 执行组织。
 *
 * 核心念头：诅咒是一次交换，而交换的形态取决于你是什么。
 *   幽灵：当场押上半条命，把债记在对手身上，之后每隔一段从对手身上扣一口——是一条慢慢收的债。
 *   非幽灵：押上敏捷，换来凶悍与硬壳（物攻/防御 +，速度 −），身上烙下一枚短暂的契约印记。
 * 出招仍需一个对手作为凝视的对象（kind enemy）；幽灵把债推给对手，其他个体只能自己吞下。
 *
 * 幽灵形态两幕 + 收：
 *   起：windup 在掌心聚起幽火。
 *   击：提交后押出生命（bloodCost × 最大生命，至少留一线），给目标挂共享身份 world_combat:status/curse
 *      （本单元效果 world_combat:cursed_hex），并以目标为宿主起绑定效果 world_combat:cursed_bind。
 *   收：绑定效果每隔 hexInterval 扣目标最大生命的 hexShare，扣完 left 或被清掉就停；债走完时安静退去。
 * 非幽灵形态一幕：提交后立刻结算能力等级与契约印记，发一声闷响。
 * 反制：幽灵押上半条命，最短的解法是趁它虚弱时强攻；债本身走得慢，也可以先清状态或速战速决。
 */
namespace PokemonSkills {
    function curseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 幽灵形态按当前属性判定（含别的单元改过属性的情况），玩家与原版生物没有属性，走非幽灵分支。 */
    function curseIsGhost(world: CombatWorld, actor: CombatActor): boolean {
        const types = PokemonDamage.combatants.read(world, actor).types;
        return types.indexOf("ghost") >= 0;
    }

    WorldCombat.effect(cursedBind, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "share", "left"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid curse bind: " + key);
        });
        if (value.interval < 1 || value.share <= 0 || value.left < 0) throw new Error("Invalid curse bind");
        if (typeof value.caster !== "string") throw new Error("Invalid curse bind: caster");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(cursedBind, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(cursedBind, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || MobEffects.read(world, victim, cursedHex) === null) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const amount = Math.max(1, Math.floor(body.maxHealth() * data.share));
        world.health(victim, -amount, "world_combat:curse");
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        WorldFeedback.emit(world, curseScene, 1, body.position(),
            { moment: "toll", target: String(victim.ref()), share: data.share, burst: Math.round(12 + data.share * 90), left: data.left }, 24);
        WorldFeedback.text(world, curseAbove(body.position()), curseTextToll, [], 22);
        world.sound("minecraft:particle.soul_escape", body.position(), 12, "{}");
        if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        else effect.end();
    });
    WorldCombat.effectHandler(cursedBind, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 债挂在身上时，每隔一会儿在目标身上浮起一缕幽影。
    WorldCombat.on("world_combat:move_curse/haunt", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== cursedHex || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, cursedHex) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_curse/haunt/" + String(actor.ref()), curseScene, 1, body.position(),
            { moment: "haunt", target: String(actor.ref()) }, 40);
    });

    // 债被牛奶/清状态/时间走完而终止时，收回绑定；自然走完再播一次退场。
    WorldCombat.on("world_combat:move_curse/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== cursedHex) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const binds = world.effects(victim, cursedBind);
        for (let i = 0; i < binds.length; i++) world.operation(binds[i].id(), "world_combat:dispel", "{}");
        if (String(data.cause) !== "expired") return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, curseScene, 1, body.position(), { moment: "lift", target: String(victim.ref()) }, 24);
        WorldFeedback.text(world, curseAbove(body.position()), curseTextLift, [], 24);
    });

    define({
        id: curseId,
        cooldownParameter: "recharge", name: "诅咒",
        description: "一次交换：幽灵属性当场押出一截最大生命，把逐段扣血的债记在对手身上；其他属性的个体押上敏捷，换来物攻与防御的提升。需要一个对手作为凝视的对象。",
        uses: ["押上一截生命，给对手记一笔慢债", "把敏捷换成凶悍与硬壳", "逼对手分心去清状态或速战速决"],
        kind: "enemy", range: 5, maxRange: 8,
        prepare: 9, active: 0, recover: 8, cooldown: 90, style: "curse",
        defaults: { bloodpact: false },
        fields: [flag("bloodpact", "血契")],
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon, skill: skills[curseId], detail: { values: config }, world: world || null, actor: actor || null };
            const ghost = curseGhostType(pokemon), blood = !!(config && config.bloodpact);
            return {
                prepare: Math.max(3, Math.round(p(curseId, "tempo", context)) + (ghost ? 0 : -1)),
                recover: Math.round(p(curseId, "aftercast", context)),
                cooldown: Math.round(p(curseId, "recharge", context)) + (ghost ? 6 : blood ? 4 : 0),
                active: 0, range: p(curseId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target)) return "invalid-target";
            const body = world.observe(self);
            if (body === null) return "invalid-target";
            if (curseIsGhost(world, self)) {
                if (CombatStatus.has(world, target, curseStatus)) return "already-cursed";
                const cost = p(curseId, "bloodCost", action);
                if (body.health() <= body.maxHealth() * cost + 0.5) return "too-weak";
            }
            return "";
        },
        indicator: function (config, pokemon) {
            if (curseGhostType(pokemon))
                return { radius: pokemon ? p(curseId, "reach", pokemon) : 5, geometry: "line", style: "curse",
                    color: 0x9B6BD6, label: config && config.bloodpact ? "诅咒·血契" : "诅咒·稳咒" };
            return { radius: 1, geometry: "circle", style: "curse", color: 0xB4453F, label: "诅咒·自缚" };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_curse:windup", curseScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const blood = !!(config && config.bloodpact);
            if (curseIsGhost(world, self)) {
                const target = action.target();
                if (target === null || !world.valid(target)) { done(action); return; }
                if (CombatStatus.has(world, target, curseStatus)) { done(action); return; }
                const cost = Math.max(0.05, Math.min(0.6, p(curseId, "bloodCost", action)));
                const floor = Math.max(1, body.maxHealth() * 0.05);
                const paid = Math.max(0, Math.min(body.maxHealth() * cost, body.health() - floor));
                if (paid > 0) world.health(self, -paid, "world_combat:curse");
                const share = Math.max(0.05, Math.min(0.35, p(curseId, "hexShare", action)));
                const ticks = Math.max(60, Math.round(p(curseId, "hexTicks", action)));
                const interval = Math.max(20, Math.round(p(curseId, "hexInterval", action)));
                MobEffects.apply(world, target, cursedHex, ticks, 0);
                const existing = world.effects(target, cursedBind);
                for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
                const left = Math.max(1, Math.floor(ticks / interval));
                world.effect(cursedBind, target, JSON.stringify({ interval: interval, share: share, left: left, caster: String(self.ref()) }), ticks);
                sound(action, "minecraft:entity.evoker.prepare_attack");
                const victim = world.observe(target);
                if (victim !== null) {
                    WorldFeedback.emit(world, curseScene, 1, victim.position(),
                        { moment: "hex", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                            share: share, pulses: left, paid: Math.round(paid) }, 30);
                    WorldFeedback.text(world, curseAbove(victim.position()), curseTextHex, [left], 30);
                }
            } else {
                const gain = Math.max(1, Math.round(p(curseId, "pactGain", action)));
                NativeEffects.boost(world, self, "atk", gain);
                NativeEffects.boost(world, self, "def", gain);
                NativeEffects.boost(world, self, "spe", -gain);
                const pactTicks = 40 + gain * 10;
                MobEffects.apply(world, self, cursePact, pactTicks, gain);
                sound(action, "minecraft:entity.evoker.cast_spell");
                WorldFeedback.emit(world, curseScene, 1, body.position(),
                    { moment: "pact", target: String(self.ref()), gain: gain, burst: gain * 16 }, 30);
                WorldFeedback.text(world, curseAbove(body.position()), curseTextPact, [gain, gain], 30);
            }
            done(action);
        }
    });
}
