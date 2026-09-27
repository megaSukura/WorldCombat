/**
 * 磨爪 / honeclaws 的出手方式。
 *
 * 核心念头：抬起前爪，在身前交叠着快速刮几下，火星从爪缝里迸出来——磨出的锋口留在一段时间里，
 *   攻击与命中率各抬一档。它是本族里最快、最便宜的一支：起手短、冷却短、窗口也短，磨掉了就再补一次。
 *
 * 三幕：
 *   起势（windup，提交前）：抬起前爪，在身前交叠向中央对磨；客户端按锚点脚点 + 半身高定位身体中心，
 *     再用锚点的 bodyYaw 实时算出前/右/上，所以转身时两爪始终在身前。这一步只是观察与预告，可被打断，
 *     打断不消耗任何东西，也不给等级。
 *   磨（提交后）：物攻与命中能力等级各抬起（原生 +1，配置「深磨」物攻 +2），挂上共享身份
 *     world_combat:status/honeclaws 的锋口窗口。等级本身由 boostWindow 拥有并绑在这层锋口载体上：
 *     窗口到期、被提前清除，或再次施放刷新同一窗口时，都只会撤去本招这一次实际贡献的级数。
 *   收（收势）：两爪交错处迸出火星、浮出结果；窗口走完或被清除时，本招的等级随窗口自行收回。
 *
 * 与同族分开：盘蜷是慢而完整的架势（攻/防/命中三项、窗口最长）；磨爪是随手一蹭，只抬攻与命中，最快、最便宜。
 */
namespace PokemonSkills {
    const honeclawsScene = "world_combat:move_honeclaws";
    const honeclawsEdge = "world_combat:honeclaws_edge";
    const honeclawsContribution = "world_combat:move/honeclaws";
    const honeclawsText = "world_combat.move.honeclaws.text.honed";
    const honeclawsCappedText = "world_combat.move.honeclaws.text.capped";
    const honeclawsFadeText = "world_combat.move.honeclaws.text.faded";
    /** 表现里的参考半径：`data.scale = 实际刮擦半径 / 这个数`。 */
    const honeclawsReference = 0.7;

    /**
     * 用真实身体算出这一招的尺度：reach 是爪锋交点离身体中心的前向距离，lift 是从身体中心上抬的高度，
     * span/rise 撑起两爪的宽度与斜高。朝向由客户端按锚点的 bodyYaw 实时重算，这里同时带上出生时的
     * forward/right/up 作为无锚点时的兜底；判定与表现共用这一组尺度。
     */
    function honeclawsPlacement(world: CombatWorld, actor: CombatActor, body: CombatObservation): any {
        const look = WorldGeometry.facing(world, actor);
        const forward = WorldGeometry.flatUnit(look === null ? WorldCombat.point(0, 0, 1) : look);
        const axis = WorldGeometry.basis(forward);
        const height = body.height(), width = body.width();
        const reach = 0.28 + width * 0.35;
        const span = 0.22 + width * 0.35;
        const rise = 0.08 + height * 0.12;
        return {
            forward: [axis.forward.x(), axis.forward.y(), axis.forward.z()],
            right: [axis.right.x(), axis.right.y(), axis.right.z()],
            up: [axis.up.x(), axis.up.y(), axis.up.z()],
            reach: reach, lift: height * 0.10, span: span, rise: rise, height: height
        };
    }

