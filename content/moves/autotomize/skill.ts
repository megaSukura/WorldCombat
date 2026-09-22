/**
 * 身体轻量化 / autotomize — 执行组织。
 *
 * 核心念头：把身上没用的部件一块块撬下来甩到地上。身体一下子轻了，快得离谱，脚下也再压不住——
 *   轻身窗口里重力变小，整个人飘得像一片壳。部件不会长回来，速度却留在身上。
 *
 * 两幕：
 *   卸（windup 播「撬件」，提交前只观察与预告，打断不花代价）。
 *   轻（提交后）：NativeEffects.boost(spe, gift) 写入公共能力阶梯，按 parts 把真实残件（按施法者属性取材）
 *     甩进世界（dropItem，走原生掉落规则），挂共享身份 world_combat:status/lightened 的「轻身」窗口，
 *     并由 world_combat:autotomize_mark 在窗口内把重力按 buoyancy 下调（磁悬浮标记的同一套写法，随效果结束收回）。
 * 反制：窗口只是「轻」的读法，速度等级不随窗口收回（部件已经没了）；想再快只能等冷却、再卸一轮。
 *
 * 体重跨招读取的缺口：`F.body("weight")` 直接读原生体重，没有可供本招挂修饰的层；
 *   因此「体重变轻」目前只在本招自己的玩法（残件、重力、身份）里兑现，别的按体重结算的招式读到的仍是原体重。
 *   需要共享层时作为前置记录，见本组报告。
 */
namespace PokemonSkills {
    const autotomizeScene = "world_combat:move_autotomize";
    const autotomizeLight = "world_combat:lightened";
    const autotomizeMark = "world_combat:autotomize_mark";
    const autotomizeText = "world_combat.move.autotomize.text.shed";
    const autotomizeLightText = "world_combat.move.autotomize.text.light";
    /** 残件取材：按施法者的第一属性挑一种同质的原生物品，认不出来就用打火石。 */
    const autotomizeMaterial: { [type: string]: string } = {
        steel: "minecraft:iron_nugget",
        rock: "minecraft:cobblestone",
        ground: "minecraft:flint",
        bug: "minecraft:string",
        grass: "minecraft:stick",
        ice: "minecraft:snowball",
        dark: "minecraft:charcoal",
        dragon: "minecraft:scute",
        normal: "minecraft:flint"
    };

    function autotomizePartOf(world: CombatWorld, pokemon: CombatPokemon): string {
        for (let index = 0; index < pokemon.typeCount(); index++) {
            const id = autotomizeMaterial[String(pokemon.type(index))];
            if (id && world.item(id) !== null) return id;
        }
        return "minecraft:flint";
    }

    // 轻身的兑现点：窗口内把重力按 buoyancy 下调，身体浮起来；效果结束时宿主随 effect 收回该属性修饰。
    WorldCombat.effect(autotomizeMark, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.gravity !== "number" || !isFinite(value.gravity) || value.gravity < 0 || value.gravity > 1)
            throw new Error("Invalid autotomize mark: gravity");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(autotomizeMark, "start", function (effect) {
        const state = JSON.parse(effect.state());
        const gravity = Number(state.gravity) || 0;
        if (gravity > 0) effect.world().attribute(effect.target(), "minecraft:generic.gravity", -gravity, "add_multiplied_total");
    });
    WorldCombat.effectHandler(autotomizeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "autotomize",
        name: "身体轻量化",
        description: "削掉身体上没用的部分，大幅提高自己的速度，同时体重也会变轻。",
        uses: ["开战前卸一轮，把速度拉起来", "用卸下的残件在场上留下痕迹", "轻身窗口里浮起来，借身法绕过地形"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 80,
        style: "shed",
        defaults: { ai: { maxChase: 14, minGap: 3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: 0.9, geometry: "circle", style: "shed", color: 0xC9D6E4, label: "身体轻量化" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["autotomize"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("autotomize", "tempo", context)),
                recover: Math.round(p("autotomize", "aftercast", context)),
                cooldown: Math.round(p("autotomize", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_autotomize:wrench", autotomizeScene, 1, action.origin(),
                JSON.stringify({ moment: "wrench" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(2, Math.min(3, Math.round(p("autotomize", "gift", action))));
            const parts = Math.max(1, Math.min(6, Math.round(p("autotomize", "parts", action))));
            const fling = Math.max(0.1, p("autotomize", "fling", action));
            const window = Math.max(80, Math.round(p("autotomize", "lightTicks", action)));
            const buoyancy = Math.max(0.05, Math.min(0.6, p("autotomize", "buoyancy", action)));
            NativeEffects.boost(world, actor, "spe", gift);
            MobEffects.apply(world, actor, autotomizeLight, window, 0);
            world.effect(autotomizeMark, actor, JSON.stringify({ gravity: buoyancy }), window);
            const item = autotomizePartOf(world, CobblemonCombat.pokemon(actor));
            const centre = body.position();
            for (let index = 0; index < parts; index++) {
                const angle = world.random() * Math.PI * 2, speed = fling * (0.6 + world.random() * 0.6);
                const drop = WorldCombat.point(Math.cos(angle) * 0.5, 0.45 + world.random() * 0.35, Math.sin(angle) * 0.5);
                try {
                    world.dropItem(centre.plus(drop), item, 1,
                        JSON.stringify({ pickupDelay: 12, velocity: [Math.cos(angle) * speed, 0.25, Math.sin(angle) * speed] }));
                } catch (error) { /* 掉落被拒绝时只保留粒子与机制，不影响施放 */ }
            }
            WorldFeedback.emit(world, autotomizeScene, 1, centre,
                { moment: "shed", actor: String(actor.ref()), gift: gift, parts: parts, buoyancy: buoyancy, window: window,
                    scale: Math.max(0.7, Math.min(2, 0.9 + parts * 0.12)),
                    intensity: Math.max(0.8, Math.min(2, gift / 2 + parts * 0.08)) }, 30);
            WorldFeedback.keep(world, "autotomize:light:" + String(actor.ref()), autotomizeScene, 1, centre,
                { moment: "light", actor: String(actor.ref()), buoyancy: buoyancy, parts: parts }, Math.min(window, 240));
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), autotomizeText, [gift, parts], 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.7, 0)), autotomizeLightText, [Math.round(buoyancy * 100)], 40);
            world.sound("minecraft:entity.armor_stand.break", centre, 16, "{}");
            done(action);
        }
    });
}
