/**
 * 仆刀 / kowtowcleave 的出手方式。
 *
 * 核心念头：先跪拜引对方放下防备，等那一瞬的松懈，再欺身一刀劈下——只要真的贴上，就不做随机失手。
 *
 * 三幕：
 *   起：半跪蓄势（提交前 windup 预告）。
 *   拜：提交后跪拜，只对近处合法目标打上 dropguard（空门）身份并降防；画面画出那道破绽。
 *   劈：蓄拜结束，逐刻用原生碰撞的实际位移欺近目标；只有真实接触距离且视线无阻才 cleave，命中后把目标击退。
 *       追近预算（本招射程）耗尽、被墙挡住或目标离场就挥空——不在目标身上亮刀。空瞄（没有目标）也能空刀。
 *
 * 与同族分开：zingzap 是把冲程当燃料、powergem 是远射；仆刀靠先制造破绽、再兑现，是两段的近身。
 */
namespace PokemonSkills {
    const kowtowcleaveScene = "world_combat:move_kowtowcleave";
    const kowtowcleaveGuard = "world_combat:kowtow_guard";

    define({
        freeMovement: true,
        id: "kowtowcleave",
        name: "Kowtow Cleave",
        description: "先下跪引对手放下防备，让它裂开一瞬空门，再欺身一刀劈下；只有真实贴上、视线无阻才劈中，贴上后不做随机失手，命中把目标击退。追不上、被墙挡住或目标离场就挥空，空瞄也能空刀。",
        uses: ["下跪骗防再劈", "给目标开一瞬空门", "对高防目标补一刀加重"],
        kind: "aim",
        range: 5,
        prepare: 8,
        active: 24,
        recover: 10,
        cooldown: 40,
        style: "slash",
        defaults: { feint: false, ai: { maxChase: 8, openFirst: true, leaveStation: true } },
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
            const guardStages = Math.max(1, Math.round(p("kowtowcleave", "guardStages", action)));
            const guardTicks = Math.max(20, Math.round(p("kowtowcleave", "guardTicks", action)));
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
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; movement.finish(current, done); } }

            sound(action, "minecraft:entity.evoker.cast_spell");
            WorldFeedback.emit(world, kowtowcleaveScene, 1, origin,
                { moment: "bow", feint: feint, scale: 1, stages: guardStages }, bowTicks + 20);

            // 拜：只对近处合法目标开空门。
            let marked: CombatActor | null = null;
            if (target !== null && world.valid(target) && !world.friendly(target)) {
                const targetBody = world.observe(target);
                if (targetBody !== null && targetBody.position().minus(origin).length() <= baitRange) {
                    if (MobEffects.apply(world, target, kowtowcleaveGuard, guardTicks, 0) !== null) {
                        NativeEffects.boost(world, target, "def", -guardStages);
                        marked = target;
                        WorldFeedback.emit(world, kowtowcleaveScene, 1, targetBody.position(),
                            { moment: "open", target: String(target.ref()), stages: guardStages, ticks: guardTicks, scale: 1 },
                            Math.min(guardTicks, 120));
                    }
                }
            }

            /** 追不到、被挡或目标离场：在原位收刀，不在目标身上亮刀。 */
            function whiff(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self === null ? current.origin() : self.position();
                movement.stop(current);
                WorldFeedback.emit(scope, kowtowcleaveScene, 1, at, { moment: "miss", scale: radius / 0.5 }, 20);
                scope.sound("minecraft:entity.player.attack.sweep", at, 12, "{}");
                finish(current);
            }

            function cleaveHit(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                const currentWorld = current.world();
                if (!currentWorld.valid(victim)) { whiff(current); return; }
                const open = CombatStatus.has(currentWorld, victim, "dropguard");
                const amount = open ? cleavePower * (1 + guardBonus) : cleavePower;
                const landed = hurt(current, victim, "kowtowcleave", amount,
                    { damage: damageSpec("kowtowcleave", "cleave"), contact: true, slice: true });
                if (landed) {
                    const self = currentWorld.observe(actor);
                    const from = self === null ? origin : self.position();
                    const away = point.minus(from);
                    if (currentWorld.valid(victim) && away.length() > 0.05) currentWorld.hitDisplace(victim, away.unit().scale(push));
                }
                const self = currentWorld.observe(actor);
                const from = self === null ? origin : self.position();
                const notes = Math.max(8, Math.round(cleavePower / 4));
                movement.stop(current);
                WorldFeedback.emit(currentWorld, kowtowcleaveScene, 1, point,
                    { moment: "cleave", target: String(victim.ref()), open: open, intensity: open ? Math.min(2.4, intensity * 1.2) : intensity,
                        notes: notes, scale: radius / 0.5,
                        path: [[from.x(), from.y() + 0.9, from.z()], [point.x(), point.y() + 0.7, point.z()]] }, 28);
                currentWorld.sound("minecraft:entity.player.attack.sweep", point, 16, "{}");
                finish(current);
            }

            function close(current: CombatAction, victim: CombatActor, remaining: number): void {
                const currentWorld = current.world();
                if (!currentWorld.valid(victim)) { whiff(current); return; }
                const victimBody = currentWorld.observe(victim), selfBody = currentWorld.observe(actor);
                if (victimBody === null || selfBody === null) { whiff(current); return; }
                const from = selfBody.position(), to = victimBody.position();
                const delta = to.minus(from), distance = delta.length();
                const contact = radius + 0.9;
                if (distance <= contact) {
                    // 贴上才算：中间隔着墙就挥空。
                    if (!currentWorld.clear(from, to)) { whiff(current); return; }
                    cleaveHit(current, victim, to); return;
                }
                if (!currentWorld.clear(from, to)) { whiff(current); return; }
                if (remaining <= 0.01) { whiff(current); return; }
                const step = Math.min(stepLength, remaining);
                movement.show(current, "lunge", from,
                    { moment: "lunge", target: String(victim.ref()), scale: radius / 0.5, intensity: intensity });
                // 用原生碰撞的实际位移欺近：被墙或身体挡住就走不动，返回实走距离。
                const moved = LivingActions.step(currentWorld, actor, delta.unit().scale(step));
                if (moved < 0.05) { whiff(current); return; }
                current.after(1, function (later: CombatAction) { close(later, victim, remaining - moved); });
            }

            action.after(bowTicks, function (later: CombatAction) {
                const currentWorld = later.world();
                const victim = marked !== null && currentWorld.valid(marked) ? marked
                    : target !== null && currentWorld.valid(target) ? target : null;
                if (victim === null) { whiff(later); return; }
                close(later, victim, budget);
            });
        }
    });
}
