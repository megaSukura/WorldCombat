/**
 * 泡沫光线 / bubblebeam 的出手方式。
 *
 * 核心念头：**一串慢泡泡依次飘过去，能逼敌人绕开泡列**。三枚泡球相隔 3 刻、各自沿当刻准线慢慢飘出，
 *   每颗首次碰到实体或墙就破；整招的主伤预算均分到三颗上，没有凭空出现在终点的扇溅，也没有末端
 *   持续伤害场。它打不疼，但泡泡慢到能被看见、能被提前布在敌人横移的路线上——留下共享身份
 *   `world_combat:status/foamed` 并压速度，是它区别于同族快水招的地方。
 *
 * 幕：
 *   起（windup，提交前）：口边冒起成串小泡、越冒越密，只播预告（可被打断）。
 *   涌（stream，提交后）：按 gap 连吐三颗慢泡，空中可同时存在；每颗首次碰实体/墙/射程尽头就破，
 *       碰到非友方活体结算那一份 `foam` 伤害。
 *   黏（cling / pop）：同一目标在这一串里至多判定一次黏滞与一次泡沫，且必须真的被泡伤到；
 *       泡沫在身上持续冒泡，走完 `clingTicks` 自然爆掉，或被外力清掉。
 *
 * 与同族分开：唯一会黏住目标、把一串慢泡布在敌人路线上的水属性喷射；画面上是三颗会飘、会挨个破的泡球。
 *
 * 配置 `dense`（浓沫）由公式改威力／概率／级数／半径／散布／时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const bubblebeamScene = "world_combat:move_bubblebeam";
    const bubblebeamFoamEffect = "world_combat:bubblebeam_foam";
    const bubblebeamClingText = "world_combat.move.bubblebeam.text.cling";
    const bubblebeamMissText = "world_combat.move.bubblebeam.text.miss";

    /** 在目标身上黏一层泡沫：借共享身份 foamed（本单元发明的概念），独一无二地替换同类载体。 */
    function bubblebeamFoam(world: CombatWorld, victim: CombatActor, ticks: number): boolean {
        return CombatStatus.apply(world, victim, "foamed", bubblebeamFoamEffect,
            Math.max(40, Math.round(ticks)), 0, { unique: true, secondary: true });
    }

    /** 按概率把速度降下来：共享能力等级阶梯，对宝可梦、原版生物、玩家同一条路。 */
    function bubblebeamSlow(world: CombatWorld, victim: CombatActor, chance: number, stages: number): boolean {
        if (world.random() >= chance) return false;
        NativeEffects.boost(world, victim, "spe", -stages);
        return true;
    }

    /** 当刻自由瞄准：按住技能键时读控制点（逐颗可转向布弧），AI 或未声明的输入回退到动作选点。 */
    function bubblebeamAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
        } catch (error) { }
        try { return action.targetPosition(); } catch (error) { }
        return action.origin().plus(WorldCombat.point(0, 0, 1));
    }

    define({
        id: "bubblebeam",
        cooldownParameter: "recharge",
        name: "Bubble Beam",
        description: "连吐三颗慢泡泡，依次沿准线飘出：每颗首次碰到实体或墙就破并按实际首碰者结算伤害，三颗均分整招威力。被泡伤到的目标在同一串里至多判定一次黏滞与一次泡沫，掉速度并被黏住；转准心可以把后发的泡布到另一条路线上。浓沫更黏、泡更大更慢；急泡更快更远、泡更小。",
        uses: ["用一串慢泡堵住敌人横移的路线，逼它绕开", "把跑得快的对手黏住、压它速度", "给目标留下一层黏着的泡沫"],
        kind: "aim",
        range: 12,
        maxRange: 17,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "foam",
        defaults: { dense: false, ai: { maxChase: 14, crippleRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bubblebeam", "reach", pokemon), geometry: "line", style: "foam",
                color: 0x8FE0F0, label: config && config.dense === true ? "浓沫光线" : "泡沫光线" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bubblebeam"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bubblebeam", "tempo", context)),
                recover: Math.round(p("bubblebeam", "aftercast", context)),
                cooldown: Math.round(p("bubblebeam", "recharge", context)),
                active: 0,
                range: p("bubblebeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bubblebeam:charge", bubblebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", bubbles: Math.round(p("bubblebeam", "bubbles", action)),
                    dense: config && config.dense === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const power = p("bubblebeam", "foam", action);
            const chance = Math.max(0.02, Math.min(0.9, p("bubblebeam", "slowChance", action)));
            const stages = Math.max(1, Math.min(2, Math.round(p("bubblebeam", "slowStages", action))));
            const cling = Math.max(60, Math.round(p("bubblebeam", "clingTicks", action)));
            const radius = Math.max(0.18, p("bubblebeam", "radius", action));
            const speed = Math.max(0.4, p("bubblebeam", "velocity", action));
            const spread = Math.max(1.0, p("bubblebeam", "spread", action));
            const bubbles = Math.max(12, Math.round(p("bubblebeam", "bubbles", action)));
            const dense = !!(config && config.dense);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.28));
            const intensity = Math.max(0.5, Math.min(2.2, power / 65));
            const range = action.range();
            const shots = 3, gap = 3;
            const perBubble = power / shots;
            const hitOnce: { [ref: string]: boolean } = Object.create(null);
            const scenes = WorldFeedback.actionScenes(bubblebeamScene);
            let fired = 0, active = 0, settled = false, landed = false;

            function finish(current: CombatAction): void {
                if (settled || fired < shots || active > 0) return;
                settled = true;
                if (!landed) {
                    const body = current.world().observe(action.actor());
                    if (body !== null) WorldFeedback.text(current.world(), body.position().plus(WorldCombat.point(0, 1.2, 0)), bubblebeamMissText, [], 22);
                }
                scenes.finish(current, done);
            }

            function release(current: CombatAction): void { active--; finish(current); }

            /** 吐出一颗慢泡：每颗独立飞行、首次碰撞即破。 */
            function shoot(current: CombatAction): void {
                if (settled) return;
                if (fired >= shots) { finish(current); return; }
                const scope = current.world();
                const body = scope.observe(action.actor());
                const origin = body !== null ? body.position() : current.origin();
                const index = fired + 1;
                fired++;
                let aimed = bubblebeamAim(current);
                const watched = current.target();
                if (watched !== null && scope.valid(watched)) {
                    const state = scope.observe(watched);
                    if (state !== null) {
                        const delta = state.position().minus(origin);
                        const eta = delta.length() / Math.max(0.2, speed);
                        const drift = state.velocity();
                        aimed = aimed.plus(WorldCombat.point(drift.x() * eta, 0, drift.z() * eta));
                    }
                }
                let direction = aimed.minus(origin);
                if (direction.length() < 0.05) direction = current.direction();
                direction = direction.unit();
                const angle = (index - 2) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                direction = WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(),
                    direction.x() * sin + direction.z() * cos);
                let resolved = false, closed = false;
                const key = "bubble:" + index;
                active++;
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: range, radius: radius, direction: direction, gravity: 0,
                    lifetime: Math.max(24, Math.round(range / Math.max(0.2, speed) + 16)),
                    appearance: { sprite: "cobblemon:generic/bubble/bigbubble", tint: 0x8FE0F0, glow: true,
                        scale: Math.max(0.8, Math.min(1.8, radius / 0.28)) },
                    impact: function (inner: CombatAction, hit: CombatImpact) {
                        resolved = true;
                        scenes.stop(inner, key);
                        const stage = inner.world(), victim = hit.target(), at = hit.position();
                        if (victim !== null && stage.valid(victim) && !stage.friendly(victim)) {
                            if (impact(inner, hit, "bubblebeam", perBubble, { damage: damageSpec("bubblebeam", "foam") })) {
                                landed = true;
                                const ref = String(victim.ref());
                                let slowed = 0;
                                if (!hitOnce[ref]) {
                                    hitOnce[ref] = true;
                                    slowed = bubblebeamSlow(stage, victim, chance, stages) ? 1 : 0;
                                    bubblebeamFoam(stage, victim, cling);
                                }
                                WorldFeedback.emit(stage, bubblebeamScene, 1, at,
                                    { moment: "burst", target: ref, bubbles: bubbles, stages: stages, slowed: slowed,
                                        scale: scale, intensity: intensity, index: index }, 24);
                                if (slowed) WorldFeedback.text(stage, at.plus(WorldCombat.point(0, 1.2, 0)), bubblebeamClingText, [stages], 26);
                                sound(inner, "cobblemon:move.bubblebeam.target");
                                sound(inner, "minecraft:block.bubble_column.bubble_pop");
                            }
                        } else {
                            WorldFeedback.emit(stage, bubblebeamScene, 1, at,
                                { moment: "splat", bubbles: bubbles, scale: scale, intensity: intensity, index: index }, 20);
                            stage.sound("minecraft:block.bubble_column.bubble_pop", at, 14, "{}");
                        }
                        if (!closed) { closed = true; release(inner); }
                    }
                }, function (inner: CombatAction) {
                    if (!resolved) {
                        scenes.stop(inner, key);
                        WorldFeedback.emit(inner.world(), bubblebeamScene, 1, origin.plus(direction.scale(range)),
                            { moment: "splat", bubbles: Math.round(bubbles * 0.6), scale: scale,
                                intensity: Math.max(0.4, intensity * 0.7), index: index }, 18);
                    }
                    if (!closed) { closed = true; release(inner); }
                });
                sound(current, "cobblemon:move.bubblebeam.actor");
                scenes.show(current, key, origin,
                    { moment: "stream", projectile: flight, bubbles: bubbles, scale: scale,
                        intensity: intensity, dense: dense ? 1 : 0, index: index });
                if (fired < shots) current.after(gap, shoot);
                else finish(current);
            }

            sound(action, "cobblemon:move.bubblebeam.actor");
            shoot(action);
        }
    });

    // 玩家按住技能键连吐三颗泡、每颗之间可转向布弧；AI 提交仍带一个目标点，读同一条控制输入。
    WorldCombat.preview("world_combat:bubblebeam", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));

    // 泡沫自然爆开（或被外力清掉）：在目标身上补一记小泡爆，让「黏着」有明确的结束。
    WorldCombat.on("world_combat:move_bubblebeam/pop", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bubblebeamFoamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, bubblebeamScene, 1, body.position(),
            { moment: "pop", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });

    // 黏着期间在脚边维持一小圈缓慢上浮的泡：少而稳，让出本体视线。
    WorldCombat.on("world_combat:move_bubblebeam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bubblebeamFoamEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "bubblebeam:foam:" + String(actor.ref()), bubblebeamScene, 1, body.position(),
            { moment: "cling", target: String(actor.ref()), bubbles: 10 }, 40);
    });
}
