/**
 * 仆刀 / kowtowcleave 的出手方式。
 *
 * 核心念头：先跪拜引对手上钩，等那一瞬的松懈，再欺身递刀——刀尖真实碰上第一个身体才结算，贴上后不做随机失手。
 *
 * 三幕：
 *   起：半跪蓄势（提交前 windup 预告）。
 *   拜：提交后跪拜；只有当拜击范围内本次原本的目标在这段时间里真正朝自己逼近 >= 0.4 格，或真的对自己发起过一次
 *       原生攻击，才算上钩。上钩只给本次对该人的空门加成，画面当刻开一道短口。没有上钩照常出刀；不再前置降防，
 *       也不再给通用 dropguard（空门）标记。
 *   劈：蓄拜结束，朝本次瞄准方向以原生 moveSweep 逐刻欺近；第一个真实碰到的非友方身体就是刀口落点，
 *       若它正是上钩的人就吃空门加成。追近预算（本招射程）耗尽、被墙挡住或走不动就挥空，空瞄也能空刀。
 *
 * 与同族分开：zingzap 把冲程当燃料、powergem 是远射；仆刀靠一次可观察的诱敌、再兑现成一刀。
 */
namespace PokemonSkills {
    const kowtowcleaveScene = "world_combat:move_kowtowcleave";

