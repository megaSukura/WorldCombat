/**
 * 装饰 / decorate 的执行组织。
 *
 * 核心念头：这件作品不是给自己戴的，是送给队友的。当场搓出一束奶油与缎带，让它们**真的飞过去**，
 * 落到另一个友方身上，把他装扮成队伍里最锋利的那件作品——物攻与特攻一起大幅抬起来，装饰物在他身上亮一阵子。
 *
 * 两幕：
 *   起（windup 播「搓装饰」，提交前只观察与预告，可被打断，打断不花代价）。
 *   送（提交后）：一束装饰作为真实投射物从施法者飞向目标（表现绑同一个 projectile）；它有遮挡——
 *     被墙、被别的身体挡下，或队友中途离场，就在实际接触/落点散掉；只有**真正命中原目标**才结账，
 *     其他身体挡下不越过遮挡。
 *   挂（命中原目标）：先挂上共享身份 world_combat:status/decorated 的「已装扮」载体，再让这份载体拥有
 *     物攻与特攻各 `gift` 级的临时窗口（NativeEffects.boostWindow 绑 carrier）。佩戴的短缎带、闪光与
 *     增益因此同生共死：载体到期、被驱散或被重新覆盖时一起收，厚涂才真正亮得更久。
 *
 * 只送给别人：`ready` 拒绝以自己为目标——这件作品要有一个佩戴者。
 * 与同族分开：其余三招都只碰自己或只做减法；装饰把力量**送到另一个战斗者身上**，且送达本身就是可被打断的一段路。
 */
namespace PokemonSkills {
    const decorateScene = "world_combat:move_decorate";
    const decorateMark = "world_combat:decorated";
    const decorateText = "world_combat.move.decorate.text.adorned";
    const decorateBlockedText = "world_combat.move.decorate.text.blocked";
    /** 投射物外观里 item 的绘制比例参考体型；机制值仍是 gift／trinkets／flight。 */
    const decorateReferenceBody = 2.3;

