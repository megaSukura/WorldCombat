/**
 * 水之波动 / waterpulse 的出手方式。
 *
 * 核心念头：把水压成一枚会嗡鸣的水珠掷出去。水珠在真实碰撞点炸开，水波从那里一圈圈荡开——
 * 每一圈扫过的人各吃一记回响，被震到的人耳中嗡响、脚下发飘，可能陷入混乱。玩家从一圈圈
 * 真实扩散的水环读出「谁会被扫到、还剩几圈」。
 *
 * 选取：`kind: "aim"`——可点实体、也可点方向或世界点空掷；提交与执行都不要求存在敌人。
 * 水珠撞到方块时在真实接触点碎开，水波照常从那个点荡开，但没有直接伤害对象。
 *
 * 三幕：
 *   起（windup，提交前）：水在身前收成一颗低鸣的水珠，表面涟漪向内收紧，只播预告。
 *   飞（flight，提交后）：水珠沿瞄准方向飞出，拖着泡沫与细水尾。
 *   鸣（burst → wave → soak / rattle）：命中点炸开一圈水花，随后水波按 `pulses` 圈、每 `interval`
 *       刻向外荡开一圈；每圈只扫尚未被波及、且与落点之间视线未断的非友方，回响真的结算成功才溅起
 *       水花，并按 chance 让目标耳中嗡响（本单元的共享身份混乱载体 world_combat:status/confusion）；
 *       主目标在命中时先吃下 resonance。水波不穿墙；同一次施放里每个敌人只吃一记。
 *
 * 混乱行为（本单元自己的变体）：目标每次想出手都可能被打散（失手概率存在载体振幅里），
 * 且持续期内移动变慢——这是水之波动「耳鸣发飘」区别于迷昏拳「被打懵」的地方；不造成自伤。
 * 耳鸣的飞鸟表现挂在托管载体上，随真实混乱效果自然到期或提前驱散一起结束。
 * 配置 `resonant` 由公式改威力／半径／概率／时序，提交后才触碰世界。
 */
namespace PokemonSkills {
    const waterpulseScene = "world_combat:move_waterpulse";
    const waterpulseDazeEffect = "world_combat:waterpulse_daze";
    /** 托管载体：把耳鸣的持续表现绑在真实混乱效果的生命周期上，驱散即停。 */
    const waterpulseDazeMark = "world_combat:move_waterpulse/daze_mark";
    MobEffects.fixedAttributes("world_combat:waterpulse_slow", waterpulseDazeEffect,
        [{ id: "minecraft:generic.movement_speed", amount: -0.12, operation: "add_multiplied_total" }]);
    const waterpulseDazeText = "world_combat.move.waterpulse.text.daze";

