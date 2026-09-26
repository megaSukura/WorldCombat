/**
 * 剑舞 / swordsdance 的出手方式。
 *
 * 核心念头：一段朝对手压上去的连斩。压低身形、拔刀起势，随后一步一斩地逼近，每一斩都在空气里留下刃光；
 * 定锋的一刻，脚步声与刀光一起落地，物攻大幅抬高。它是这一族里唯一会自己往前走的舞。
 *
 * 三幕：
 *   起势（windup，提交前）：拔刀、压低身形，刀光在脚边聚拢；可被打断，打断不消耗任何东西。
 *   连斩（提交后）：用来源独立的 boostWindow 把这次磨出的物攻挂成可见窗口（只抬这一笔，到期只撤这一笔，
 *     不从当前等级减总数）；随后按 cuts 斩出，每一斩沿提交时锁定的明确瞄向（AI 传威胁方向）前压
 *     step/cuts 格（配置「进逼」时），位移读真实回执，发一道刃弧并留下刃光。
 *   定锋（收势）：在身体真实走到的位置按 arc 半径荡开刃环，浮出结果；窗口走完时锋芒散去，等级由共享层收回。
 *
 * 与同族分开：龙之舞螺旋上升、蝶舞左右点踏、胜利之舞踏步立冠；剑舞是**前压的连斩**，只抬物攻。
 */
namespace PokemonSkills {
    const swordsdanceScene = "world_combat:move_swordsdance";
    const swordsdanceHone = "world_combat:swordsdance_hone";
    const swordsdanceText = "world_combat.move.swordsdance.text.honed";
    const swordsdanceFadeText = "world_combat.move.swordsdance.text.faded";
    const swordsdanceContribution = "world_combat:move/swordsdance";
    /** 表现里的参考半径：`data.scale = 实际刃风半径 / 这个数`，让地面刃环与判定同半径。 */
    const swordsdanceArc = 1.4;

    define({
        freeMovement: true,
        id: "swordsdance",
        cooldownParameter: "wait",
        name: "剑舞",
        description: "跳起一段朝对手压上去的战舞：压低身形、连挥刃光，大幅提高自己的物攻；刃光只显威势、不造成伤害，物攻增益只维持一段窗口，走完即被收回。",
        uses: ["开战前把物攻拉满", "一边前压一边起舞，直接切进对手身边", "用可见的磨刃窗口逼对手拖时间"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 110,
        style: "blade",
        stationary: true,
        defaults: { press: false, ai: { maxChase: 14, minGap: 3 } },
        fields: [flag("press", "进逼")],
        indicator: function (config, pokemon) {
            return { radius: p("swordsdance", "arc", pokemon), geometry: "area", style: "blade", color: 0xDCE8FF,
                label: config && config.press ? "剑舞 · 进逼" : "剑舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["swordsdance"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("swordsdance", "tempo", context)),
                recover: Math.round(p("swordsdance", "aftercast", context)),
                cooldown: Math.round(p("swordsdance", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_swordsdance:draw", swordsdanceScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", press: config && config.press ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p("swordsdance", "rise", action))));
            const cuts = Math.max(2, Math.min(5, Math.round(p("swordsdance", "cuts", action))));
            const beat = Math.max(3, Math.round(p("swordsdance", "beat", action)));
            const arc = Math.max(0.8, p("swordsdance", "arc", action));
            const stride = Math.max(0, p("swordsdance", "step", action)) / cuts;
            const sharpen = Math.max(8, Math.round(p("swordsdance", "sharpen", action)));
            const window = Math.max(80, Math.round(p("swordsdance", "hone", action)));
            const press = !!(config && config.press);
            const scale = arc / swordsdanceArc;
            // 提交时锁定的明确瞄向：AI 传威胁方向，手动读玩家瞄准；不再自行扫描无关敌人。
            const heading = action.direction();
            // 来源独立窗口：只抬本舞的物攻，结束只撤这一笔，不从当前等级减总数，也不会扣掉后来别的来源。
            const before = NativeEffects.effectiveStage(world, actor, "atk");
            const previous = MobEffects.read(world, actor, swordsdanceHone);
            const carrier = MobEffects.apply(world, actor, swordsdanceHone, window, 0);
            if (carrier === null) { done(action); return; }
            const owned = NativeEffects.boostWindow(world, actor, { atk: rise }, carrier.duration(),
                swordsdanceContribution, carrier, previous);
            if (!owned) { world.removeMobEffect(actor, carrier.id(), carrier.key()); done(action); return; }
            const levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "atk") - before);
            const intensity = Math.max(0.6, Math.min(2.2, levels / 2 + sharpen / 48));
            // 磨刃的持续锋光绑在这次真正的窗口上：随它自然到期或提前清除一起收，不额外占动作寿命。
            WorldFeedback.onEffect(world, owned, "world_combat:move_swordsdance/hone", swordsdanceScene, 1, body.position(),
                { moment: "hone", arc: arc, scale: scale, sharpen: sharpen, levels: levels, intensity: intensity });
            const chips = Math.max(4, Math.round(sharpen / cuts));
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function settle(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                WorldFeedback.emit(scope, swordsdanceScene, 1, here.position(),
                    { moment: "settle", arc: arc, scale: scale, cuts: cuts, sharpen: sharpen, levels: levels,
                        intensity: Math.max(0.6, Math.min(2.2, levels / 2 + sharpen / 48)) }, 30);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.3, 0)), swordsdanceText, [levels], 30);
                scope.sound("cobblemon:move.swordsdance.actor", here.position(), 18, "{}");
                finish(current);
            }
            function cutNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                // 前压读真实位移回执：被墙或目标挡住的一斩不会在远处画出脚尘。
                const moved = press && stride > 0.001 && heading.length() > 0.01
                    ? scope.displace(actor, heading.scale(stride)) : 0;
                const now = scope.observe(actor);
                const at = now === null ? here.position() : now.position();
                if (heading.length() > 0.01) scope.face(at.plus(heading), 30, 30);
                const ratio = stride > 0.001 ? Math.max(0, Math.min(1, moved / stride)) : 0;
                WorldFeedback.emit(scope, swordsdanceScene, 1, at,
                    { moment: "cut", arc: arc, scale: scale, cuts: cuts, index: index + 1, chips: chips,
                        sharpen: sharpen, press: press ? 1 : 0, travel: ratio,
                        dust: moved > 0.03 ? Math.max(4, Math.round(chips * ratio)) : 0,
                        intensity: Math.max(0.6, Math.min(2.2, sharpen / 32)) }, 22);
                scope.sound(index === 0 ? "cobblemon:move.swordsdance.actor" : "minecraft:item.trident.hit", at, 14, "{}");
                index++;
                if (index >= cuts) { current.after(beat, settle); return; }
                current.after(beat, cutNow);
            }
            cutNow(action);
        }
    });

    // 磨刃窗口的等级贡献由共享 boostWindow 拥有并撤回；这里只负责窗口结束时的收势反馈。
    WorldCombat.on("world_combat:move_swordsdance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== swordsdanceHone) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, swordsdanceHone) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, swordsdanceScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), swordsdanceFadeText, [], 24);
    });
}