    define({
        id: "decorate",
        cooldownParameter: "wait",
        name: "Decorate",
        description: "搓出一束奶油与缎带，飞送给另一个友方；只有真正命中原目标时，对方的攻击与特攻才大幅提高，装饰物在身上亮一阵子。提升与装饰同寿，装饰到期或被驱散时一并收回。中途被墙或别的身体挡下、或对方离场，就在实际接触点散掉。这件作品要有一个佩戴者。",
        uses: ["开战前把身边的队友打扮成主力", "在队友冲上去之前先给他加满双攻", "把自己以外的伙伴变成一把更利的刀"],
        kind: "friend",
        range: 5,
        maxRange: 7,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 70,
        style: "ribbon",
        defaults: { thick: false },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["decorate"], detail: { values: config } };
            return { radius: p("decorate", "reach", context), geometry: "point", style: "ribbon", color: 0xFF9FC4, label: "装饰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["decorate"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("decorate", "tempo", context)),
                recover: Math.round(p("decorate", "aftercast", context)),
                cooldown: Math.round(p("decorate", "wait", context)),
                active: 1,
                range: p("decorate", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || !world.friendly(target)) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "no-self";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_decorate:gather", decorateScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", thick: config && config.thick ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || !world.friendly(target)
                || String(target.ref()) === String(actor.ref())) { done(action); return; }
            const body = world.observe(actor), mate = world.observe(target);
            if (body === null || mate === null) { done(action); return; }
            const mark: CombatActor = target;

            const gift = Math.max(2, Math.min(3, Math.round(p("decorate", "gift", action))));
            const veneer = Math.max(60, Math.round(p("decorate", "veneer", action)));
            const trinkets = Math.max(6, Math.round(p("decorate", "trinkets", action)));
            const speed = Math.max(0.25, Math.min(1.5, p("decorate", "flight", action)));
            const scale = Math.max(0.6, Math.min(1.8, (body.width() + body.height()) / decorateReferenceBody));
            const ref = String(target.ref());
            const origin = body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const dest = mate.position().plus(WorldCombat.point(0, mate.height() * 0.5, 0));
            const delta = dest.minus(origin);
            const distance = Math.max(0.5, delta.length());
            const travel = Math.max(4, Math.min(60, Math.round(distance / speed)));
            const velocity = delta.unit().scale(distance / travel);
            let resolved = false;

            /** 只有真正落到原目标身上才结账：双攻窗口与「已装扮」标记由同一份 carrier 拥有、同寿回收。 */
            function adorn(scope: CombatWorld, point: CombatPoint): boolean {
                const before = NativeEffects.effectiveStages(scope, mark);
                const previous = MobEffects.read(scope, mark, decorateMark);
                const carrier = MobEffects.apply(scope, mark, decorateMark, veneer, 0);
                if (carrier === null) return false;
                const owned = NativeEffects.boostWindow(scope, mark, { atk: gift, spa: gift }, carrier.duration(),
                    "world_combat:move/decorate", carrier, previous);
                const raised = NativeEffects.effectiveStages(scope, mark);
                const atkGain = Math.max(0, (raised.atk || 0) - (before.atk || 0));
                const spaGain = Math.max(0, (raised.spa || 0) - (before.spa || 0));
                // 顶到上限、没有真实提升时不留下空装饰、也不播「已装扮」。
                if (!owned || (atkGain <= 0 && spaGain <= 0)) {
                    if (owned) NativeEffects.windowClose(scope, owned);
                    MobEffects.consume(scope, mark, decorateMark);
                    return false;
                }
                const bearer = scope.observe(mark);
                if (bearer === null) return false;
                WorldFeedback.emit(scope, decorateScene, 1, point,
                    { moment: "adorn", target: ref, trinkets: trinkets, gift: gift, scale: scale }, 30);
                // 佩戴的短缎带与闪光都绑在真正的双攻窗口上：窗口到期、被驱散或重施替换时一起收，不留残影。
                WorldFeedback.onEffect(scope, owned, "decorate:glint:" + ref, decorateScene, 1, bearer.position(),
                    { moment: "glint", target: ref, trinkets: trinkets });
                WorldFeedback.text(scope, bearer.position().plus(WorldCombat.point(0, 1.4, 0)), decorateText, [atkGain, spaGain], 34);
                scope.sound("minecraft:block.amethyst_block.chime", bearer.position(), 16, "{}");
                return true;
            }
            function spill(scope: CombatWorld, point: CombatPoint, blocked: boolean): void {
                WorldFeedback.emit(scope, decorateScene, 1, point,
                    { moment: "scatter", trinkets: trinkets, scale: scale, blocked: blocked ? 1 : 0 }, 24);
                if (blocked)
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), decorateBlockedText, [], 26);
            }

            sound(action, "minecraft:entity.experience_bottle.throw");
            const flight = action.projectile(origin, velocity, 0, 0.22, distance + 3, travel + 10,
                function (current: CombatAction, impact: CombatImpact) {
                    if (resolved) return;
                    const scope = current.world();
                    const victim = impact.hitEntity() ? impact.target() : null;
                    // 只有真正命中原目标才结账；别的身体或墙面都按实际接触点散落，不越过遮挡隔空给原目标发收益。
                    if (victim !== null && scope.valid(victim) && String(victim.ref()) === ref) {
                        resolved = true;
                        if (!adorn(scope, impact.position())) spill(scope, impact.position(), false);
                        return;
                    }
                    if (impact.blocked() || victim !== null) {
                        resolved = true;
                        spill(scope, impact.position(), true);
                    }
                },
                function (current: CombatAction) {
                    if (!resolved) {
                        resolved = true;
                        spill(current.world(), current.targetPosition(), false);
                    }
                    done(current);
                },
                JSON.stringify({ item: "minecraft:pink_dye", scale: Math.max(0.8, Math.min(1.6, scale)), glow: true, spin: true, hitAllies: true,
                    homing: { target: ref, turn: 20, delay: 1, range: distance + 3 } }));
            WorldFeedback.emit(world, decorateScene, 1, origin,
                { moment: "flight", projectile: flight, trinkets: trinkets, gift: gift, scale: scale }, travel + 12);
        }
    });
}
