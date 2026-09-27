/**
 * 电磁飘浮 / magnetrise — 执行组织与真实低空悬浮。
 *
 * 核心念头：把脚下那块地磁化，磁力真正把身体托离脚下地表，沿地形低空滑过。身体一离地，地面属性招式
 *   够不到它；贴地的近战敌人撞上来会被同极弹开一步。磁力耗尽或被切断时身体失托、交回原生重力。
 *
 * 出手：短起手（windup 播聚电预告）后提交；只对自己施放。
 * 悬浮：提交后挂真实 MobEffect world_combat:magnetrise_field（共享身份 magnetrise），再挂一枚本招拥有的
 *   mark 效果。mark 在自己的 scope 向 world.groundLift 申请一份低空托举租约：原生每刻用真实碰撞与
 *   地表支撑把身体维持在 liftHeight 的离地高度，顶棚、悬崖、骑乘、液体、失去支撑都由原生处理。
 *   mark 结束时租约连同临时重力/移速修正一起释放，身体交回原生重力。
 * 归属：mark 只活在这次真实应用（anchor）还在的时候；被牛奶/清除/击落（smackdown）/重力类接地、或
 *   拿起黑色铁球，都会让本次 mark 与托举租约结束。重施先确认新应用真的成功，再撤旧 mark、按新 anchor
 *   挂新 mark 与其真实寿命，旧 mark 的结束不会误删新的那次。只有 groundLift 真正接受才宣告起浮。
 * 免疫：入场伤害里只清地面属性招式的伤害，保留原生铁球/接地规则；仙人掌、坠落、撞墙等真实碰撞仍按
 *   原生受伤——身体真的离地自然会避开地表触碰，不去伪装全危害免疫。水中或没有近地支撑时原生会自然下落。
 * 弹开：一记真实落下的接触命中（damage_applied 的 actual>0 且 contact）才会触发；由被护者自己的 mark
 *   经 EffectReactions 在其自身 scope 调用 world.hitDisplace，把贴地的攻击者真正推走，位移落实才算数，
 *   显示的距离也用这次实际位移。判定半径读 mark 里与画面共用的 field。
 * 结束：到期是磁场自行衰退、身体落回（settle）；被清除/替换/铁球切断是硬切失托（cut）。两幕之后另起
 *   一个只等真实接地的观察效果，脚底真的落回地表才扬尘（land），不把到期当落地。
 * 反制：黑色铁球、清除效果、击落与接地类招式都能让它失效；射程与冷却照旧。
 */
namespace PokemonSkills {
    /** 黑色铁球是原生接地物：拿着它，磁力托不起身体，本次悬浮结束。 */
    function magnetriseHoldsIronBall(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon") return false;
        try {
            const pokemon = CobblemonCombat.pokemon(actor);
            return NativeEffects.item(pokemon, NativeEffects.read(world, actor)) === "iron_ball";
        } catch (error) { return false; }
    }
    /** 显式接地：被击落钉住或扎根时，电磁托举不成立。 */
    function magnetriseAnchored(world: CombatWorld, actor: CombatActor): boolean {
        return CombatStatus.has(world, actor, "smackdown") || CombatStatus.has(world, actor, "ingrain");
    }
    function magnetriseReleaseCarrier(world: CombatWorld, actor: CombatActor, anchor: any): void {
        if (anchor && MobEffects.matches(world, actor, anchor)) world.removeMobEffect(actor, anchor.id, anchor.key);
    }
    /** 本次悬浮真实的磁场半径：读 mark 里算出的 field，机制判定与画面共用同一个数。 */
    function magnetriseFieldReach(world: CombatWorld, actor: CombatActor): number {
        const marks = world.effects(actor, magnetriseMark);
        for (let index = 0; index < marks.length; index++) {
            try {
                const state = JSON.parse(String(marks[index].data()));
                if (state.anchor && MobEffects.matches(world, actor, state.anchor)) return Math.max(0.5, Number(state.field) || 0);
            } catch (error) { }
        }
        return 0;
    }
    var magnetriseRepelUntil: { [ref: string]: number } = Object.create(null);

