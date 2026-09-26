/**
 * 身体轻量化 / autotomize — 执行组织。
 *
 * 核心念头：把身上没用的虚构外壳一块块撬下来甩出去。身体一下子轻了，快得离谱，脚下也再压不住——
 *   轻身窗口里重力变小，跳得更高、落得更慢。外壳只是这段过程里被卸下的东西，散落片刻就没了；
 *   速度却留在身上。它不是原版物品，也不产生可拾取资源。
 *
 * 两幕：
 *   卸（windup 播「撬件」，提交前只观察与预告，打断不花代价）。
 *   轻（提交后）：NativeEffects.boost(spe, gift) 写入公共能力阶梯，按 parts 甩出短寿命、
 *     不可拾取的 WorldBodies 外壳（按施法者属性取材的原生外观，受真实重力抛落、随后自行散掉），
 *     并挂共享身份 world_combat:status/lightened 的「轻身」窗口。窗口内由 world_combat:autotomize_mark
 *     把重力按 buoyancy 下调；mark 锚定这次 MobEffect 的实际应用（carrier），窗口被牛奶、/effect clear
 *     或自然到期结束时就地收回重力，重施先替换旧窗口与旧 mark，不叠多份。
 * 反制：窗口只是「轻」的读法，速度等级不随窗口收回（外壳已经没了）；想再快只能等冷却、再卸一轮。
 *   重力下调只改变跳跃与下落，不会让静止的身体悬浮起来。
 *
 * 体重跨招读取的缺口：`F.body("weight")` 直接读原生体重，没有可供本招挂修饰的层；
 *   因此「体重变轻」目前只在本招自己的玩法（外壳、重力、身份）里兑现，别的按体重结算的招式读到的仍是原体重。
 *   需要共享层时作为前置记录，见本组报告。
 */
namespace PokemonSkills {
    const autotomizeScene = "world_combat:move_autotomize";
    const autotomizeLight = "world_combat:lightened";
    const autotomizeMark = "world_combat:autotomize_mark";
    const autotomizeShell = "world_combat:move/autotomize/shell";
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

    /**
     * 卸下的外壳：短寿命的自持实体，只有外观和重力，不是掉落物也不可拾取。
     * 抛出去后真实下落，寿命走到头即散，附带一小撮尘；记录最后位置只为让散去的那一下跟在残件身上。
     */
    WorldBodies.define(autotomizeShell, {
        schema: 1,
        maxTicks: 80,
        start: function (brain) {
            const world = brain.world(), body = world.observe(brain.target());
            if (body === null) { brain.end(); return; }
            const state = JSON.parse(brain.state());
            state.point = [body.position().x(), body.position().y(), body.position().z()];
            brain.state(JSON.stringify(state));
        },
        tick: { every: 3, handler: function (brain) {
            const world = brain.world(), body = world.observe(brain.target());
            if (body === null) { brain.end(); return; }
            const state = JSON.parse(brain.state());
            state.point = [body.position().x(), body.position().y(), body.position().z()];
            brain.state(JSON.stringify(state));
        } },
        end: function (brain) {
            const world = brain.world();
            let state: any = {};
            try { state = JSON.parse(brain.state()); } catch (error) { state = {}; }
            if (!state.point || state.point.length !== 3) return;
            const at = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
            WorldFeedback.emit(world, autotomizeScene, 1, at, { moment: "scatter", scale: state.scale, parts: state.parts }, 16);
            world.sound("minecraft:block.calcite.break", at, 5, "{}");
        }
    });