    define({
        id: "honeclaws",
        cooldownParameter: "wait",
        name: "磨爪",
        description: "抬起前爪交叠着快速刮几下，把爪子磨得更锋利：攻击与命中率各提高一级。锋口只维持一段可见的窗口，窗口走完时这两项会被收回；它起手与冷却都短，可以反复补磨。",
        uses: ["开打前先蹭两下，把攻与命中一起垫起来", "命中被削、连击失手时随手补一档", "用最短的窗口保持锋口常新"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 72,
        style: "claw",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("deep", "深磨")],
        indicator: function (config, _pokemon) {
            return { radius: honeclawsReference, geometry: "area", style: "claw", color: 0xD8E4F0,
                label: config && config.deep === true ? "磨爪 · 深磨" : "磨爪 · 快磨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["honeclaws"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("honeclaws", "tempo", context)),
                recover: Math.round(p("honeclaws", "aftercast", context)),
                cooldown: Math.round(p("honeclaws", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            // 提交前只有只读世界：用 sense() 算真实爪锋位置，用 present() 播短对磨过程，成功后才在 execute 里给等级。
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            if (body !== null) {
                const data: any = honeclawsPlacement(world, actor, body);
                data.moment = "hone";
                data.actor = String(actor.ref());
                data.start = world.tick();
                data.duration = prepare;
                data.strokes = Math.max(2, Math.min(4, Math.round(p("honeclaws", "scrapes", action))));
                data.sparks = Math.max(2, Math.min(8, data.strokes + 2));
                data.gain = 0;
                data.shine = 0;
                data.full = 0;
                data.scale = 1;
                data.deep = config && config.deep === true ? 1 : 0;
                action.present("world_combat:move_honeclaws:grind", honeclawsScene, 1, body.position(), JSON.stringify(data));
            }
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p("honeclaws", "rise", action))));
            const focus = Math.max(1, Math.min(2, Math.round(p("honeclaws", "focus", action))));
            const window = Math.max(80, Math.round(p("honeclaws", "edge", action)));
            const strokes = Math.max(2, Math.min(4, Math.round(p("honeclaws", "scrapes", action))));
            const before = NativeEffects.effectiveStages(world, actor);
            // 锋口载体拥有这份攻/准贡献：刷新先按 previous 结束同招旧窗口，只续上本招自己那一份。
            const previous = MobEffects.read(world, actor, honeclawsEdge);
            const carrier = MobEffects.apply(world, actor, honeclawsEdge, window, previous ? previous.amplifier() : 0);
            let windowId = 0, gainedRise = 0, gainedFocus = 0;
            if (carrier) {
                windowId = NativeEffects.boostWindow(world, actor, { atk: rise, accuracy: focus }, carrier.duration(),
                    honeclawsContribution, carrier, previous);
                const raised = NativeEffects.effectiveStages(world, actor);
                gainedRise = Math.max(0, (raised.atk || 0) - (before.atk || 0));
                gainedFocus = Math.max(0, (raised.accuracy || 0) - (before.accuracy || 0));
            }
            const gain = gainedRise + gainedFocus;
            // 上限未增：不留一层空锋口，也不播完整升级，只刮掉表面浮光。
            if (!windowId) MobEffects.consume(world, actor, honeclawsEdge);
            const placement: any = honeclawsPlacement(world, actor, body);
            placement.moment = "settle";
            placement.actor = String(actor.ref());
            placement.start = world.tick();
            placement.strokes = strokes;
            placement.gain = gain;
            placement.shine = gain * 7;
            placement.sparks = Math.max(4, Math.min(20, Math.round(gain * 6 + strokes)));
            placement.full = gain > 0 ? 1 : 0;
            placement.scale = 1;
            WorldFeedback.emit(world, honeclawsScene, 1, body.position(), placement, 30);
            if (windowId) {
                // 锋口窗口还在的期间，两爪尖端各留一点冷光。朝向由客户端按锚点的 bodyYaw 每帧实时重算，
                // 所以这条持续表现不需要服务端再按刻重发；窗口结束或被清除时它随窗口一起收。
                const hum: any = honeclawsPlacement(world, actor, body);
                hum.moment = "hum";
                hum.actor = String(actor.ref());
                hum.start = world.tick();
                hum.scrapes = strokes;
                hum.scale = 1;
                WorldFeedback.onEffect(world, windowId, "world_combat:move_honeclaws/edge", honeclawsScene, 1, body.position(), hum);
            }
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
                gain > 0 ? honeclawsText : honeclawsCappedText, gain > 0 ? [gainedRise, gainedFocus] : [], 30);
            world.sound("cobblemon:move.dragonclaw.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 锋口窗口走完或被清除：等级由载体窗口自行收回，这里只收尾表现。
    WorldCombat.on("world_combat:move_honeclaws/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== honeclawsEdge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束，不播散去。
        if (MobEffects.read(world, actor, honeclawsEdge)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const placement: any = honeclawsPlacement(world, actor, body);
        placement.moment = "fade";
        placement.actor = String(actor.ref());
        placement.start = world.tick();
        placement.scale = 1;
        WorldFeedback.emit(world, honeclawsScene, 1, body.position(), placement, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), honeclawsFadeText, [], 22);
    });
}
