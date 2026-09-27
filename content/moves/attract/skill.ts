/**
 * 迷人 / Attract — 执行组织。
 *
 * 核心念头：把一颗会跳动的心当飞吻掷向敌人——命中才着迷，落空或撞墙就散掉；着迷时对手每次想出手都可能
 *           心软收手，只要你还在它视线里、它也没走远。它转过身来看你，就是这段关系的全部；离开视线或走远，
 *           关系自然解除，没有任何东西被硬拽着走。
 *
 * 出手：朝一个方向掷出缓慢追踪的飞吻（原生投射物）。点敌人就飞向它；点空处就沿方向直飞，耗尽后散开。
 *       任何能受心智干扰的活体都可以参与：宝可梦、原版生物、其他模组生物与玩家走同一条判定，原生抗控照常拦截。
 * 命中：先确认这次牵得住——目标在羁绊范围内、双方视线畅通——才施加 `world_combat:attract_infatuation`
 *       （共享身份 attract），并挂一条记录施放者、心软几率与羁绊范围的 tether；牵不住就当场散掉，不冒充维链成功。
 *       着迷只在双方视线畅通且目标没超出羁绊范围时维持，超距或断视线就解除。
 * 反制：只对单个目标、有射程限制；飞吻会被掩体挡下；躲到墙后或走远就挣脱；着迷只是让出手变得不可靠，
 *       目标仍可能照常打中你；可被牛奶或 `/effect` 清除；宝可梦同性免疫。
 * 配置项 allure（妩媚风情）：着迷更久、羁绊范围更大，但心软几率更低、冷却更长。
 */
namespace PokemonSkills {
    /** Unit vector from a body toward its charmer; the presentation reads it to make the heart look back. */
    function attractDirection(from: CombatPoint, to: CombatPoint): number[] {
        const delta = to.minus(from), length = delta.length();
        if (!(length > 1e-4)) return [0, 1, 0];
        return [delta.x() / length, delta.y() / length, delta.z() / length];
    }

    /** 命中但牵不住时统一的表现：飞吻散开＋一句「牵不住」，不冒充着迷成功。 */
    function attractFizzle(world: CombatWorld, body: CombatObservation): void {
        WorldFeedback.emit(world, attractScene, 1, body.position(), { moment: "fizzle" }, 18);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), attractFizzleText, [], 24);
    }

    function attractCharm(action: CombatAction, target: CombatActor): void {
        const world = action.world(), body = world.observe(target);
        if (body === null) return;
        const charmer = world.observe(action.actor());
        if (charmer === null) return;
        const facts = withTarget(factContext(action), target);
        const duration = p("attract", "duration", facts), leash = p("attract", "leash", facts);
        // 命中只是接到飞吻；只有实际能在羁绊范围内维持（距离够近、视线畅通）才建立着迷，
        // 命中反馈不冒充维链成功。任何可受心智干扰的活体都可参与，原生抗控由状态门照常拦截。
        if (charmer.position().minus(body.position()).length() > leash || !world.clear(body.position(), charmer.position())) {
            attractFizzle(world, body);
            return;
        }
        // One visible infatuation has one current tether; a new kiss replaces its earlier source.
        world.effects(target, attractTether).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
        if (!CombatStatus.apply(world, target, "attract", attractStatus, duration, 0)) { attractFizzle(world, body); return; }
        const carrier = MobEffects.read(world, target, attractStatus);
        const id = world.effect(attractTether, target, JSON.stringify({
            chance: p("attract", "chance", facts), leash: leash,
            carrier: carrier === null ? null : MobEffects.anchor(carrier)
        }), duration);
        // start 同步申请精确 carrier 的租约；拿不到就当作没着迷，不播成功。
        if (!world.effects(target, attractTether).some(view => view.id() === id)) { attractFizzle(world, body); return; }
        WorldFeedback.emit(world, attractScene, 1, body.position(),
            { moment: "charm", target: String(target.ref()), charmBurst: Math.round(duration / 8),
                direction: attractDirection(body.position(), charmer.position()),
                intensity: Math.round(Math.min(2, 1 + p("attract", "chance", action))) }, 34);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), attractCharmText, [], 28);
    }

    define({
        id: "attract", name: "迷人", description: "把一个飞吻掷向单个敌人；命中后它着迷一阵子：每次试图出手都可能心软收手。着迷只在你们互相看得见、且它没走远时维持——躲到墙后或走远就会清醒。能受心智干扰的活体都可参与，原生抗控照常拦截。",
        uses: ["分散注意", "拖住敌人", "制造走位机会"], kind: "aim", range: 12, prepare: 8, active: 0, recover: 8, cooldown: 80, style: "charm",
        defaults: { allure: false },
        fields: [flag("allure", "妩媚风情")],
        indicator: function (config, pokemon) {
            return { radius: p("attract", "kissRadius", pokemon), geometry: "line", style: "charm",
                label: config && config.allure ? "妩媚飞吻" : "甜言飞吻" };
        },
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["attract"], detail: { values: config }, world: world || null, actor: actor || null };
            const cooldown = p("attract", "cooldown", context) + (config && config.allure ? 14 : -14);
            return { prepare: p("attract", "prepare", context), recover: p("attract", "recover", context),
                cooldown: Math.max(10, cooldown), active: skills["attract"].active, range: skills["attract"].range };
        },
        windup: function (action) {
            action.present("attract:windup", attractScene, 1, action.origin(), JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return p("attract", "prepare", action);
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target(), origin = world.observe(self);
            if (origin === null) { done(action); return; }
            const alluring = !!(config && config.allure);
            WorldFeedback.emit(world, attractScene, 1, origin.position(), { moment: "launch", target: String(self.ref()), intensity: alluring ? 2 : 1 }, 20);
            sound(action, "minecraft:entity.cat.purr");
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/status/infatuation_heart", scale: alluring ? 1.1 : 0.85, glow: true
            };
            // A chosen body is followed; an empty aim point just flies straight along the throw.
            if (target !== null && world.valid(target)) appearance.homing = { target: String(target.ref()), turn: 10, delay: 2, range: action.range() };
            LivingActions.projectile(action, {
                speed: p("attract", "speed", action), range: action.range(), radius: p("attract", "kissRadius", action),
                appearance: appearance,
                impact: function (current, hit) {
                    const victim = hit.target(), hitWorld = current.world();
                    if (victim === null || hitWorld.friendly(victim)) {
                        WorldFeedback.emit(hitWorld, attractScene, 1, hit.position(), { moment: "fizzle" }, 18);
                        return;
                    }
                    attractCharm(current, victim);
                }
            }, done);
        }
    });
}