    // 轻身的兑现点：窗口内把重力按 buoyancy 下调，身体变轻；mark 只活在这次 carrier 还在的时候。
    WorldCombat.effect(autotomizeMark, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.gravity !== "number" || !isFinite(value.gravity) || value.gravity < 0 || value.gravity > 1)
            throw new Error("Invalid autotomize mark: gravity");
        if (!MobEffects.validAnchor(value.anchor)) throw new Error("Invalid autotomize mark: anchor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(autotomizeMark, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.anchor)) { effect.end(); return; }
        if (state.gravity > 0) world.attribute(actor, "minecraft:generic.gravity", -state.gravity, "add_multiplied_total");
    });
    WorldCombat.effectHandler(autotomizeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 轻身一被清除（牛奶、/effect clear、自然到期或替换），这次 mark 就地结束、重力立即归还。
    WorldCombat.on("world_combat:move_autotomize/light-fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== autotomizeLight) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // A fresh application still holding the identity owns the light now; its own mark replaces this one.
        if (MobEffects.read(world, actor, autotomizeLight) !== null) return;
        world.effects(actor, autotomizeMark).forEach(function (view) {
            world.operation(view.id(), "world_combat:dispel", "{}");
        });
    });

    define({
        id: "autotomize",
        cooldownParameter: "wait",
        name: "身体轻量化",
        description: "当场把身上没用的外壳一块块撬下来甩出去：身体一下子轻了，速度大幅提高。轻身窗口里重力变小、跳得更高、落得更慢——这是「变轻」在世界里的兑现，静止时仍站在地面。外壳散落片刻即消失，不是可拾取的物品；部件不会长回来。",
        uses: ["开战前卸一轮，把速度拉起来", "轻身窗口里跳得更高，借身法跨过小高差", "被追时先提速，再决定追或退"],
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
            // A recast replaces the old window and its mark instead of stacking a second gravity drop.
            world.effects(actor, autotomizeMark).forEach(function (view) {
                world.operation(view.id(), "world_combat:dispel", "{}");
            });
            const carrier = MobEffects.set(world, actor, autotomizeLight, window, 0);
            const centre = body.position(), width = body.width(), height = body.height();
            const shellScale = Math.max(0.35, Math.min(0.85, (width + height) / 4));
            if (carrier) {
                const mark = world.effect(autotomizeMark, actor,
                    JSON.stringify({ gravity: buoyancy, anchor: MobEffects.anchor(carrier) }), window);
                // 持续表现绑在 mark 上：窗口被清除或到期时一起收走，不会在驱散后继续播放。
                if (mark > 0) WorldFeedback.onEffect(world, mark, "autotomize:light", autotomizeScene, 1, centre,
                    { moment: "light", actor: String(actor.ref()), buoyancy: buoyancy, parts: parts });
            }
            const item = autotomizePartOf(world, CobblemonCombat.pokemon(actor));
            for (let index = 0; index < parts; index++) {
                const angle = world.random() * Math.PI * 2, speed = fling * (0.6 + world.random() * 0.6);
                const drop = WorldCombat.point(Math.cos(angle) * (width * 0.5 + 0.25),
                    height * 0.25 + world.random() * height * 0.35, Math.sin(angle) * (width * 0.5 + 0.25));
                try {
                    const shell = WorldBodies.spawn(world, centre.plus(drop), {
                        appearance: { item: item, scale: shellScale, spin: true },
                        size: [shellScale, shellScale], health: 1, speed: 0, gravity: true, pushable: false,
                        invulnerable: true, knockbackResistance: 1, silent: true
                    }, autotomizeShell, { scale: shellScale, parts: parts }, 45);
                    world.motion(shell, WorldCombat.point(Math.cos(angle) * speed, 0.2, Math.sin(angle) * speed), false);
                } catch (error) { /* 外壳被拒绝时只丢这一片，轻身机制照常 */ }
            }
            WorldFeedback.emit(world, autotomizeScene, 1, centre,
                { moment: "shed", actor: String(actor.ref()), gift: gift, parts: parts, buoyancy: buoyancy, window: window,
                    scale: Math.max(0.7, Math.min(2, 0.9 + parts * 0.12)),
                    intensity: Math.max(0.8, Math.min(2, gift / 2 + parts * 0.08)) }, 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), autotomizeText, [gift, parts], 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.7, 0)), autotomizeLightText, [Math.round(buoyancy * 100)], 40);
            world.sound("minecraft:entity.armor_stand.break", centre, 16, "{}");
            done(action);
        }
    });
}
