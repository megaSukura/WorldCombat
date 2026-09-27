/**
 * 苹果酸 / appleacid —— 注册与动作。
 *
 * 核心念头：**扔出一颗会发酵的酸苹果**。它砸中单一目标就把对方的特防泡软并留一层「发酵」；
 * 目标在发酵没退之前再挨一颗，第二口更狠（−2）并把那层发酵消费掉，之后重新从 −1 起算。
 * 它不溅射、不封地，只结算直接命中的那一个目标——和酸液封地、毒液冲击消费外部毒各走各的路。
 *
 * 三幕：
 *   起（windup，提交前）：手里掂着酸苹果、酸汁滴落（`action.present` 预告，不碰世界）。
 *   掷（cast，提交后）：低弧抛出苹果（原生投射物携带物品外观）。
 *   命中（impact）：主碰撞走 `impact`，保留真实弹体回执；命中非友方就结算 core，并按目标身上
 *       本施法者留下的发酵窗口决定掉 1 级或 2 级特防；第二口真正消费掉那层窗口后才不留新发酵。
 *   发酵（ferment，持续）：目标身上那层酸的画面由**真正拥有的托管效果** `appleacidFermentWindow`
 *       承载：实际发招的命中把最新 carrier 的 id/key 交给它建立本来源窗口，被消费/到期/被清即收回，
 *       外部同身份 sour 不属于本招窗口，也不会被本招当作第二口。
 *
 * 选取 `kind: "aim"`：自由抛点（地面落空）或点实体；`target` 为 null 时沿提交朝向抛出，不要求存在敌人。
 *
 * 配置 `ferment`（发酵式）由 resolve 改时序与射程、由公式改发酵窗口；开启＝更黏、更容易接上第二口，
 * 关闭（爆汁式）＝一发更痛、飞得更快。
 */
namespace PokemonSkills {
    const appleacidScene = "world_combat:move_appleacid";
    const appleacidSour = "world_combat:appleacid_sour";
    export const appleacidFermentWindow = "world_combat:appleacid_ferment";
    const appleacidSourText = "world_combat.move.appleacid.text.sour";
    const appleacidStackText = "world_combat.move.appleacid.text.stack";
    const appleacidFermentText = "world_combat.move.appleacid.text.ferment";
    const appleacidMissText = "world_combat.move.appleacid.text.miss";
    const appleacidWindowTicks = 1600;

    /** 把发酵身份施加到任意战斗者身上，走共享身份；只留一层本招载体。成功施加才返回 true。 */
    function appleacidFerment(world: CombatWorld, actor: CombatActor, ticks: number): boolean {
        return CombatStatus.apply(world, actor, "sour", appleacidSour, ticks, 0, { unique: true });
    }

    /** 本施法者在目标身上留下的那个 carrier 快照；锚点与实时载体不符则不算本来源窗口。 */
    function appleacidOwnCarrier(world: CombatWorld, actor: CombatActor, owner: string): MobEffects.Anchor | null {
        const views = world.effects(actor, appleacidFermentWindow);
        for (let i = 0; i < views.length; i++) {
            if (String(views[i].source().ref()) !== owner) continue;
            let anchor: any;
            try { anchor = JSON.parse(views[i].data()); } catch (error) { continue; }
            if (!MobEffects.validAnchor(anchor) || !MobEffects.matches(world, actor, anchor)) continue;
            return { id: anchor.id, key: anchor.key };
        }
        return null;
    }

    /** 只消费本施法者留在目标身上的那一个 carrier；确认实际移除才算消费成功。 */
    function appleacidConsumeCarrier(world: CombatWorld, actor: CombatActor, anchor: MobEffects.Anchor): boolean {
        return MobEffects.matches(world, actor, anchor) && world.removeMobEffect(actor, anchor.id, anchor.key);
    }

    /** 由实际发招的命中按最新 carrier 快照建立本施法者的发酵画面；旧 revision 作废，不留失效锚。 */
    function appleacidBindWindow(world: CombatWorld, actor: CombatActor, owner: string): void {
        const carrier = MobEffects.read(world, actor, appleacidSour);
        if (carrier === null) return;
        world.effects(actor, appleacidFermentWindow).forEach(function (view) {
            if (String(view.source().ref()) === owner) world.operation(view.id(), "world_combat:dispel", "{}");
        });
        const ticks = carrier.duration() < 0 ? appleacidWindowTicks : Math.max(1, Math.min(appleacidWindowTicks, carrier.duration()));
        world.effect(appleacidFermentWindow, actor, JSON.stringify({ id: carrier.id(), key: carrier.key() }), ticks);
    }