    define({
        freeMovement: true,
        id: "kowtowcleave",
        name: "Kowtow Cleave",
        description: "先下跪引对手朝自己逼近或出手，抓那一瞬空门欺身挑一刀；只有真实贴上、视线无阻才劈中，贴上后不掷命中，命中把目标击退。没上钩也照常出刀；追不上、被墙挡住或目标离场就挥空，空瞄也能空刀。",
        uses: ["下跪诱敌再劈一刀", "对真的上钩的目标补一刀加重", "朝瞄准方向欺身，第一个碰到的身体承刀"],
        kind: "aim",
        range: 5,
        prepare: 8,
        active: 24,
        recover: 10,
        cooldown: 40,
        style: "slash",
        defaults: { feint: false, ai: { maxChase: 8, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("kowtowcleave", "collisionRadius", pokemon) * 1.4, geometry: "line", style: "dark", color: 0x7A5AA8, label: "仆刀" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["kowtowcleave"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var feint = !!(config && config.feint);
            return {
                prepare: p("kowtowcleave", "prepare", context) + (feint ? 4 : 0),
                recover: p("kowtowcleave", "recover", context),
                cooldown: p("kowtowcleave", "cooldown", context) + (feint ? 6 : 0)
            };
        },
        windup: function (action, config, prepare) {
            var feint = !!(config && config.feint);
            action.present("world_combat:move_kowtowcleave:windup", kowtowcleaveScene, 1, action.origin(),
                JSON.stringify({ moment: "bow", windup: prepare, feint: feint }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const feint = !!(config && config.feint);
            const baitRange = p("kowtowcleave", "baitRange", action);
            const bowTicks = Math.max(2, Math.round(p("kowtowcleave", "bowTicks", action)));
            const stepLength = p("kowtowcleave", "lunge", action);
            const cleavePower = p("kowtowcleave", "cleave", action);
            const guardBonus = p("kowtowcleave", "guardBonus", action);
            const push = p("kowtowcleave", "push", action);
            const radius = p("kowtowcleave", "collisionRadius", action);
            const intensity = Math.max(0.6, Math.min(2.2, cleavePower / 85));
            const budget = Math.max(1, action.range());
            const movement = WorldFeedback.actionScenes(kowtowcleaveScene);
            const target = action.target();
            const startTick = world.tick();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const startedAt = targetBody === null ? null : targetBody.position();
            const selfBody = world.observe(actor);
            const selfStartedAt = selfBody === null ? origin : selfBody.position();
            let settled = false;
            let hooked: string | null = null;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movement.finish(current, done); } }

            sound(action, "minecraft:entity.evoker.cast_spell");
            WorldFeedback.emit(world, kowtowcleaveScene, 1, origin,
                { moment: "bow", feint: feint, scale: 1 }, bowTicks + 20);

            /** 追不到、被挡或走不动：在原位收刀，只在施法者处出 miss。 */
            function whiff(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self === null ? current.origin() : self.position();
                movement.stop(current);
                WorldFeedback.emit(scope, kowtowcleaveScene, 1, at, { moment: "miss", scale: radius / 0.5 }, 20);
                scope.sound("minecraft:entity.player.attack.sweep", at, 12, "{}");
                finish(current);
            }

            /** 刀尖真实碰上的一刻：只有实际上钩的那一口才吃空门加成，拦截体不吃。 */
            function cleaveHit(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                const scope = current.world();
                if (!scope.valid(victim)) { whiff(current); return; }
                const open = hooked !== null && String(victim.ref()) === hooked;
                const amount = open ? cleavePower * (1 + guardBonus) : cleavePower;
                const landed = hurt(current, victim, "kowtowcleave", amount,
                    { damage: damageSpec("kowtowcleave", "cleave"), contact: true, slice: true });
                const self = scope.observe(actor);
                const from = self === null ? origin : self.position();
                if (landed && scope.valid(victim) && point.minus(from).length() > 0.05)
                    scope.hitDisplace(victim, point.minus(from).unit().scale(push));
                const notes = Math.max(8, Math.round(cleavePower / 4));
                movement.stop(current);
                WorldFeedback.emit(scope, kowtowcleaveScene, 1, point,
                    { moment: "cleave", target: String(victim.ref()), open: open,
                        intensity: open ? Math.min(2.4, intensity * 1.2) : intensity,
                        notes: notes, scale: radius / 0.5,
                        path: [[from.x(), from.y() + 0.9, from.z()], [point.x(), point.y() + 0.7, point.z()]] }, 28);
                scope.sound("minecraft:entity.player.attack.sweep", point, 16, "{}");
                finish(current);
            }

            /** 逐刻朝瞄准方向欺近：原生 moveSweep 停在第一个真实碰到的非友方身体上，不靠距离点名。 */
            function press(current: CombatAction, remaining: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { whiff(current); return; }
                const here = self.position();
                let direction = current.direction();
                const handle = current.target();
                if (handle !== null && scope.valid(handle)) {
                    const at = scope.observe(handle);
                    if (at !== null) { const delta = at.position().minus(here); if (delta.length() > 0.05) direction = delta.unit(); }
                }
                if (self.grounded()) direction = WorldGeometry.flatUnit(direction, current.direction());
                movement.show(current, "lunge", here, { moment: "lunge", scale: radius / 0.5, intensity: intensity });
                const step = Math.min(stepLength, remaining);
                const contact = current.moveSweep(direction.scale(step), radius);
                const after = scope.observe(actor);
                const moved = after === null ? 0 : after.position().minus(here).length();
                if (contact.hitEntity()) {
                    const victim = contact.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim) && String(victim.ref()) !== String(actor.ref()))
                        cleaveHit(current, victim, contact.position());
                    else whiff(current);
                    return;
                }
                if (contact.blocked() || moved < 0.05 || remaining - moved <= 0.01) { whiff(current); return; }
                current.after(1, function (later: CombatAction) { press(later, remaining - moved); });
            }

            action.after(bowTicks, function (later: CombatAction) {
                const scope = later.world();
                // 上钩判定：仅认本次原本的目标；拜击范围内真正逼近 >= 0.4 格、或真的对自己发起过一次原生攻击。
                if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                    const body = scope.observe(target);
                    const self = scope.observe(actor);
                    if (body !== null && self !== null && body.position().minus(self.position()).length() <= baitRange) {
                        // 记忆只保留真正已发生的原生攻击；用 tick 过滤保证只认拜势期间的新出手，这点余量只为避开同刻写入顺序。
                        const age = Math.max(20, scope.tick() - startTick + 5);
                        const attack = DamageSemantics.recentAttack(scope, target, age);
                        const attackedSelf = attack !== null && attack.tick >= startTick && String(attack.target) === String(actor.ref());
                        let approached = false;
                        if (startedAt !== null) {
                            const toSelf = selfStartedAt.minus(startedAt);
                            const span = toSelf.length();
                            if (span > 1e-4) {
                                const travel = body.position().minus(startedAt);
                                approached = (travel.x() * toSelf.x() + travel.y() * toSelf.y() + travel.z() * toSelf.z()) / span >= 0.4;
                            }
                        }
                        if (attackedSelf || (approached && scope.clear(self.position(), body.position()))) {
                            hooked = String(target.ref());
                            WorldFeedback.emit(scope, kowtowcleaveScene, 1, body.position(),
                                { moment: "open", target: hooked, scale: 1, intensity: intensity }, 24);
                        }
                    }
                }
                press(later, budget);
            });
        }
    });
}
