/**
 * 掀榻榻米 / matblock — 执行组织与结算。
 *
 * 核心念头：把整张榻榻米从地上掀起来当盾——一片草绿席面横着翻起、护住自己与身边的伙伴；招式伤害拍在席面上
 *   被整片吃下，席子被砸得发颤、草屑飞起，吃满之后就落下，变化招式照样从席子底下钻过去。
 *
 * 两幕：
 *   沉（windup 播「按地掀席」，提交前只观察与预告，打断不花代价）。
 *   掀（提交后）：施法者与半径内的友方各挂共享身份 world_combat:status/matblock 的真实 MobEffect，
 *     并各自领到一层共享 GuardEffects 的 pool（规则 world_combat:move_matblock）：只吃 kind=move 的敌对伤害，
 *     按总量吃满即落。变化招式不带伤害，根本不进池——这就是它「无法防住变化招式」的机制来源。
 * 持续：每约 8 刻由池的 pulse 续一次席面；目标还带着身份才继续立着。
 * 结束：任一人的池吃满或到时，身份与池一起收；离开施法者太远的人随共享连接断开而失去。
 */
namespace PokemonSkills {
    const matBlockScene = "world_combat:move_matblock";
    const matBlockEffect = "world_combat:mat_block";
    const matBlockRule = "world_combat:move_matblock";
    const matBlockRaiseText = "world_combat.move.matblock.text.raise";
    const matBlockBlockText = "world_combat.move.matblock.text.block";
    const matBlockFallText = "world_combat.move.matblock.text.fall";
    /** 表现里的参考半径：`data.scale = 实际遮蔽半径 / 这个数`。 */
    const matBlockReferenceRadius = 3.4;

    // 席盾的结算点：只吃 kind=move 的敌对伤害，按 pool 吃满；吃满即收掉该人身上的身份。
    GuardEffects.register(matBlockRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref())) return false;
            if (world.friendly(incoming.source)) return false;
            // 只有招式伤害会拍在席面上；环境伤害、状态掉血不属于「招式」，从池边漏过去。
            return !!incoming.data && String(incoming.data.kind) === "move";
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), target = effect.target();
            if (MobEffects.read(world, target, matBlockEffect) === null) { effect.end(); return; }
            const body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            WorldFeedback.keep(world, "matblock:hold:" + String(target.ref()), matBlockScene, 1, body.position(),
                { moment: "hold", target: String(target.ref()), slats: custom.slats, remaining: state.capacity,
                    scale: custom.scale, intensity: matBlockIntensity(state.capacity, custom.initial) }, 20);
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const flexed = state.capacity <= 0 ? 1 : 0;
            const data: any = { moment: "block", target: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                remaining: Math.round(Math.max(0, state.capacity) * 10) / 10, slats: custom.slats, fibers: custom.fibers,
                scale: custom.scale, flexed: flexed,
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.12))) };
            const attacker = incoming.source ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, matBlockScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), matBlockBlockText,
                [data.blocked, data.remaining], 24);
            world.sound("minecraft:block.grass.place", body.position(), 12, "{}");
            if (state.capacity <= 0) MobEffects.consume(world, target, matBlockEffect);
        }
    });

    /** 池的余量换算成画面强度：满席 1、见底趋近 0.15。 */
    function matBlockIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function matBlockScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || matBlockReferenceRadius) / matBlockReferenceRadius));
    }

    /** 给施法者与半径内友方各挂一份席盾（身份 + 只吃招式伤害的按量吸收池）；返回这次席子罩住的人数。 */
    function matBlockCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        capacity: number, slats: number, fibers: number, linkRange: number, scale: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        function protect(actor: CombatActor): boolean {
            if (MobEffects.apply(world, actor, matBlockEffect, ticks, 0) === null) return false;
            GuardEffects.apply(world, actor, { rule: matBlockRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: linkRange, initial: capacity, slats: slats, fibers: fibers, scale: scale } as any, ticks);
            return true;
        }
        let reached = protect(caster) ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other) || world.observe(other) === null) continue;
            if (protect(other)) reached++;
        }
        return reached;
    }

    define({
        id: "matblock",
        cooldownParameter: "wait",
        name: "掀榻榻米",
        description: "把整张榻榻米掀起来当盾，替自己与身边的队友吃下招式伤害；席子吃满就落，变化招式不受影响。",
        uses: ["替全队硬吃一轮成片的伤害招式", "在对手的重击落下前抢一拍掀席", "把一次爆发整片挡在席面外"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 150,
        style: "screen",
        stationary: true,
        defaults: { fold: 1, ai: { trigger: 9, cover: false } },
        fields: [
            field(pathOf("fold"), "掀席方式", "choice", {
                options: [
                    { value: 1, label: "竖席" },
                    { value: 0, label: "横席" }
                ],
                help: "竖席：吃伤总量 ×1.3、时长 ×1.15、半径 ×0.85，代价是起手 +2 刻、冷却 ×1.15，厚实耐砸；横席：半径 ×1.25，吃伤 ×0.8、时长 ×0.85，换来起手 −1 刻、冷却 ×0.85，摊得开、起得快。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("matblock", "radius", pokemon) : 3.4, geometry: "area", style: "screen", color: 0xD9C08A,
                label: config && Number(config.fold) === 1 ? "掀榻榻米 · 竖席" : "掀榻榻米 · 横席" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["matblock"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p("matblock", "tempo", context))),
                recover: Math.round(p("matblock", "aftercast", context)),
                cooldown: Math.round(p("matblock", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_matblock:fold", matBlockScene, 1, action.origin(),
                JSON.stringify({ moment: "fold", fold: config && Number(config.fold) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const capacity = Math.max(30, Math.round(p("matblock", "capacity", action)));
            const window = Math.max(45, Math.round(p("matblock", "window", action)));
            const radius = Math.max(1.6, p("matblock", "radius", action));
            const slats = Math.max(6, Math.round(p("matblock", "slats", action)));
            const fibers = Math.max(12, Math.round(p("matblock", "fibers", action)));
            const linkRange = Math.min(32, radius * 1.6 + 1);
            const scale = matBlockScale(radius);
            const reached = matBlockCover(world, actor, radius, window, capacity, slats, fibers, linkRange, scale);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, matBlockScene, 1, feet,
                { moment: "raise", target: String(actor.ref()), slats: slats, fibers: fibers, radius: radius, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, slats / 12 + 0.4)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), matBlockRaiseText,
                [Math.round(capacity), reached, Math.round(window / 20)], 34);
            world.sound("minecraft:block.grass.place", body.position(), 16, "{}");
            world.sound("minecraft:block.wood.place", body.position(), 12, "{}");
            done(action);
        }
    });

    // 席落：身份到期或被清除时，播一次收束留痕（读操作，任何作用域都能发）。
    WorldCombat.on("world_combat:move_matblock/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== matBlockEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, matBlockScene, 1, body.position(), { moment: "fall", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), matBlockFallText, [], 22);
    });
}
