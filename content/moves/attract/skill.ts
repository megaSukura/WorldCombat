/**
 * 迷人 / Attract — 执行组织。
 *
 * 核心念头：把一颗会跳动的心当飞吻掷向敌人——命中才着迷，落空或撞墙就散掉；着迷时对手每次想出手都可能
 *           心软收手、被你拽近一步，而且离不开你：离得太远会被持续拽回，直到它用掩体挡住视线或撑过这段时间。
 *
 * 出手：向单个敌人掷出缓慢追踪的飞吻（原生投射物）。宝可梦对象要求异性；原版生物、其他模组生物与玩家没有
 *       性别概念，直接有效。飞行过程给了对手反应时间：掩体能挡下。
 * 命中：施加 `world_combat:attract_infatuation`（共享身份 attract），并挂一条记录施放者与力度参数的 tether；
 *       着迷期间目标离施放者超过 leash 就会被持续拽回，牵引要求两者之间视线畅通。
 * 反制：只对单个目标、有射程限制；飞吻会被掩体挡下；牵引要求视线畅通，躲到墙后就能挣脱；着迷只是让出手
 *       变得不可靠，目标仍可能照常打中你；可被牛奶或 `/effect` 清除；宝可梦同性免疫。
 * 配置项 allure（妩媚风情）：着迷更久、牵得更远，但心软几率更低、冷却更长。
 */
namespace PokemonSkills {
    function attractOpposite(first: string, second: string): boolean {
        const a = String(first).toLowerCase(), b = String(second).toLowerCase();
        return a === "male" && b === "female" || a === "female" && b === "male" || a === "m" && b === "f" || a === "f" && b === "m";
    }

    function attractCharm(action: CombatAction, target: CombatActor): void {
        const world = action.world(), body = world.observe(target);
        if (body === null) return;
        const self = action.actor();
        if (String(self.domain()) === "cobblemon" && String(target.domain()) === "cobblemon"
            && !attractOpposite(String(CobblemonCombat.pokemon(self).gender()), String(CobblemonCombat.pokemon(target).gender()))) {
            WorldFeedback.emit(world, attractScene, 1, body.position(), { moment: "fizzle" }, 18);
            return;
        }
        const facts = withTarget(factContext(action), target);
        const duration = p("attract", "duration", facts);
        // One visible infatuation has one current tether; a new kiss replaces its earlier source.
        world.effects(target, attractTether).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
        MobEffects.apply(world, target, attractStatus, duration, 0);
        world.effect(attractTether, target, JSON.stringify({
            chance: p("attract", "chance", facts), pull: p("attract", "pull", facts), leash: p("attract", "leash", facts)
        }), duration);
        WorldFeedback.emit(world, attractScene, 1, body.position(),
            { moment: "charm", target: String(target.ref()), charmBurst: Math.round(duration / 8), intensity: Math.round(Math.min(2, 1 + p("attract", "chance", action))) }, 34);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), attractCharmText, [], 28);
    }

    define({
        id: "attract", name: "迷人", description: "把一个飞吻掷向单个敌人；命中后它着迷一阵子：每次试图出手都可能心软收手，还会被拴在你身边——离得太远会被持续拽回。宝可梦需要异性才吃这一套。",
        uses: ["分散注意", "拖住敌人", "制造走位机会"], kind: "enemy", range: 12, prepare: 8, active: 0, recover: 8, cooldown: 80, style: "charm",
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
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) return "invalid-target";
            if (String(self.domain()) === "cobblemon" && String(target.domain()) === "cobblemon"
                && !attractOpposite(String(CobblemonCombat.pokemon(self).gender()), String(CobblemonCombat.pokemon(target).gender())))
                return "invalid-target";
            const body = world.observe(target);
            if (body === null || !world.clear(action.origin(), body.position())) return "target-not-visible";
            return "";
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target(), origin = world.observe(self);
            if (target === null || origin === null) { done(action); return; }
            const alluring = !!(config && config.allure);
            WorldFeedback.emit(world, attractScene, 1, origin.position(), { moment: "launch", target: String(self.ref()), intensity: alluring ? 2 : 1 }, 20);
            sound(action, "minecraft:entity.cat.purr");
            LivingActions.projectile(action, {
                speed: p("attract", "speed", action), range: action.range(), radius: p("attract", "kissRadius", action),
                appearance: {
                    sprite: "cobblemon:particle/generic/status/infatuation_heart", scale: alluring ? 1.1 : 0.85, glow: true,
                    homing: { target: String(target.ref()), turn: 10, delay: 2, range: action.range() }
                },
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
    WorldCombat.preview("world_combat:attract", JSON.stringify({ lineOfSight: true }));
}
