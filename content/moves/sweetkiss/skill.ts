/**
 * 天使之吻 / sweetkiss — 执行组织。
 *
 * 核心念头：凑到对手脸前，送上一口短促到让人失神的贴面吻；被亲到的人从此心猿意马，出手会打偏、用力会伤到自己。
 *   它不隔空、不远射——够不到、被墙或别的身体挡住就亲空，所以凑身与时机是它的读法。
 *
 * 出手：提交前 ready 只读复核目标是否真的贴到（两体最近面 ≤ contactGap）；太远、隔墙就作废（不花 PP）。
 * 命中：提交后沿真实朝向做一次短 trace，**第一个身体必须是选中目标**（第三方或墙挡在前面都算亲空）；再量一次
 *   最近面，≤ contactGap 才落吻。落吻处只出现一枚吻印，挂共享身份 world_combat:status/confusion 的
 *   world_combat:sweetkiss_blush。
 * 持续：混乱存续期由该 MobEffect 承担；由本单元另建的托管载体（WorldFeedback.onEffect）画头顶的心与飞鸟，
 *   随混乱自然到期、被牛奶／/effect clear 清除或换上新载体时同时收场，不留残影。
 * 随机分支：目标每次试图出手（world_combat:before_commit）按载体振幅掷骰；中则本次出手作废。
 * 反噬：目标每次打中非友方（world_combat:damage_applied）按自身攻击结算自伤，且不超过这一击真正造成的伤害。
 * 反制：接触是硬门槛；目标跑开、被队友挡开、隔墙或自己够不到都亲空。已有混乱只被刷新，不叠加。
 */
