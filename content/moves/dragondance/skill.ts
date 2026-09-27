/**
 * 龙之舞 / dragondance —— 执行组织。
 *
 * 物攻与速度由同一次 boostWindow 拥有、挂在 dragondance_airy 载体上；载体到期、被驱散或重施替换时只撤去这一舞。
 * 盘旋是真实过程：按真实刻进度每刻移动一小步，总转角精确等于 `turns` 圈（不再用一个圆的采样点冒充圈数）；
 * 每刻读位移回执，撞墙或顶棚即缩短，不做整点跳。收势只报真实净高度与实际接触位置，不宣称落地。 */
namespace PokemonSkills {
    const dragondanceScene = "world_combat:move_dragondance";
    const dragondanceAiry = "world_combat:dragondance_airy";
    const dragondanceText = "world_combat.move.dragondance.text.soared";
    const dragondanceFadeText = "world_combat.move.dragondance.text.faded";
    /** 表现里的参考半径：`data.scale = 实际螺旋半径 / 这个数`。 */
    const dragondanceGyre = 0.7;


    define({
        freeMovement: true,
        id: "dragondance",
        cooldownParameter: "wait",
        name: "龙之舞",
        description: "跳起一段螺旋上升的龙之舞：原地拧身、一圈比一圈高，龙气盘成上升的螺旋，提高自己的攻击和速度。龙势只维持一段可见的窗口，窗口走完时抬起的攻速会被收回。",
        uses: ["开战前把攻速一起垫起来", "被追急了先盘旋一圈，用速度脱身", "在对手接近的空档里跃起蓄势"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 108,
        style: "dragon",
        stationary: true,
        defaults: { soar: true, ai: { maxChase: 16, minGap: 3 } },
        fields: [flag("soar", "高飞")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.2, p("dragondance", "gyre", pokemon) + 0.8), geometry: "area", style: "dragon", color: 0x8A6CFF,
                label: config && config.soar ? "龙之舞 · 高飞" : "龙之舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragondance"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragondance", "tempo", context)),
                recover: Math.round(p("dragondance", "aftercast", context)),
                cooldown: Math.round(p("dragondance", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dragondance:coil", dragondanceScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", soar: config && config.soar ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("dragondance", "gift", action))));
            const turns = Math.max(2, Math.min(4, Math.round(p("dragondance", "turns", action))));
            const gyre = Math.max(0.3, p("dragondance", "gyre", action));
            const lift = Math.max(0, p("dragondance", "lift", action));
            const beat = Math.max(4, Math.round(p("dragondance", "beat", action)));
            const span = Math.max(80, Math.round(p("dragondance", "span", action)));
            const drakes = Math.max(10, Math.round(p("dragondance", "drakes", action)));
            const soar = config ? config.soar !== false : true;
            const scale = gyre / dragondanceGyre;
            const home = body.position();
            const before = NativeEffects.effectiveStages(world, actor);
            const previous = MobEffects.read(world, actor, dragondanceAiry);
            const carrier = MobEffects.apply(world, actor, dragondanceAiry, span, 0);
            if (carrier === null) { done(action); return; }
            const owned = NativeEffects.boostWindow(world, actor, { atk: gift, spe: gift }, span,
                "world_combat:move/dragondance", carrier, previous);
            if (!owned) { world.removeMobEffect(actor, carrier.id(), carrier.key()); done(action); return; }
            const raised = NativeEffects.effectiveStages(world, actor);
            const attackGain = Math.max(0, (raised.atk || 0) - (before.atk || 0));
            const speedGain = Math.max(0, (raised.spe || 0) - (before.spe || 0));
            // 龙势光环绑在这次真正的攻速窗口上，随窗口自然到期或提前清除一起收。
            WorldFeedback.onEffect(world, owned, "world_combat:move_dragondance/airy", dragondanceScene, 1, body.position(),
                { moment: "airy", gyre: gyre, scale: scale, turns: turns, drakes: drakes,
                    intensity: Math.max(0.7, Math.min(2.2, (gift * 2 + turns) / 4)) });
            const scenes = WorldFeedback.actionScenes(dragondanceScene);
            const totalTicks = Math.max(1, Math.round(turns * beat));
            const totalLift = soar ? Math.max(0, lift * turns) : 0;
            let step = 0, settled = false, ceiling = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            // 收势：不宣称落地，只报这次舞真实走过的净高度与实际接触位置；真正踩在地面时才带落地回执与地环。
            function settle(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const at = here.position(), landed = here.grounded();
                WorldFeedback.emit(scope, dragondanceScene, 1, at,
                    { moment: "settle", gyre: gyre, scale: scale, turns: turns, drakes: drakes, gift: gift,
                        lift: at.y() - home.y(), flat: ceiling ? 1 : 0, landed: landed ? 1 : 0, ring: landed ? 10 : 0,
                        intensity: Math.max(0.7, Math.min(2.2, (gift * 2 + turns) / 4)) }, 30);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), dragondanceText, [attackGain, speedGain], 30);
                scope.sound("cobblemon:impact.dragon", at, 18, "{}");
                finish(current);
            }
            // 连续小螺旋：每刻按真实刻进度走到圆周的下一点并沿螺旋上升，总转角精确表示 turns 圈；
            // 位移读真实回执，撞墙/顶棚即缩短，不做整点跳。
            function spiral(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                step++;
                const progress = Math.min(1, step / totalTicks);
                const angle = progress * Math.PI * 2 * turns;
                const at = here.position();
                const targetX = home.x() + Math.sin(angle) * gyre;
                const targetZ = home.z() + Math.cos(angle) * gyre;
                scope.displace(actor, WorldCombat.point(targetX - at.x(), 0, targetZ - at.z()));
                let lifted = 0;
                if (totalLift > 0 && !ceiling) {
                    const want = home.y() + totalLift * progress - at.y();
                    const up = scope.displace(actor, WorldCombat.point(0, want, 0));
                    lifted = up;
                    // 期望抬升在真实回执里被明显压低，说明上方受阻：之后的圈变扁，不再穿顶。
                    if (want > 0.01 && up < want * 0.5) ceiling = true;
                }
                const now = scope.observe(actor), spot = now === null ? at : now.position();
                const riseMotes = Math.max(2, Math.round(drakes / Math.max(1, totalTicks)));
                scenes.show(current, "rise-" + step, spot,
                    { moment: "rise", gyre: gyre, scale: scale, turns: turns, step: step, drakes: drakes, riseMotes: riseMotes,
                        soar: soar ? 1 : 0, lift: lifted, flat: ceiling ? 1 : 0, height: spot.y() - home.y(),
                        intensity: Math.max(0.6, Math.min(2.2, drakes / 28)) });
                if (step === 1) scope.sound("minecraft:entity.ender_dragon.flap", spot, 14, "{}");
                else if (step % beat === 0) scope.sound("minecraft:entity.ender_dragon.growl", spot, 14, "{}");
                if (step >= totalTicks) { current.after(beat, settle); return; }
                current.after(1, spiral);
            }
            spiral(action);
        }
    });

    // 龙势窗口的贡献由共享层结束；这里负责到期反馈。
    WorldCombat.on("world_combat:move_dragondance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dragondanceAiry) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, dragondanceAiry) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, dragondanceScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), dragondanceFadeText, [], 26);
    });
}
