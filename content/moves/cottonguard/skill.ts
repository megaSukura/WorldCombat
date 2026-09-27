/**
 * 棉花防守：一层贴身绒衣绑定独立防御窗口；真正贴身的近战接触压掉绒层、按剩余层数收回本来源防御，
 * 并把打击者温和推开一小步。绒层存量由一条托管效果持有，随绒衣载体同寿；重施只替换本招自己那一份窗口。
 */
namespace PokemonSkills {
    const cottonGuardScene = "world_combat:move_cottonguard";
    const cottonGuardLayerScene = "world_combat:move_cottonguard_layers";
    const cottonGuardCoat = "world_combat:cotton_coat";
    const cottonGuardSlow = "world_combat:cotton_slow";
    const cottonGuardLayers = "world_combat:cotton_layers";
    const cottonGuardText = "world_combat.move.cottonguard.text.fluffed";
    const cottonGuardCrushText = "world_combat.move.cottonguard.text.crush";
    const cottonGuardBareText = "world_combat.move.cottonguard.text.bare";
    /** 表现里的参考半径：`data.scale = 实际鼓开半径 / 这个数`，让绒环与判定同半径。 */
    const cottonGuardReferenceRadius = 1.5;
    /** 近战接触消耗一层的最短间隔（刻），同一接触事件只结算一次。 */
    const cottonGuardThrottle = 8;
    /** 本招本次裹身贡献的窗口身份：重施时只撤自己这一份，其他来源不动。 */
    const cottonGuardSource = "world_combat:move/cottonguard";
    /** 真正贴身接触允许的最大身体间距（格）；更远的 contact 伤害属于远程或长柄攻击。 */
    const cottonGuardMeleeGap = 2.5;
    /** 窗口定义：宝可梦用原生 modifier 层，其他活体用共享窗口层。 */
    const cottonGuardWindows = ["cobblemon_world_combat:modifier", "world_combat:stages_window"];