namespace PokemonSkills {
    function sweetkissAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function sweetkissCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === sweetkissEffect ? effect : null;
    }

    // 混乱存续的托管载体：头顶的心与鸟绑在真实混乱效果的剩余时间与当前 key 上；自然到期、牛奶／/effect clear、
    // 或换上新载体（key 变化）都随它一起停，不靠自己的计时，也不留残影。
    const sweetkissLinger = "world_combat:move_sweetkiss/linger";
    WorldCombat.effect(sweetkissLinger, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.key !== "string" || !value.key) throw new Error("Invalid sweetkiss linger carrier key");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function sweetkissLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        const value = JSON.parse(effect.state());
        const carrier = CombatStatus.representative(world, target, "confusion");
        if (body === null || carrier === null || String(carrier.id()) !== sweetkissEffect || String(carrier.key()) !== value.key) {
            effect.end(); return;
        }
        WorldFeedback.onEffect(world, effect.id(), "linger", sweetkissScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()) });
        const remaining = carrier.duration() < 0 ? 600 : Math.max(1, Math.min(600, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effectHandler(sweetkissLinger, "start", sweetkissLingerWatch);
    WorldCombat.effectHandler(sweetkissLinger, "watch", sweetkissLingerWatch);
    WorldCombat.effectHandler(sweetkissLinger, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 状态被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等下一次巡检。
    WorldCombat.on("world_combat:move_sweetkiss/linger-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== sweetkissEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, sweetkissLinger).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: sweetkissId,
        cooldownParameter: "recharge",
        name: "天使之吻",
        description: "贴面送上一口短吻使目标混乱：其出手可能作废，打中敌人时还会被自己的力量反噬。亲密度越高，混乱持续越久；够不到、隔墙或被别人挡住就亲空。",
        uses: ["贴身把对手亲懵", "为队友的集火制造失手窗口", "在缠斗中让对手的连招不断失手"],
        kind: "enemy",
        range: 4,
        maxRange: 4,
        prepare: 3,
        active: 1,
        recover: 8,
        cooldown: 80,
        style: "kiss",
        defaults: { kiss: "light" },
        fields: [
            choice("kiss", "吻的方式", ["light", "deep"], ["轻吻", "深吻"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sweetkissId], detail: { values: config }, world, actor, attributes };
            const deep = config.kiss === "deep";
            return {
                prepare: Math.round(p(sweetkissId, "tempo", context)) + (deep ? 6 : 0),
                recover: Math.round(p(sweetkissId, "aftercast", context)) + (deep ? 4 : 0),
                cooldown: Math.round(p(sweetkissId, "recharge", context) * (deep ? 1.15 : 0.9)),
                range: Math.max(2.6, Math.min(4, p(sweetkissId, "kissReach", context))),
                active: 1
            };
        },
        // 提交前只读复核：目标在视线里、且两具身体已经真的贴上；够不到就不花 PP。
        ready: function (action, config) {
            const target = action.target(), world = action.sense();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            const self = world.observe(action.actor());
            if (self === null) return "target-left";
            const gap = p(sweetkissId, "contactGap", action);
            const near = world.closestPoint(action.actor(), body.position());
            const far = world.closestPoint(target, self.position());
            return near.minus(far).length() > gap ? "out-of-contact" : "";
        },
        windup: function (action, config, prepare) {
            const front = WorldGeometry.flatUnit(action.direction());
            const at = action.origin().plus(front.scale(0.28)).plus(WorldCombat.point(0, 0.6, 0));
            action.present("world_combat:move_sweetkiss:windup", sweetkissScene, 1, at,
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: any = { pokemon, skill: skills[sweetkissId], detail: { values: config } };
            const reach = pokemon ? p(sweetkissId, "kissReach", context) : 3;
            return { radius: reach, geometry: "circle", style: "kiss", color: 0xFF8FB8, label: "天使之吻" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const miss = function (at: CombatPoint): void {
                WorldFeedback.emit(world, sweetkissScene, 1, at, { moment: "fizzle" }, 16);
                done(action);
            };
            if (target === null || !world.valid(target) || world.friendly(target)) { miss(action.targetPosition()); return; }
            const self = world.observe(action.actor()), body = world.observe(target);
            if (self === null || body === null) { miss(action.targetPosition()); return; }
            const gap = Math.max(0.2, p(sweetkissId, "contactGap", action));
            const from = self.position(), to = body.position();
            const delta = to.minus(from), direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            // 第一个身体必须是被选中的目标；墙或第三方挡在前面都算亲空。
            const hit = action.trace(from, from.plus(direction.scale(action.range())), gap, true);
            const struck = hit.hitEntity() ? hit.target() : null;
            if (struck === null || String(struck.ref()) !== String(target.ref()) || world.friendly(struck) || hit.blocked()) {
                miss(hit.hitEntity() || hit.blocked() ? hit.position() : to);
                return;
            }
            const near = world.closestPoint(action.actor(), to), far = world.closestPoint(target, from);
            if (near.minus(far).length() > gap || WorldGeometry.blockHit(world, near, far) !== null) { miss(far); return; }
            const at = near.plus(far).scale(0.5);
            const deep = config.kiss === "deep";
            const ticks = Math.max(20, Math.round(p(sweetkissId, "mistTicks", action) * (deep ? 1.3 : 0.8)));
            const chance = Math.max(0.05, Math.min(0.9, sweetkissBaseChance + (deep ? 0.1 : 0)));
            const hearts = Math.max(1, Math.round(p(sweetkissId, "hearts", action)));
            // 只有状态真的落上才留吻印；被共享 gate 挡下时按亲空处理，不报成功。
            if (!CombatStatus.apply(world, target, "confusion", sweetkissEffect, ticks, Math.round(chance * 100), { unique: true })) {
                miss(at);
                return;
            }
            WorldFeedback.emit(world, sweetkissScene, 1, at,
                { moment: "kiss", target: String(target.ref()), hearts: hearts, scale: Math.max(0.6, Math.min(2, ticks / 180)) }, 40);
            WorldFeedback.text(world, sweetkissAbove(at), "world_combat.move.sweetkiss.text.kissed", [Math.round(ticks / 20)], 44);
            world.sound("minecraft:entity.allay.item_given", at, 16, "{}");
            // 持续表现绑在本次刚挂上的真实载体 key 上；旧载体（本招或别人）随 unique 撤掉后由 watcher 自行结束。
            const carrier = CombatStatus.representative(world, target, "confusion");
            const carrierKey = carrier === null ? "" : String(carrier.key());
            world.effects(target, sweetkissLinger).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            if (carrierKey) world.effect(sweetkissLinger, target, JSON.stringify({ key: carrierKey }), ticks);
            done(action);
        }
    });


    // 反噬：心猿意马的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_sweetkiss/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (sweetkissCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = sweetkissRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        // 反噬预算来自这一击的真实回执：自伤不超过它真正造成的伤害，高血 Boss 不会被按血条白削。
        const budget = Math.max(0, Number(data.actual) || 0) * sweetkissRecoilBudget;
        const loss = -world.health(actor, -Math.min(body.maxHealth() * fraction, budget), "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, sweetkissScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, sweetkissAbove(body.position()), "world_combat.move.sweetkiss.text.recoil", [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });
}
