/**
 * 闭关 / shelter — 执行组织。
 *
 * 核心念头：缩起身子，一层铁壳整个包住自己——壳先替你挨打，吃满额度就崩，裂开为止。
 *
 * 两幕：
 *   闭（windup 播「缩壳」，提交前只观察与预告，打断不花代价）。
 *   壳（提交后）：NativeEffects.boost(def, gift) 写入公共能力阶梯，挂上共享身份 world_combat:status/shelter 的
 *     壳窗口；同时给一层有独立承伤额度的 GuardEffects 池（吃满即崩）。铁盾形态的壳还把自己钉住（见 startup.ts）。
 * 结束：壳被打裂、被清除或到期时，GuardEffects 池结束、这段防护抬起的等级原样收回——对手有一次磨掉它的反制。
 */
namespace PokemonSkills {
    const shelterScene = "world_combat:move_shelter";
    const shelterShell = "world_combat:shelter_shell";
    const shelterSealed = "world_combat:shelter_sealed";
    const shelterRule = "world_combat:shelter";
    const shelterBraceText = "world_combat.move.shelter.text.brace";
    const shelterShatterText = "world_combat.move.shelter.text.shatter";
    /** 表现里的参考半径：`data.scale = 实际壳半径 / 这个数`。 */
    const shelterReferenceRadius = 1.2;

    // 壳的承伤池：吃满即崩，崩开时把壳窗口一起结束。
    GuardEffects.register(shelterRule, {
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const plates = Math.max(4, Math.round(Number((<any>state).plates) || 8));
            const scale = Math.max(0.5, Number((<any>state).scale) || 1);
            const initial = Math.max(1, Number((<any>state).initial) || state.capacity || 1);
            WorldFeedback.keep(world, "shelter:shell:" + String(effect.target().ref()), shelterScene, 1, body.position(),
                { moment: "hold", actor: String(effect.target().ref()), plates: plates, scale: scale,
                    intensity: Math.max(0.2, Math.min(1, state.capacity / initial)) }, 20);
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const initial = Math.max(1, Number((<any>state).initial) || state.capacity || 1);
            const plates = Math.max(4, Math.round(Number((<any>state).plates) || 8));
            const scale = Math.max(0.5, Number((<any>state).scale) || 1);
            WorldFeedback.emit(world, shelterScene, 1, body.position(),
                { moment: "crack", actor: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                    remaining: Math.max(0, Math.round(state.capacity * 10) / 10), plates: plates, scale: scale,
                    intensity: Math.max(0.25, Math.min(1, state.capacity / initial)) }, 24);
            world.sound("minecraft:block.anvil.hit", body.position(), 12, "{}");
            if (state.capacity <= 0) {
                const shell = MobEffects.read(world, target, shelterShell) || MobEffects.read(world, target, shelterSealed);
                if (shell !== null) world.removeMobEffect(target, shell.id(), shell.key());
            }
        }
    });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function shelterStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function shelterRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = shelterStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, shelterStage(world, actor, stat) - before);
    }

    define({
        freeMovement: function (config) { return config.seal !== false; },
        id: "shelter",
        cooldownParameter: "wait",
        name: "闭关",
        description: "提高防御，并获得可吸收伤害的保护层。保护层破裂、被清除或到期后，本次防御提升结束。",
        uses: ["在 burst 到来之前把壳合上，硬吃这一轮", "用一层会被打碎的承伤壳逼对手多花几刀", "残血时缩壳等队友或等冷却"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "bulwark",
        stationary: true,
        defaults: { seal: true, ai: { trigger: 8, panic: 0.5 } },
        fields: [flag("seal", "铁盾")],
        indicator: function (config, pokemon) {
            return { radius: p("shelter", "shell", pokemon), geometry: "area", style: "bulwark", color: 0x9BB0C9,
                label: config && config.seal === false ? "闭关 · 缩壳" : "闭关 · 铁盾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shelter"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("shelter", "tempo", context)),
                recover: Math.round(p("shelter", "aftercast", context)),
                cooldown: Math.round(p("shelter", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shelter:curl", shelterScene, 1, action.origin(),
                JSON.stringify({ moment: "curl", seal: config && config.seal === false ? 0 : 1 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const seal = !(config && config.seal === false);
            const gift = Math.max(1, Math.min(2, Math.round(p("shelter", "gift", action))));
            const window = Math.max(60, Math.round(p("shelter", "window", action)));
            const fraction = Math.max(0.05, Math.min(0.6, p("shelter", "shield", action)));
            const plates = Math.max(6, Math.round(p("shelter", "plates", action)));
            const shellRadius = Math.max(0.7, p("shelter", "shell", action));
            const capacity = Math.max(1, body.maxHealth() * fraction);
            const scale = shellRadius / shelterReferenceRadius;
            const levels = shelterRaise(world, actor, "def", gift);
            MobEffects.apply(world, actor, seal ? shelterSealed : shelterShell, window, levels);
            GuardEffects.apply(world, actor, { rule: shelterRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, plates: plates, scale: scale, initial: capacity } as any, window);
            WorldFeedback.emit(world, shelterScene, 1, body.position(),
                { moment: "brace", actor: String(actor.ref()), levels: levels, capacity: Math.round(capacity * 10) / 10,
                    plates: plates, seal: seal ? 1 : 0, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, levels / 2 + plates / 20)) }, 36);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), shelterBraceText,
                [levels, Math.round(capacity * 10) / 10], 32);
            world.sound("minecraft:block.iron_trapdoor.close", body.position(), 16, "{}");
            world.sound("minecraft:block.anvil.land", body.position(), 14, "{}");
            done(action);
        }
    });

    // 壳被清除或到期：结束同一层的承伤池，收回抬起的等级。
    WorldCombat.on("world_combat:move_shelter/shatter", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data())), id = String(data.id);
        if (id !== shelterShell && id !== shelterSealed) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            const state = JSON.parse(String(guards[i].data()));
            if (state.rule === shelterRule) world.operation(guards[i].id(), "world_combat:dispel", "{}");
        }
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, shelterStage(world, actor, "def")));
        if (loss > 0) NativeEffects.boost(world, actor, "def", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, shelterScene, 1, body.position(), { moment: "shatter", actor: String(actor.ref()) }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), shelterShatterText, [], 24);
        world.sound("minecraft:block.anvil.destroy", body.position(), 14, "{}");
    });
}