    /** 两具身体实际碰撞箱之间的最近间距（格）；接触或重叠为 0。 */
    function cottonBodyGap(first: CombatObservation, second: CombatObservation): number {
        const amin = first.boundsMin(), amax = first.boundsMax(), bmin = second.boundsMin(), bmax = second.boundsMax();
        const dx = Math.max(0, Math.max(amin.x() - bmax.x(), bmin.x() - amax.x()));
        const dy = Math.max(0, Math.max(amin.y() - bmax.y(), bmin.y() - amax.y()));
        const dz = Math.max(0, Math.max(amin.z() - bmax.z(), bmin.z() - amax.z()));
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** 重施只撤去本招自己上次裹身的绒衣载体与配套窗口，其他来源的阶段与窗口保持不动。 */
    function cottonGuardRevokeOwn(world: CombatWorld, actor: CombatActor): void {
        cottonGuardWindows.forEach(function (definition) {
            world.effects(actor, definition).forEach(function (view) {
                const value = JSON.parse(String(view.data()));
                if (value && value.carrier && value.carrier.id === cottonGuardCoat && value.source === cottonGuardSource)
                    world.operation(view.id(), "world_combat:dispel", "{}");
            });
        });
        const coat = MobEffects.read(world, actor, cottonGuardCoat);
        if (coat !== null) world.removeMobEffect(actor, coat.id(), coat.key());
    }

    /** 本来源防御窗口在某个窗口 id 上交出的 def 级数；窗口已被关闭或驱散时返回 0。 */
    function cottonWindowDef(world: CombatWorld, actor: CombatActor, windowId: number): number {
        const definitions = cottonGuardWindows;
        for (let i = 0; i < definitions.length; i++) {
            const views = world.effects(actor, definitions[i]);
            for (let j = 0; j < views.length; j++) {
                if (views[j].id() !== windowId) continue;
                const value = JSON.parse(String(views[j].data()));
                return value && value.stages && value.stages.def ? value.stages.def : 0;
            }
        }
        return 0;
    }

    /** 绒层存量：绑定真实绒衣载体，载体被清除时由本单元一并结束它。 */
    WorldCombat.effect(cottonGuardLayers, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        ["total", "layers", "gift", "baseDef", "window", "lastHit", "scale", "rebound"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid cotton layer state");
        });
        if (typeof value.heavy !== "boolean") value.heavy = false;
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(cottonGuardLayers, "start", function (effect) {
        const world = effect.world(), holder = effect.target(), body = world.observe(holder);
        if (body === null) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        WorldFeedback.onEffect(world, effect.id(), "cottonguard:coat:" + String(holder.ref()), cottonGuardLayerScene, 1, body.position(),
            { moment: "coat", actor: String(holder.ref()), layers: state.layers, total: state.total,
                scale: state.scale, heavy: state.heavy ? 1 : 0 });
    });
    // 一次有效近战接触：压掉一层、按剩余层数收回防御，再把打击者水平推开一小步（原生抗性/取消照常生效）。
    WorldCombat.effectHandler(cottonGuardLayers, "operation:world_combat:cotton_crush", function (effect) {
        const world = effect.world(), holder = effect.target(), state = JSON.parse(effect.state()), now = world.tick();
        if (now - state.lastHit < cottonGuardThrottle) return;
        state.lastHit = now;
        if (state.layers > 0) state.layers = state.layers - 1;
        const current = cottonWindowDef(world, holder, state.window);
        const target = state.layers > 0 ? Math.max(1, Math.ceil(state.baseDef * state.layers / state.total)) : 0;
        if (target !== current) world.operation(state.window, "world_combat:stage_edit",
            JSON.stringify({ stat: "def", expected: current, value: target }));
        effect.state(JSON.stringify(state));
        const body = world.observe(holder), attacker = effect.caller();
        let moved = 0, heading: CombatPoint | null = null;
        if (body !== null && attacker !== null && world.valid(attacker)) {
            const striker = world.observe(attacker);
            if (striker !== null) {
                const away = WorldCombat.point(striker.position().x() - body.position().x(), 0,
                    striker.position().z() - body.position().z());
                if (away.length() > 0.05) {
                    heading = away.unit();
                    moved = world.hitDisplace(attacker, heading.scale(state.rebound));
                }
            }
        }
        if (body !== null) {
            const at = heading === null ? body.position() : body.position().plus(heading.scale(body.width() / 2 + 0.1));
            WorldFeedback.emit(world, cottonGuardScene, 1, at,
                { moment: "crush", actor: String(holder.ref()), direction: heading === null ? [0, 0, 0] : [heading.x(), 0, heading.z()],
                    moved: moved, layers: state.layers, total: state.total, scale: state.scale }, 20);
            WorldFeedback.onEffect(world, effect.id(), "cottonguard:coat:" + String(holder.ref()), cottonGuardLayerScene, 1, body.position(),
                { moment: "coat", actor: String(holder.ref()), layers: state.layers, total: state.total,
                    scale: state.scale, heavy: state.heavy ? 1 : 0, hitside: heading === null ? 0 : 1,
                    direction: heading === null ? [0, 0] : [heading.x(), heading.z()] });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.35, 0)), cottonGuardCrushText, [state.layers, target], 20);
        }
        if (state.layers <= 0) {
            const coat = MobEffects.read(world, holder, cottonGuardCoat);
            if (coat !== null) world.removeMobEffect(holder, coat.id(), coat.key());
            effect.end();
        }
    });
    WorldCombat.effectHandler(cottonGuardLayers, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "cottonguard",
        cooldownParameter: "wait",
        name: "棉花防守",
        description: "裹上绒衣大幅提高防御；近战接触每次压掉一层并温和推开打击者一小步，防御随剩余层数收回，最后一层或到期结束。选择厚裹时移动速度降低 25%。",
        uses: ["硬吃一轮爆发前先裹上绒衣", "被近身围攻时用回弹换一步脱身空间", "用绒衣窗口硬撑一段持续消耗"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 110,
        style: "cocoon",
        stationary: true,
        defaults: { cocoon: 1, ai: { maxChase: 12, panic: 0.6 } },
        fields: [
            field(pathOf("cocoon"), "绒层", "choice", {
                options: [
                    { value: 0, label: "轻裹" },
                    { value: 1, label: "厚裹" }
                ],
                help: "厚裹：防御 +3 级、绒层更久更多，但期间移动速度下降、起手与冷却更长；轻裹：防御 +2 级、不拖慢移动、更快。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("cottonguard", "bloom", pokemon), geometry: "area", style: "cocoon", color: 0xF6F3EA,
                label: config && Number(config.cocoon) === 1 ? "棉花防守 · 厚裹" : "棉花防守 · 轻裹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["cottonguard"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("cottonguard", "tempo", context)),
                recover: Math.round(p("cottonguard", "aftercast", context)),
                cooldown: Math.round(p("cottonguard", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_cottonguard:bloom", cottonGuardScene, 1, action.origin(),
                JSON.stringify({ moment: "bloom", heavy: config && Number(config.cocoon) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const heavy = !!(config && Number(config.cocoon) === 1);
            const gift = Math.max(2, Math.min(3, Math.round(p("cottonguard", "gift", action))));
            const bloom = Math.max(0.9, p("cottonguard", "bloom", action));
            const window = Math.max(120, Math.round(p("cottonguard", "coatTicks", action)));
            const fluff = Math.max(16, Math.round(p("cottonguard", "fluff", action)));
            const total = Math.max(3, Math.min(6, Math.round(p("cottonguard", "layers", action))));
            const rebound = Math.max(0.12, Math.min(0.35, p("cottonguard", "rebound", action)));
            const scale = bloom / cottonGuardReferenceRadius;
            // 重施先精确撤去本招自己上次的载体与窗口，再按本档重新给出 gift 级；不在旧贡献上累加。
            cottonGuardRevokeOwn(world, actor);
            const carrier = MobEffects.apply(world, actor, cottonGuardCoat, window, 0);
            if (carrier === null) { done(action); return; }
            const owned = NativeEffects.boostWindow(world, actor, { def: gift }, window,
                cottonGuardSource, carrier, null);
            if (!owned) { world.removeMobEffect(actor, carrier.id(), carrier.key()); done(action); return; }
            // 本来源防御实际交出多少，供按层收回时对齐窗口贡献。
            const baseDef = Math.max(0, cottonWindowDef(world, actor, owned));
            if (heavy) MobEffects.apply(world, actor, cottonGuardSlow, window, 0);
            else MobEffects.consume(world, actor, cottonGuardSlow);
            // 重施替换旧绒层，不留下失效锚。
            world.effects(actor, cottonGuardLayers).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            const state = { total: total, layers: total, gift: gift, baseDef: baseDef, window: owned,
                lastHit: -1000, scale: scale, rebound: rebound, heavy: heavy };
            const mark = world.effect(cottonGuardLayers, actor, JSON.stringify(state), window);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, cottonGuardScene, 1, feet,
                { moment: "wrap", actor: String(actor.ref()), gift: baseDef, bloom: bloom,
                    fluff: fluff, layers: total, scale: scale, heavy: heavy ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(2, baseDef / 2 + total * 0.1)) }, 34);
            if (mark)
                WorldFeedback.onEffect(world, mark, "cottonguard:coat:" + String(actor.ref()), cottonGuardLayerScene, 1, body.position(),
                    { moment: "coat", actor: String(actor.ref()), layers: total, total: total, scale: scale, heavy: heavy ? 1 : 0 });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), cottonGuardText, [baseDef, total], 32);
            world.sound("cobblemon:move.cottonguard.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 有效敌对近战接触触发一次绒层消耗；远程、友方与环境伤害不触发。
    WorldCombat.on("world_combat:move_cottonguard/hit", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), target = event.target(), attacker = event.actor();
        if (target === null || attacker === null || !world.valid(target) || !world.valid(attacker)) return;
        if (String(attacker.key()) === String(target.key())) return;
        if (world.allied(attacker, target)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (!DamageSemantics.read(data).contact) return;
        // 只认真正贴身的接触：身体间距超过近身范围的 contact 伤害（远程或长柄）不隔空压层。
        const body = world.observe(target), striker = world.observe(attacker);
        if (body === null || striker === null || cottonBodyGap(body, striker) > cottonGuardMeleeGap) return;
        const marks = world.effects(target, cottonGuardLayers);
        if (!marks.length) return;
        world.operation(marks[0].id(), "world_combat:cotton_crush", "{}");
    });

    // 共享窗口随绒衣解除；本单元同步结束绒层、撤去厚裹减速并播放结束反馈。
    WorldCombat.on("world_combat:move_cottonguard/bare", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== cottonGuardCoat) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, cottonGuardCoat) !== null) return;
        MobEffects.consume(world, actor, cottonGuardSlow);
        world.effects(actor, cottonGuardLayers).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, cottonGuardScene, 1, body.position(), { moment: "bare", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), cottonGuardBareText, [], 24);
    });
}
