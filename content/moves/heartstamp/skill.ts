/**
 * 爱心印章 / heartstamp 的出手方式。
 *
 * 核心念头：先认真卖一次萌，把对手的警惕放下来，再扑上去补一记重击；补击正好落在破绽窗口里时，
 * 才算「乘机」，打得更重、更容易把它拍懵。两拍分开，玩家能读出「爱心先到、重击后到」，也来得及走开。
 *
 * 两幕：
 *   起（windup，提交前）：抬眼、摆出可爱姿势的预告。
 *   骗（feint）：提交后朝目标放出一颗爱心，给对方挂上共享身份 `world_combat:status/offguard`（疏忽）——
 *       本单元发明的新状态，物品栏可见，别人以后也能消费。只有目标当前可见、挡在施法者正面近距内且路线无遮挡时才骗得到；
 *       没选到有效敌人就跳过假动作、照常扑击。
 *   击（dash → seize/hit/miss）：隔 `feint` 刻后朝目标扑过去（逐刻 trace）；撞上时若目标仍带着疏忽且
 *       消费成功，这一击乘上乘机倍率、畏缩几率也乘上乘机倍率；窗口过了或消费失败就打一记平击。扑空则收势。
 *
 * 选取：`kind: "aim"`——方向、世界点或敌人辅助瞄准都行；墙既挡住假动作（骗不到），也挡住身体冲刺（扑空）。
 *
 * 与同族的区分：麻麻刺刺是一路带着电撞上去；爱心印章是先骗再打，胜负手在补击是否落在破绽窗口里。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const heartstampScene = "world_combat:move_heartstamp";
    const heartstampFlinchEffect = "world_combat:heartstamp_flinch";
    const heartstampOffguardEffect = "world_combat:heartstamp_offguard";
    const heartstampFlinchText = "world_combat.move.heartstamp.text.flinch";
    const heartstampFeintText = "world_combat.move.heartstamp.text.feint";
    const heartstampSeizeText = "world_combat.move.heartstamp.text.seize";
    const heartstampHitText = "world_combat.move.heartstamp.text.hit";
    const heartstampMissText = "world_combat.move.heartstamp.text.miss";

    function heartstampFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, heartstampFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 疏忽窗口的画面存续载体：跟真实疏忽效果一起停，被消费／驱散时立即撤，不留残影。 */
    const heartstampWindowMark = "world_combat:move_heartstamp/window_mark";

    function heartstampWindowTick(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, heartstampOffguardEffect);
        if (carrier === null) { effect.end(); return; }
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        WorldFeedback.onEffect(world, effect.id(), "window", heartstampScene, 1, body.position(),
            { moment: "window", target: String(target.ref()), charmTicks: remaining });
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(heartstampWindowMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid heartstamp window mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(heartstampWindowMark, "start", heartstampWindowTick);
    WorldCombat.effectHandler(heartstampWindowMark, "watch", heartstampWindowTick);
    WorldCombat.effectHandler(heartstampWindowMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 疏忽被牛奶／/effect clear 提前拿掉、或被乘机消费时，立即撤掉窗口画面，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_heartstamp/window-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== heartstampOffguardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, heartstampWindowMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        freeMovement: true,
        id: "heartstamp",
        cooldownParameter: "recharge",
        name: "Heart Stamp",
        description: "先卖一次萌，让对方进入短暂的疏忽窗口，再扑上去补一记重击；补击若落在窗口里就乘机打得更重、更容易把人拍懵。窗口很短，离得远等冲过去就过期了。",
        uses: ["近身骗一下再补重击", "把对手拍懵，抢一次先手", "对已经放松警惕的目标乘机加深一击"],
        kind: "aim",
        range: 4.6,
        maxRange: 8,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 22,
        style: "heart",
        defaults: { guile: false, ai: { maxChase: 8, seizeFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("heartstamp", "lunge", pokemon), geometry: "line", style: "heart", color: 0xE68BB4,
                label: config && config.guile === true ? "爱心印章·心机" : "爱心印章" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["heartstamp"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("heartstamp", "wink", context)),
                recover: Math.round(p("heartstamp", "settle", context)),
                cooldown: Math.round(p("heartstamp", "recharge", context)),
                active: 0,
                // 出手距离要落在「扑击距离 + 接触判定」之内，靠上去后这一扑才够得着。
                range: p("heartstamp", "lunge", context) + p("heartstamp", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            // 出扑时要抢的近距边界：窗口减去卖萌间隔后，按扑击速度能赶到的距离。
            const seizeReach = Math.max(0, (p("heartstamp", "charmTicks", action) - p("heartstamp", "feint", action)) * p("heartstamp", "pace", action));
            action.present("heartstamp:windup", heartstampScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", guile: config && config.guile === true, windup: prepare, seizeReach: seizeReach }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(heartstampScene);
            const world = action.world();
            const stamp = p("heartstamp", "stamp", action);
            const seize = p("heartstamp", "seize", action);
            const startle = p("heartstamp", "startle", action);
            const charmTicks = Math.max(1, Math.round(p("heartstamp", "charmTicks", action)));
            const feint = Math.max(1, Math.round(p("heartstamp", "feint", action)));
            const lunge = p("heartstamp", "lunge", action);
            const pace = p("heartstamp", "pace", action);
            const radius = p("heartstamp", "radius", action);
            const chance = p("heartstamp", "flinchChance", action);
            const flinchTicks = Math.round(p("heartstamp", "flinchTicks", action));
            const scale = radius / 0.55;
            // 出扑时要抢的近距边界：窗口减去卖萌间隔后，按扑击速度能赶到的距离。
            const seizeReach = Math.max(0, (charmTicks - feint) * pace);
            let travelled = 0, settled = false, lockedDirection: CombatPoint | null = null;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function miss(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, heartstampScene, 1, body.position(), { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), heartstampMissText, [], 22);
                }
                finish(current);
            }

            /** 扑到的一刻：结算这一击，并检查目标是否仍在疏忽窗口里。 */
            function land(current: CombatAction, hit: CombatImpact, direction: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                const victim = hit.target();
                // 友体不得被消费状态，也不结算这一击。
                if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { finish(current); return; }
                // 只认本次要消费的那一份有效载体；是否消费要等真实伤害落地。
                const carrier = CombatStatus.representative(scope, victim, "offguard");
                const carrierId = carrier === null ? "" : String(carrier.id());
                const seized = carrier !== null;
                const power = stamp * (seized ? seize : 1);
                const roll = chance * (seized ? startle : 1);
                const landed = hurt(current, victim, "heartstamp", power,
                    { damage: damageSpec("heartstamp", "stamp"), contact: true });
                // 原生拒绝伤害时不播乘机/重击，也不消耗任何标记。
                if (!landed) { finish(current); return; }
                if (seized && scope.valid(victim)) MobEffects.consume(scope, victim, carrierId);
                WorldFeedback.emit(scope, heartstampScene, 1, hit.position(),
                    { moment: seized ? "seize" : "hit", target: String(victim.ref()), scale: scale,
                        intensity: Math.max(0.5, Math.min(2, power / 60)), seized: seized ? 1 : 0 }, 28);
                sound(current, "cobblemon:impact.psychic");
                if (scope.valid(victim)) scope.hitDisplace(victim, direction.scale(0.6));
                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)),
                    seized ? heartstampSeizeText : heartstampHitText, [], 26);
                if (scope.random() < roll && heartstampFlinch(scope, victim, flinchTicks)) {
                    WorldFeedback.emit(scope, heartstampScene, 1, hit.position(), { moment: "flinch", target: String(victim.ref()) }, 24);
                    WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), heartstampFlinchText, [], 24);
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const here = current.origin();
                // 扑出的一刻锁死方向：之后目标侧移就能让这一扑落空。
                if (lockedDirection === null) {
                    let heading = aim(current);
                    const victim = current.target();
                    if (victim !== null && scope.valid(victim)) {
                        const at = scope.observe(victim);
                        if (at !== null) {
                            const delta = at.position().minus(here);
                            if (delta.length() > 0.05) heading = delta.unit();
                        }
                    }
                    lockedDirection = heading;
                }
                const direction = lockedDirection;
                const remaining = lunge - travelled;
                if (remaining <= 0.001) { miss(current); return; }
                const step = Math.min(pace, remaining);
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { land(current, hit, direction); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05) { miss(current); return; }
                movementScenes.show(current, "dash", here, { moment: "dash", scale: scale, travelled: Math.min(1, travelled / Math.max(0.001, lunge)), seizeReach: seizeReach });
                current.after(1, advance);
            }

            function feintNow(current: CombatAction): void {
                const scope = current.world();
                const actor = current.actor();
                const victim = current.target();
                const body = scope.observe(actor);
                const here = body === null ? current.origin() : body.position();
                const at = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (victim !== null && at !== null) {
                    const delta = at.position().minus(here), distance = delta.length();
                    const heading = WorldGeometry.flatUnit(current.direction());
                    // 正面近距：目标得在朝向前方约 120° 的近身范围内，且当前可见、路线无遮挡，才骗得到。
                    const frontal = distance <= 0.05 || WorldGeometry.dot(delta, heading) / distance >= Math.cos(60 * Math.PI / 180);
                    if (frontal && distance <= current.range() + 0.2 && scope.visible(victim) && scope.clear(here, at.position())
                        && CombatStatus.apply(scope, victim, "offguard", heartstampOffguardEffect, charmTicks)) {
                        const applied = MobEffects.read(scope, victim, heartstampOffguardEffect);
                        const windowTicks = applied !== null ? Math.max(1, applied.duration()) : charmTicks;
                        // 窗口画面交给托管载体：消费／驱散时立即停，随真实时长存续。
                        if (scope.effects(victim, heartstampWindowMark).length === 0)
                            scope.effect(heartstampWindowMark, victim, "{}", Math.max(1, Math.min(2400, windowTicks)));
                        // 表现窗口用实际挂上的 MobEffect 时长，缩小节奏与真实破绽一致。
                        WorldFeedback.emit(scope, heartstampScene, 1, at.position(),
                            { moment: "feint", target: String(victim.ref()), scale: scale, charm: windowTicks / 20,
                                charmTicks: windowTicks, hearts: Math.max(6, Math.round(6 + windowTicks / 20 * 2)) },
                            Math.max(28, windowTicks + 12));
                        WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), heartstampFeintText, [], 26);
                        sound(current, "minecraft:block.note_block.chime");
                    }
                }
                current.after(feint, function (next) { advance(next); });
            }

            feintNow(action);
        }
    });

}
