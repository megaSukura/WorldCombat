/**
 * 庆祝 / celebrate —— 执行组织。
 *
 * 核心念头：为十分开心的你办一场会传染的庆祝。施法者原地撒出一圈彩带与礼花，身边所有友方（含自己）
 *   都被这份欢喜感染，带上一段共享身份 world_combat:status/celebrate 的「庆祝中」标记；
 *   这份休整收益有两种表达，由配置选择：助兴给一股短暂的行进劲（移动更快，挨一下打就散），
 *   慰劳则按各自已失生命当场分掉一份体力。它对敌人完全无效，也不给任何攻击收益。
 *
 * 三幕：
 *   起（windup，提交前）：原地蹦起、礼花筒扶正，只播预告；这一拍可被打断，打断只收起动作、不花代价。
 *   庆（execute）：提交后彩带整圈撒开，礼花在这一刻才爆；半径内的友方逐个被点亮，结果由 vigor 决定。
 *   退（受击）：蓄势中的庆祝被打断；已经散出的助兴行进劲也在受击那一刻收掉（managed effect 随之结束）。
 *
 * 助兴的行进劲用本单元自己的托管效果承载，并认领目标身上那一份「庆祝中」载体：start 里核对载体 key，
 *   按施法者算出的比例挂 movement_speed 修饰。效果自然到期、被驱散、受击或载体先散，二者一起收回；
 *   同一目标只保留一份，重新施放先收掉旧的持有者，不累加移速。标记「庆祝中」仍是原生 MobEffect。
 * 回复走共享健康写入：按已失生命的一截补，宝可梦经 NativeEffects.heal（含受治疗加成），回执统一用 MC 生命单位。
 */
namespace PokemonSkills {
    function celebrateAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    const celebrateMarch = "world_combat:celebrate_march";
    /** 蓄势中的庆祝：受击即撤（施法者被打断，未散出就收起）。 */
    const celebratePreparing: { [ref: string]: number } = Object.create(null);