    /** 把嗡鸣挂到目标身上：借共享身份 confusion，振幅存失手概率百分数，独一无二地替换同类载体。 */
    function waterpulseDaze(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", waterpulseDazeEffect, ticks, fumblePct, { unique: true })) return false;
        // 状态真落上才挂托管表现；同一目标已有载体时不重复挂。
        if (world.effects(victim, waterpulseDazeMark).length === 0)
            world.effect(waterpulseDazeMark, victim, "{}", Math.max(1, Math.min(2400, ticks)));
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, waterpulseScene, 1, at, { moment: "rattle", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.25, 0)), waterpulseDazeText, [], 30);
        return true;
    }

    define({
        id: "waterpulse",
        cooldownParameter: "recharge",
        name: "Water Pulse",
        description: "掷出一枚会嗡鸣的水珠：命中后水波从落点一圈圈荡开，圈里的人各吃一记回响，被震到的可能耳中嗡响、陷入混乱。",
        uses: ["中远距离的直线水波点射", "用荡开的水环扫到目标身边的敌人", "把目标震得耳鸣，制造失手窗口"],
        kind: "aim",
        range: 13,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "water",
        defaults: { resonant: false, ai: { maxChase: 18, cluster: true, fresh: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("waterpulse", "blast", pokemon), geometry: "area", style: "water",
                color: 0x4FB6E8, label: config && config.resonant === true ? "共振水之波动" : "水之波动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["waterpulse"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("waterpulse", "tempo", context)),
                recover: Math.round(p("waterpulse", "aftercast", context)),
                cooldown: Math.round(p("waterpulse", "recharge", context)),
                active: 0,
                range: p("waterpulse", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("waterpulse:gather", waterpulseScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", resonant: config && config.resonant === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("waterpulse", "resonance", action);
            const echoPower = p("waterpulse", "echo", action);
            const speed = p("waterpulse", "velocity", action);
            const radius = p("waterpulse", "radius", action);
            const blast = p("waterpulse", "blast", action);
            const pulses = Math.max(2, Math.round(p("waterpulse", "pulses", action)));
            const interval = Math.max(2, Math.round(p("waterpulse", "interval", action)));
            const daze = Math.max(40, Math.round(p("waterpulse", "dazeTicks", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("waterpulse", "chance", action)));
            const fumblePct = Math.round(Math.max(0.05, Math.min(0.9, p("waterpulse", "fumble", action))) * 100);
            const scale = Math.max(0.6, Math.min(2.2, blast / 2.6));
            const intensity = Math.max(0.6, Math.min(2.4, power / 62));
            const flows = Math.max(12, Math.round(16 + pulses * 6));
            const hitSet: { [ref: string]: boolean } = {};
            let impacted = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.waterpulse.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/bubble/bigbubble", tint: 0x4FB6E8, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.22))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 200,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    impacted = true;
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // 直击受害者记入同一 hitSet：同一次施放里不再被后续水波重复结算。
                        hitSet[String(victim.ref())] = true;
                        const landed = impact(current, hit, "waterpulse", power,
                            { damage: damageSpec("waterpulse", "resonance"), pulse: true });
                        if (landed && scope.valid(victim) && scope.random() < chance)
                            waterpulseDaze(scope, victim, point, daze, fumblePct);
                    }
                    // 水波与命中闪都从这同一个真实碰撞点长出。
                    WorldFeedback.emit(scope, waterpulseScene, 1, point,
                        { moment: "burst", target: victim !== null ? String(victim.ref()) : "", blast: blast,
                            pulses: pulses, scale: scale, intensity: intensity }, 30);
                    sound(current, "cobblemon:move.waterpulse.target");
                    sound(current, "cobblemon:impact.water");

                    let step = 0;
                    function wave(current: CombatAction): void {
                        const scope = current.world();
                        step++;
                        const outer = blast * step / pulses;
                        const inner = Math.max(0, blast * (step - 1) / pulses - 0.3);
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, inner, outer, { below: 1.5, above: 2.8 }),
                            function (other, facts) {
                                const ref = String(other.ref());
                                if (hitSet[ref]) return;
                                hitSet[ref] = true;
                                // 水波不穿墙：落点与目标之间视线被挡就不再扩大命中。
                                if (!scope.clear(point, facts.position())) return;
                                const landed = hurt(current, other, "waterpulse", echoPower,
                                    { damage: damageSpec("waterpulse", "echo"), pulse: true });
                                // 伤害被拒（免疫、不可选中）就不溅水花、也不声称已命中。
                                if (!landed) return;
                                WorldFeedback.emit(scope, waterpulseScene, 1, facts.position(),
                                    { moment: "soak", target: ref, scale: scale,
                                        intensity: Math.max(0.4, Math.min(1.6, echoPower / 26)) }, 20);
                                if (scope.valid(other) && scope.random() < chance)
                                    waterpulseDaze(scope, other, facts.position(), daze, fumblePct);
                            });
                        WorldFeedback.emit(scope, waterpulseScene, 1, point,
                            { moment: "wave", radius: outer, step: step, pulses: pulses, blast: blast, flows: flows }, Math.max(10, interval + 8));
                        if (step >= pulses) { finish(current); return; }
                        current.after(interval, wave);
                    }
                    current.after(interval, wave);
                }
            }, function (current: CombatAction) {
                if (!impacted) finish(current);
            });
            WorldFeedback.keep(world, "waterpulse:trail:" + action.id(), waterpulseScene, 1, origin,
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity }, 120);
        }
    });


    // 耳鸣的飞鸟表现绑在托管载体上，随真实混乱效果自然到期或提前驱散一起结束，不靠自己的计时。
    function waterpulseDazeWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, waterpulseDazeEffect);
        if (carrier === null) { effect.end(); return; }
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "linger", waterpulseScene, 1, body.position(),
            { moment: "daze", target: String(target.ref()) });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(waterpulseDazeMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid waterpulse daze mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(waterpulseDazeMark, "start", waterpulseDazeWatch);
    WorldCombat.effectHandler(waterpulseDazeMark, "watch", waterpulseDazeWatch);
    WorldCombat.effectHandler(waterpulseDazeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 混乱被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_waterpulse/daze-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== waterpulseDazeEffect) return;
        const world = event.world(), actor = event.actor();
        world.effects(actor, waterpulseDazeMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });
}