    function magnetrisePresent(effect: CombatEffect, state: any): void {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        if (body === null) return;
        const feet = WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
        const hit = world.clipBlocks(feet.plus(WorldCombat.point(0, .05, 0)),
            feet.minus(WorldCombat.point(0, state.lift + state.probe + .1, 0)));
        const floor = hit && hit.blocked() && hit.blockFace() === "up" ? hit.position() : null;
        const gap = floor === null ? 0 : Math.max(0, feet.y() - floor.y());
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_magnetrise/hover", magnetriseScene, 1, body.position(),
            { moment: "hover", target: String(actor.ref()), sparks: state.sparks, field: state.field,
                lift: gap, drop: -gap, surfaceRate: floor === null ? 0 : 6, arcRate: gap > .01 ? 4 : 0,
                path: floor === null ? [] : [[floor.x(), floor.y(), floor.z()], [feet.x(), feet.y(), feet.z()]],
                scale: Math.max(.6, Math.min(2, state.field / .7)) });
    }

    WorldCombat.effect(magnetriseMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["lift", "field", "sparks", "repel", "glide", "response", "probe", "max"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid magnetrise mark: " + key);
        });
        if (!MobEffects.validAnchor(value.anchor)) throw new Error("Invalid magnetrise mark: anchor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    // 租约申请返回宿主是否接受本次托举；接受才宣告起浮，拒绝则等待下一次申请。
    function magnetriseLift(effect: CombatEffect): boolean {
        const world = effect.world(), self = effect.target(), state = JSON.parse(effect.state());
        return world.groundLift(self, Math.max(0.15, Number(state.lift) || 0.4),
            Math.max(0.08, Number(state.response) || magnetriseResponse), Math.max(0, Number(state.probe) || magnetriseProbe));
    }
    function magnetriseAnnounce(effect: CombatEffect, state: any): void {
        if (state.announced) return;
        const world = effect.world(), self = effect.target(), body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, magnetriseScene, 1, body.position(),
            { moment: "lift", target: String(self.ref()), sparks: state.sparks, field: state.field, lift: state.lift,
                scale: Math.max(0.6, Math.min(2, state.field / 0.7)) }, 42);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), magnetriseLiftText,
            [Math.round((state.max || 0) / 20)], 42);
        world.sound("minecraft:block.conduit.activate", body.position(), 16, "{}");
        state.announced = true;
        effect.state(JSON.stringify(state));
    }

    // mark 就是这次悬浮的拥有者：在自己的 scope 申请低空托举租约，并按形态挂上滑翔移速。
    WorldCombat.effectHandler(magnetriseMark, "start", function (effect) {
        const world = effect.world(), self = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(self) || !MobEffects.matches(world, self, state.anchor)) { effect.end(); return; }
        MobEffects.bind(world, self, state.anchor.id);
        const glide = Math.max(0, Number(state.glide) || 0);
        if (glide > 0) world.attribute(self, "minecraft:generic.movement_speed", glide, "add_multiplied_total");
        // 施法动作仍在进行时会自己占用 movement，首次租约可能被拒；不宣告，等动作结束后 watch 再申请。
        if (magnetriseLift(effect)) { magnetriseAnnounce(effect, state); magnetrisePresent(effect, state); }
        effect.schedule("watch", "watch", magnetriseWatchTicks, "{}");
    });

    // 存续期每几刻核对一次：载体还在、没有拿起接地物/扎根；租约按当前 lift 续订。
    WorldCombat.effectHandler(magnetriseMark, "watch", function (effect) {
        const world = effect.world(), self = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(self) || !MobEffects.matches(world, self, state.anchor)
            || magnetriseHoldsIronBall(world, self) || magnetriseAnchored(world, self)) {
            magnetriseReleaseCarrier(world, self, state.anchor);
            effect.end();
            return;
        }
        if (magnetriseLift(effect)) { magnetriseAnnounce(effect, state); magnetrisePresent(effect, state); }
        effect.schedule("watch", "watch", magnetriseWatchTicks, "{}");
    });
    WorldCombat.effectHandler(magnetriseMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(magnetriseMark, "end", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (world.valid(actor)) magnetriseReleaseCarrier(world, actor, JSON.parse(effect.state()).anchor);
        delete magnetriseRepelUntil[String(actor.ref())];
    });

    // 托举消失后只等真实落地：脚底真的接地才扬尘，不把到期当落地。
    WorldCombat.effect(magnetriseLanding, 1, 120, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.field !== "number" || !isFinite(value.field) || value.field <= 0) throw new Error("Invalid magnetrise landing: field");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function magnetriseWatchLanding(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        if (body.grounded()) {
            WorldFeedback.emit(world, magnetriseScene, 1, body.position(),
                { moment: "land", target: String(actor.ref()), field: JSON.parse(effect.state()).field }, 26);
            effect.end();
            return;
        }
        effect.schedule("land-watch", "land-watch", 2, "{}");
    }
    WorldCombat.effectHandler(magnetriseLanding, "start", magnetriseWatchLanding);
    WorldCombat.effectHandler(magnetriseLanding, "land-watch", magnetriseWatchLanding);

    // 磁场的兑现点：带 magnetrise 身份者被地面属性招式命中时伤害清零；黑色铁球（原生接地物）时不生效。
    // 地形危害不再被粗暴清零——身体真的离地，本来就碰不到地表；仍撞上仙人掌或墙就按原生受伤。
    NativeEffects.incomingRules.define({ id: "world_combat:move_magnetrise/float", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.amount > 0) || data.bypassesInvulnerability) return;
        const world = hit.world, holder = hit.target;
        if (!world.valid(holder) || !CombatStatus.has(world, holder, magnetriseStatus)) return;
        if (magnetriseHoldsIronBall(world, holder) || magnetriseAnchored(world, holder)) return;
        if (String(data.type || "").toLowerCase() !== "ground") return;
        const body = world.observe(holder);
        data.amount = 0;
        if (body === null) return;
        WorldFeedback.emit(world, magnetriseScene, 1, body.position(), { moment: "negate", target: String(holder.ref()), source: "ground" }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), magnetriseNegateText, [], 30);
    } });

    // 同极弹开由被护者自己的 mark 执行：真实接触命中落下后，在自身 scope 里推走贴地攻击者。
    EffectReactions.register(magnetriseMark, magnetriseRepel, function (effect, facts) {
        const world = effect.world(), self = effect.target(), attacker = world.actor(facts.attacker);
        if (!attacker || !world.valid(self) || String(attacker.ref()) === String(self.ref()) || world.allied(self, attacker)) return;
        if (!CombatStatus.has(world, self, magnetriseStatus)) return;
        const from = world.observe(attacker), body = world.observe(self);
        if (from === null || body === null || !from.grounded()) return;
        const away = from.position().minus(body.position());
        if (away.length() <= 0.01) return;
        const state = JSON.parse(effect.state());
        const push = Math.max(0.1, Number(state.repel) || 0.4);
        const moved = world.hitDisplace(attacker, away.unit().scale(push));
        if (!(moved > 0)) return;
        WorldFeedback.emit(world, magnetriseScene, 1, from.position(),
            { moment: "repel", target: String(self.ref()), power: push, moved: moved,
                burst: Math.max(8, Math.round(moved / 0.4 * 24)) }, 22);
        WorldFeedback.text(world, from.position().plus(WorldCombat.point(0, 1, 0)), magnetriseRepelText,
            [Math.round(moved * 10) / 10], 24);
        world.sound("minecraft:block.respawn_anchor.charge", from.position(), 12, "{}");
    });

    define({
        id: magnetriseId,
        cooldownParameter: "recharge",
        name: "电磁飘浮",
        description: "把脚下地面磁化，用磁力把身体真正托离地面低空滑过；悬浮期间地面属性招式伤不到它，贴地的近战攻击者打中它时会被同极弹开。身体真的离地，脚下触碰不到地表；磁力耗尽或被切断时身体失托落下。",
        uses: ["躲开地震、重踏一类地面招", "贴着地形低空滑过陷阱与坑洼", "被贴地近战打中时把对手同极弹开"],
        kind: "self",
        range: 1,
        prepare: 12,
        active: 1,
        recover: 6,
        cooldown: 160,
        style: "magnet",
        defaults: { field: "glide" },
        fields: [
            choice("field", "磁场形态", ["glide", "anchor"], ["滑翔", "锚定"])
        ],
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (world.observe(self) === null) return "invalid-target";
            if (magnetriseHoldsIronBall(world, self) || magnetriseAnchored(world, self)) return "invalid-target";
            return "";
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magnetriseId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const glide = config.field === "glide";
            return {
                prepare: Math.max(4, Math.round(p(magnetriseId, "tempo", context)) + (glide ? -2 : 2)),
                recover: Math.round(p(magnetriseId, "aftercast", context)),
                cooldown: Math.max(60, Math.round(p(magnetriseId, "recharge", context) * (glide ? 0.85 : 1.15))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_magnetrise:windup", magnetriseScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", glide: config.field === "glide" ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) { return { radius: 1.2, geometry: "circle", style: "magnet", color: 0xFFD54A,
            label: config && config.field === "anchor" ? "锚定悬浮" : "滑翔悬浮" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const glideOn = config.field === "glide";
            const duration = Math.max(60, Math.round(p(magnetriseId, "hoverTicks", action) * (glideOn ? 0.8 : 1.25)));
            const radius = Math.max(0.4, p(magnetriseId, "fieldRadius", action) * (glideOn ? 1 : 1.15));
            const lift = Math.max(0.15, p(magnetriseId, "liftHeight", action));
            const sparks = Math.max(1, Math.round(p(magnetriseId, "sparks", action)));
            const repel = Math.max(0.1, p(magnetriseId, "repel", action) * (glideOn ? 0.7 : 1.4));
            const glide = glideOn ? p(magnetriseId, "glide", action) * 1.35 : 0;
            // 先确认新的真实应用成功，再撤旧 mark（连同其托举租约），旧 mark 结束不会误删新的。
            const carrier = MobEffects.set(world, actor, magnetriseEffect, duration, 0);
            if (carrier === null) { done(action); return; }
            world.effects(actor, magnetriseMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            const markTicks = Math.max(1, Math.min(1200, carrier.duration() > 0 ? carrier.duration() : duration));
            world.effect(magnetriseMark, actor, JSON.stringify({
                anchor: MobEffects.anchor(carrier), lift: lift, field: radius, sparks: sparks,
                repel: repel, glide: glide, response: magnetriseResponse, probe: magnetriseProbe, max: markTicks }), markTicks);
            // 起浮的宣告与声音写在 mark 的 start：只有 groundLift 真正接受时才发出。
            done(action);
        }
    });

    // 真实接触命中之后才触发弹开：以被护者 mark 的身份在该 scope 里推走贴地攻击者。
    WorldCombat.on("world_combat:move_magnetrise/repel", "world_combat:damage_applied", "", function (event) {
        const target = event.target();
        if (target === null) return;
        const world = event.world();
        if (!world.valid(target)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (!CombatStatus.has(world, target, magnetriseStatus)) return;
        if (magnetriseHoldsIronBall(world, target) || magnetriseAnchored(world, target)) return;
        if (!DamageSemantics.read(data).contact) return;
        const attacker = event.actor();
        if (attacker === null || String(attacker.ref()) === String(target.ref())) return;
        if (!world.valid(attacker) || world.allied(target, attacker)) return;
        const from = world.observe(attacker), body = world.observe(target);
        if (from === null || body === null || !from.grounded()) return;
        const reach = magnetriseFieldReach(world, target);
        if (reach <= 0 || from.position().minus(body.position()).length() > reach) return;
        const now = world.tick(), ref = String(target.ref());
        if (now - (magnetriseRepelUntil[ref] || -1000) < 20) return;
        const marks = world.effects(target, magnetriseMark);
        if (!marks.length) return;
        magnetriseRepelUntil[ref] = now;
        EffectReactions.invoke(world, marks[0].id(), magnetriseRepel, { attacker: String(attacker.ref()) });
    });

    // 走完自己的时间与被外力切断是两条岔路：到期是磁场自行衰退、身体缓缓落回；被清除是磁力被硬切、失托落下。
    // 新施放留下的 mark 锚定的是新的原生应用，所以旧应用的移除不会删掉它。
    WorldCombat.on("world_combat:move_magnetrise/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== magnetriseEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        let live = false, field = 0.7;
        world.effects(actor, magnetriseMark).forEach(function (view) {
            let anchor: any = null, radius = 0;
            try { const state = JSON.parse(String(view.data())); anchor = state.anchor; radius = Number(state.field); } catch (error) { anchor = null; }
            if (isFinite(radius) && radius > 0) field = radius;
            if (anchor && MobEffects.matches(world, actor, anchor)) { live = true; return; }
            world.operation(view.id(), "world_combat:dispel", "{}");
        });
        if (live) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, magnetriseScene, 1, body.position(),
            { moment: expired ? "settle" : "cut", target: String(actor.ref()), expired: expired ? 1 : 0 }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), expired ? magnetriseSettleText : magnetriseCutText, [], 30);
        world.sound(expired ? "minecraft:block.beacon.deactivate" : "minecraft:block.conduit.deactivate", body.position(), 12, "{}");
        // 落地灰另起一段：身体真的接地后由 magnetriseLanding 触发，到期或硬切当刻都不假造落地。
        world.effect(magnetriseLanding, actor, JSON.stringify({ field: field }), 120);
    });
}