    WorldCombat.effect(celebrateMarch, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["speed", "motes", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid celebrate march: " + key);
        });
        if (typeof value.spirit !== "string" || !value.spirit) throw new Error("Invalid celebrate march: spirit");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    // 这股行进劲由「庆祝中」载体承载：只认领 key 相符的那一份载体，之后载体被驱散/替换，
    // 或这股劲自己走完，二者一起收回（lease 随本效果作用域释放）。
    WorldCombat.effectHandler(celebrateMarch, "start", function (effect) {
        const state = JSON.parse(effect.state()), world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, celebrateEffect);
        if (carrier === null || String(carrier.key()) !== String(state.spirit)) { effect.end(); return; }
        MobEffects.bind(world, target, celebrateEffect, carrier);
        if (state.speed > 0) world.attribute(target, "minecraft:generic.movement_speed", state.speed, "add_multiplied_total");
    });
    WorldCombat.effectHandler(celebrateMarch, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 散劲：一份助兴被实际受伤或外力驱散时，在目标身上留一撮碎彩。 */
    function celebrateBreak(world: CombatWorld, target: CombatActor): void {
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, celebrateScene, 1, body.position(), { moment: "break", target: String(target.ref()) }, 20);
    }

    /** 慰劳：按目标已失生命的一截补回，宝可梦经 NativeEffects.heal（含受治疗加成），其他活体直接写 MC 生命。 */
    function celebrateMend(world: CombatWorld, target: CombatActor, fraction: number): number {
        const before = world.observe(target);
        if (before === null) return 0;
        const missing = Math.max(0, before.maxHealth() - before.health());
        const amount = missing * Math.max(0, Math.min(1, fraction));
        if (amount <= 0) return 0;
        let healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            // NativeEffects.heal 按原生生命单位结算并返回原生单位，换算回 MC 单位，回执与其它活体统一。
            const pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, celebrateId) * scale;
        } else {
            healed = world.health(target, amount, "world_combat:" + celebrateId);
        }
        const after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    define({
        id: celebrateId,
        cooldownParameter: "recharge",
        name: "庆祝",
        description: "为十分开心的你办一场庆祝：原地撒出彩带与礼花，身边所有友方（含自己）都被感染，带上一段「庆祝中」标记。助兴式给一股短暂的行进劲（移动更快，挨一下打就散），慰劳式按各自已失生命当场补一口。对敌人完全无效，也不给攻击收益。",
        uses: ["打完一场后集合庆祝，把休整收益分给伙伴", "短暂安全时让整队走得更快", "给受伤的伙伴按伤势补一口"],
        kind: "self",
        range: 3,
        maxRange: 7,
        prepare: 6,
        active: 1,
        recover: 7,
        cooldown: 70,
        style: "party",
        stationary: true,
        interruptible: true,
        defaults: { vigor: false, ai: { safeRange: 8, minAllies: 2 } },
        fields: [flag("vigor", "慰劳")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[celebrateId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(celebrateId, "tempo", context)),
                recover: Math.round(p(celebrateId, "aftercast", context)),
                cooldown: Math.round(p(celebrateId, "recharge", context)),
                active: 1,
                range: p(celebrateId, "partyRadius", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[celebrateId], detail: { values: config } };
            return { radius: p(celebrateId, "partyRadius", context), geometry: "area", style: "party", color: 0xFFC24D,
                label: config && config.vigor === true ? "庆祝 · 慰劳" : "庆祝 · 助兴" };
        },
        windup: function (action, config, prepare) {
            celebratePreparing[String(action.actor().ref())] = action.id();
            action.present("world_combat:move_celebrate:cheer", celebrateScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", vigor: config && config.vigor === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            delete celebratePreparing[String(action.actor().ref())];
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(2.5, p(celebrateId, "partyRadius", action));
            const ticks = Math.max(60, Math.round(p(celebrateId, "spiritTicks", action)));
            const confetti = Math.max(16, Math.round(p(celebrateId, "confetti", action)));
            const streamers = Math.max(2, Math.round(p(celebrateId, "streamers", action)));
            const marchTicks = Math.max(40, Math.round(p(celebrateId, "marchTicks", action)));
            const marchSpeed = Math.max(0, p(celebrateId, "marchSpeed", action));
            const mendFrac = Math.max(0.01, p(celebrateId, "mend", action));
            const vigor = !!(config && config.vigor);
            const scale = radius / 4;
            let party = 0, mended = 0;

            // 礼花只在庆祝完成（提交后）这一刻爆开。
            WorldFeedback.emit(world, celebrateScene, 1, centre,
                { moment: "burst", radius: radius, motes: confetti, streamers: streamers, scale: scale,
                    vigor: vigor ? 1 : 0, intensity: Math.max(0.7, Math.min(2, confetti / 34)) }, 40);

            WorldGeometry.select(world, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 4 }), function (target, facts) {
                const self = String(target.key()) === String(actor.key());
                if (!self && !facts.friendly()) return;
                // 同一目标只保留一份助兴：先收掉旧的持有者，再把新的这一份挂上去，不累加移速。
                const marchers = world.effects(target, celebrateMarch);
                for (let index = 0; index < marchers.length; index++) world.operation(marchers[index].id(), "world_combat:dispel", "{}");
                const at = facts.position(), motes = Math.max(8, Math.round(confetti / 3));
                if (vigor) {
                    if (MobEffects.apply(world, target, celebrateEffect, ticks, 0) === null) return;
                    party++;
                    const gained = celebrateMend(world, target, mendFrac);
                    mended += gained;
                    WorldFeedback.emit(world, celebrateScene, 1, at,
                        { moment: "cheer", target: String(target.ref()), mend: 1, gained: Math.round(gained * 10) / 10,
                            motes: motes, scale: scale, intensity: 1 }, 28);
                } else {
                    // 助兴的行进劲：托管效果认领「庆祝中」载体，随载体消散、被驱散或受击同步收回。
                    const carrier = MobEffects.apply(world, target, celebrateEffect, Math.max(ticks, marchTicks), 0);
                    if (carrier === null) return;
                    party++;
                    const march = world.effect(celebrateMarch, target,
                        JSON.stringify({ speed: marchSpeed, motes: motes, scale: scale, spirit: String(carrier.key()) }), marchTicks);
                    if (march > 0) WorldFeedback.onEffect(world, march, "world_combat:move_celebrate/march/" + march, celebrateScene, 1, at,
                        { moment: "march", target: String(target.ref()), motes: motes, scale: scale });
                    WorldFeedback.emit(world, celebrateScene, 1, at,
                        { moment: "cheer", target: String(target.ref()), march: 1, motes: motes, scale: scale, intensity: 1 }, 28);
                }
            });

            WorldFeedback.text(world, celebrateAbove(centre),
                vigor ? celebrateMendText : celebrateCheerText,
                vigor ? [party, Math.round(mended * 10) / 10] : [party], 34);
            sound(action, "minecraft:entity.evoker.celebrate");
            world.sound("minecraft:block.note_block.chime", centre, 14, "{}");
            done(action);
        }
    });

    // 受击：蓄势中的庆祝被打断；已散出的助兴行进劲也在受击那一刻收掉，载体随之退去（movement_speed 修饰随效果收回）。
    WorldCombat.on("world_combat:move_celebrate/broken", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const target = event.target();
        if (target === null) return;
        const world = event.world(), ref = String(target.ref());
        const instance = celebratePreparing[ref];
        if (instance !== undefined) world.deliver(target, instance, "world_combat:interrupt");
        const marchers = world.effects(target, celebrateMarch);
        for (let index = 0; index < marchers.length; index++) world.operation(marchers[index].id(), "world_combat:dispel", "{}");
        if (marchers.length) celebrateBreak(world, target);
    });

    // 「庆祝中」载体被外力清掉（牛奶、/effect clear、别的招式）时，助兴的行进劲同步收声；
    // 重新施放只是换一份新的载体实例，不算清除。
    WorldCombat.on("world_combat:move_celebrate/released", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== celebrateEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, celebrateEffect) !== null) return;
        const marchers = world.effects(actor, celebrateMarch);
        for (let index = 0; index < marchers.length; index++) world.operation(marchers[index].id(), "world_combat:dispel", "{}");
        if (marchers.length && String(data.cause) !== "expired") celebrateBreak(world, actor);
    });

    // 蓄势被撤销或正常提交后清掉登记，避免陈旧的实例号留在表里。
    WorldCombat.on("world_combat:move_celebrate/windup-end", "world_combat:action_ended", "", function (event) {
        const instance = Number(JSON.parse(String(event.data())).instance);
        Object.keys(celebratePreparing).forEach(function (ref) {
            if (celebratePreparing[ref] === instance) delete celebratePreparing[ref];
        });
    });
}