    // 发酵画面归属：一个真正拥有的托管效果，观察目标身上的本招载体。
    // 由命中时的施法者世界建立、保留精确 carrier id/key；被消费/到期/被清时 watch 自行结束，不留失效锚。
    WorldCombat.effect(appleacidFermentWindow, 1, appleacidWindowTicks, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.id !== "string" || typeof value.key !== "string") throw new Error("Invalid appleacid ferment anchor");
        return JSON.stringify({ id: value.id, key: value.key });
    }, EffectProtocols.unchanged);
    function appleacidFermentPresent(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target(), anchor = JSON.parse(effect.state());
        const body = world.observe(target);
        if (body === null || !MobEffects.matches(world, target, anchor)) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_appleacid/ferment", appleacidScene, 1, body.position(),
            { moment: "ferment", target: String(target.ref()) });
        effect.schedule("watch", "watch", 2, "{}");
    }
    WorldCombat.effectHandler(appleacidFermentWindow, "start", appleacidFermentPresent);
    WorldCombat.effectHandler(appleacidFermentWindow, "watch", appleacidFermentPresent);
    WorldCombat.effectHandler(appleacidFermentWindow, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "appleacid",
        name: "Apple Acid",
        description: "扔出一颗酸苹果砸向单体目标：命中造成特殊伤害并令其特防 −1，同时在目标身上留下一层发酵。发酵没退之前再命中同一目标，第二口更狠（−2）并把这层发酵消费掉，之后重新从 −1 起算。它不溅射、不留酸场，只结算直接命中的那一个目标；落空只在落点溅一下，不掉苹果。发酵式让苹果飞得更慢、砸击更轻，但发酵窗口 ×1.6，更容易接上第二口；爆汁式一发更痛、飞得更快、射得更远，但酸留不久。",
        uses: [
            "对同一个目标连扔两颗：第一颗特防 −1 并留下发酵，窗口内补第二颗改为 −2 并耗掉发酵",
            "切换发酵式把窗口拉长，更容易对同一目标接上第二口",
            "自由抛掷：对任意关系实体或落点都能扔出苹果"
        ],
        kind: "aim",
        range: 10,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 48,
        style: "grass",
        defaults: { ferment: false, ai: { maxChase: 13, stackSour: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("appleacid", "reach", pokemon), geometry: "line", style: "grass",
                color: 0x9EC44A, label: config && config.ferment === true ? "发酵苹果酸" : "爆汁苹果酸" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["appleacid"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const ferment = !!(config && config.ferment);
            return {
                prepare: Math.round(p("appleacid", "tempo", context)),
                recover: 8,
                cooldown: 48 + (ferment ? 10 : 0),
                active: 0,
                range: p("appleacid", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:appleacid:" + action.id(), appleacidScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", ferment: config && config.ferment ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const origin = body === null ? action.origin() : body.position();
            const power = p("appleacid", "core", action);
            const speed = p("appleacid", "globSpeed", action);
            const gravity = p("appleacid", "globGravity", action);
            const radius = p("appleacid", "globRadius", action);
            const sourStages = Math.max(1, Math.round(p("appleacid", "sourStages", action)));
            const secondStages = Math.max(1, Math.round(p("appleacid", "secondStages", action)));
            const sourTicks = Math.max(30, Math.round(p("appleacid", "sourTicks", action)));
            const cores = Math.max(10, Math.round(p("appleacid", "cores", action)));
            const scale = Math.max(0.6, Math.min(2.4, radius / 0.22));
            const intensity = Math.max(0.5, Math.min(2.2, power / 62));
            const scenes = WorldFeedback.actionScenes(appleacidScene);
            // 自由抛点：有选中点就抛向它，否则沿提交朝向抛出；零长度/竖直瞄准由 basis 给出稳定方向。
            const aimPoint = action.targetPosition();
            const delta = aimPoint.minus(origin);
            const frame = WorldGeometry.basis(action.direction(), delta, WorldCombat.point(0, 1, 0));
            const point = delta.length() < 0.05 ? origin.plus(frame.forward.scale(action.range())) : aimPoint;
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 一次成功命中：按是否已带发酵决定掉 1 级还是 2 级；发酵中的这一口把窗口消费掉，否则施加。 */
            function bite(current: CombatAction, hit: CombatImpact, victim: CombatActor): void {
                const scope = current.world();
                if (!impact(current, hit, "appleacid", power, { damage: damageSpec("appleacid", "core") })) return;
                const owner = String(current.actor().ref());
                // 只把本施法者上一颗留下的发酵当作第二口：先确认能真正消费那一个 carrier，才采用 -2；
                // 别人的同身份 sour 不进入本招循环，本次仍是第一口。
                const own = appleacidOwnCarrier(scope, victim, owner);
                const consumed = own !== null && appleacidConsumeCarrier(scope, victim, own);
                const stages = consumed ? secondStages : sourStages;
                const applied = NativeEffects.boost(scope, victim, "spd", -stages);
                const fermented = consumed ? false : appleacidFerment(scope, victim, sourTicks);
                if (fermented) appleacidBindWindow(scope, victim, owner);
                const held = scope.observe(victim);
                const at = held === null ? hit.position() : held.position();
                WorldFeedback.emit(scope, appleacidScene, 1, at,
                    { moment: consumed ? "stack" : "hit", target: String(victim.ref()), cores: cores, scale: scale,
                        intensity: consumed ? Math.min(2.4, intensity * 1.2) : intensity }, 24);
                // 按真实生效的降阶量显示：从 -5 再降 2 实际只掉 1 级时，浮字也是 1。
                if (applied !== 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)),
                        consumed ? appleacidStackText : appleacidSourText, [Math.abs(applied)], 28);
                else if (fermented || consumed)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), appleacidFermentText, [], 28);
            }

            /** 主碰撞：命中非友方就咬一口；落空/落地只在落点溅一下，不掉苹果、不留场。 */
            function land(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) bite(current, hit, victim);
                else {
                    const at = hit.position();
                    WorldFeedback.emit(scope, appleacidScene, 1, at, { moment: "miss", cores: cores, scale: scale, intensity: 0.8 }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), appleacidMissText, [], 24);
                }
                finish(current);
            }

            sound(action, "minecraft:entity.wind_charge.throw");
            const launch = LivingActions.ballistic(origin, point, speed, gravity);
            const direction = launch === null ? (delta.length() < 0.05 ? frame.forward : delta.unit()) : launch;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 200,
                direction: direction,
                appearance: { item: "minecraft:apple", glow: false, scale: Math.max(1.0, radius / 0.22) },
                impact: function (current: CombatAction, hit: CombatImpact) { land(current, hit); }
            }, function (current: CombatAction) { finish(current); });
            scenes.show(action, "cast", origin, { moment: "cast", projectile: flight, cores: cores, scale: scale, intensity: intensity });
        }
    });
}
